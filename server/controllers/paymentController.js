const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');
const User = require('../models/User');

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
