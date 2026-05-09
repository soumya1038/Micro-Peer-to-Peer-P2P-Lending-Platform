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
        default: null,
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
    transferId: {
        type: String,
        sparse: true,
    },
    connectedAccountId: {
        type: String,
        default: null,
    },
    serviceFeeAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    errorMessage: {
        type: String,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
