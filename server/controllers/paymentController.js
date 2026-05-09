const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');
const { processFundingPaymentIntent } = require('./webhookController');

exports.createPaymentIntent = async (req, res) => {
    try {
        const loanId = req.params.id;
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (amount < 100) {
            return res.status(400).json({ message: 'Funding amount must be at least INR 100' });
        }

        const [loan, lender] = await Promise.all([
            LoanRequest.findById(loanId),
            User.findById(req.user.id)
        ]);

        if (!loan) {
            return res.status(404).json({ message: 'Loan request not found' });
        }

        if (!lender) {
            return res.status(404).json({ message: 'Lender account not found' });
        }

        if (!lender.stripeAccountId) {
            return res.status(400).json({ message: 'Please complete Stripe account setup before funding loans' });
        }

        if (!['pending', 'partially_funded'].includes(loan.status)) {
            return res.status(400).json({ message: `Loan cannot be funded in current state: ${loan.status}` });
        }

        if (loan.borrower.toString() === req.user.id) {
            return res.status(400).json({ message: 'You cannot fund your own loan request' });
        } 

        const remaining = loan.amount - loan.fundedAmount;
        if (amount > remaining) {
            return res.status(400).json({ message: `Amount exceeds remaining funding needed (INR ${remaining})` });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'inr',
            metadata: {
                type: 'loan_funding',
                loanId: loan._id.toString(),
                borrowerId: loan.borrower.toString(),
                lenderId: req.user.id,
                amount: amount.toString(),
            },
        });
        res.status(201).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.confirmFundingPayment = async (req, res) => {
    try {
        const loanId = req.params.id;
        const paymentIntentId = String(req.body.paymentIntentId || '').trim();

        if (!paymentIntentId) {
            return res.status(400).json({ message: 'paymentIntentId is required' });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (!paymentIntent) {
            return res.status(404).json({ message: 'PaymentIntent not found on Stripe' });
        }

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ message: `PaymentIntent is not succeeded. Current status: ${paymentIntent.status}` });
        }

        const metadata = paymentIntent.metadata || {};
        if (metadata.type !== 'loan_funding') {
            return res.status(400).json({ message: 'This PaymentIntent is not a loan funding payment' });
        }

        if (metadata.loanId !== loanId) {
            return res.status(400).json({ message: 'PaymentIntent loanId does not match request loan id' });
        }

        if (metadata.lenderId !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to confirm this funding payment' });
        }

        const result = await processFundingPaymentIntent(paymentIntent);
        const loan = await LoanRequest.findById(loanId).select('amount fundedAmount status');

        return res.json({
            message: result?.duplicate ? 'Funding already synced' : 'Funding synced successfully',
            result,
            loan,
        });
    } catch (error) {
        console.error('Confirm funding payment error:', error);
        return res.status(500).json({ message: error.message });
    }
};
