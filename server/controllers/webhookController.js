const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');
const FundedLoan = require('../models/FundedLoan');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type !== 'payment_intent.succeeded') {
        return res.json({ received: true });
    }

    const paymentIntent = event.data.object;
    const metadata = paymentIntent.metadata || {};

    const loanId = metadata.loanId;
    const borrowerId = metadata.borrowerId;
    const lenderId = metadata.lenderId;
    const amount = Number(metadata.amount);

    if (!loanId || !borrowerId || !lenderId || !Number.isFinite(amount) || amount <= 0) {
        console.error('Missing required metadata in payment intent:', metadata);
        return res.status(400).json({ message: 'Missing or invalid required metadata' });
    }

    const alreadyProcessed = await Transaction.findOne({
        paymentIntentId: paymentIntent.id,
        type: 'funding'
    });
    if (alreadyProcessed) {
        return res.json({ received: true, duplicate: true });
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const loan = await LoanRequest.findById(loanId).session(session);
        if (!loan) {
            throw new Error('Loan request not found');
        }

        if (!['pending', 'partially_funded'].includes(loan.status)) {
            throw new Error(`Loan cannot be funded in current state: ${loan.status}`);
        }

        if (loan.borrower.toString() !== borrowerId) {
            throw new Error('Borrower metadata mismatch');
        }

        if (borrowerId === lenderId) {
            throw new Error('Self-funding attempt detected');
        }

        const remaining = loan.amount - loan.fundedAmount;
        if (amount > remaining) {
            throw new Error('Overfund attempt detected. Payment amount exceeds remaining funding needed.');
        }

        await FundedLoan.create([{
            loanId,
            lenderId,
            amount
        }], { session });

        await Transaction.create([{
            type: 'funding',
            loanId,
            lenderId,
            borrowerId,
            amount,
            status: 'success',
            paymentIntentId: paymentIntent.id
        }], { session });

        loan.fundedAmount += amount;
        loan.status = loan.fundedAmount >= loan.amount ? 'funded' : 'partially_funded';

        await loan.save({ session });
        await session.commitTransaction();
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error('Error processing payment intent:', error);
        return res.status(500).json({ message: error.message });
    } finally {
        session.endSession();
    }

    res.json({ received: true });
};
