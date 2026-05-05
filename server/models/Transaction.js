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
    amount: {
        type: Number,
        required: true,
    },
    type: {
        type: String,
        enum: ['funding'],
        required: true,
    },
    status: {
        type: String,
        enum: ['success', 'failed'],
        default: 'success',
    },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);