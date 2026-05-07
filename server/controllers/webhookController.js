const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');
const FundedLoan = require('../models/FundedLoan');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const metadata = paymentIntent.metadata;

        if (!loanId || !borrowerId || !lenderId || !amount) {
            console.error('Missing required metadata in payment intent:', metadata);
            return res.status(400).json({ message: 'Missing required metadata' });
        }

        const loanId = metadata.loanId;
        const borrowerId = metadata.borrowerId;
        const lenderId = metadata.lenderId;
        const amount = parseFloat(metadata.amount);

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const loan = await LoanRequest.findById(loanId).session(session);
            if (!loan) {
                throw new Error('Loan request not found');
            }

            const remaining = loan.amount - loan.fundedAmount;
            if (amount > remaining) {
                throw new Error("Overfund attempt detected. Payment amount exceeds remaining funding needed.");
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
                status: 'Success'
            }], { session });

            loan.fundedAmount += amount;

            if (loan.fundedAmount === loan.amount) {
                loan.status = 'funded';
            } else {
                loan.status = 'partially_funded';
            }

            await loan.save({ session });
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            console.error('Error processing payment intent:', error);
            return res.status(500).json({ message: error.message });
        } finally {
            session.endSession();
        }
    }

    res.json({ received: true });
};