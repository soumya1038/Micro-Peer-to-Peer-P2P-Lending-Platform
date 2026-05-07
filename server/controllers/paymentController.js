const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount } = req.body;
        const loanId = req.params.id;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const loan = await LoanRequest.findById(loanId);
        if (!loan) {
            return res.status(404).json({ message: 'Loan request not found' });
        }

        if (loan.status === 'funded') {
            return res.status(400).json({ message: 'Loan request is already funded' });
        }

        if (loan.borrowerId.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot fund their own loan requests' });
        } 

        const remaining = loan.amount - loan.fundedAmount;
        if (amount > remaining) {
            return res.status(400).json({ message: `Amount exceeds remaining funding needed ($${remaining})` });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'inr',
            metadata: {
                loanId: loan._id.toString(),
                borrowerId: loan.borrowerId.toString(),
                lenderId: req.user.id,
                amount: amount.toString(),
            },
        });
        res.status(201).json({ clientSecret: paymentIntent.client_secret });

    } catch (error) {
        console.error('Create payment intent error:', error);
        res.status(500).json({ message: error.message });
    }
};