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
}, { timestamps: true });

module.exports = mongoose.model('FundedLoan', fundedLoanSchema);