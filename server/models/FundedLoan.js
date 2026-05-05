const mongoose = require('mongoose');

const fundedLoanSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoanRequest',
        required: true,
    },
    lenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
}, { timestamps: true }
);

const paymentIntent = await stripe.paymentIntents.create({
    amount: loan.amount * 100, // Convert to cents
    currency: 'inr',
    automatic_payment_methods: {
        enabled: true,
    },
    metadata: {
        loanId: loan._id.toString(),
        lenderId: lender._id.toString(),
    },
});

module.exports = mongoose.model('FundedLoan', fundedLoanSchema);