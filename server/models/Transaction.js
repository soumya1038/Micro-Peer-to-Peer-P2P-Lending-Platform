const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['funding', 'repayment', 'payout', 'service_fee'],
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'success',
    },
    paymentIntentId: {
        type: String,
        unique: true,
        sparse: true,
    },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
