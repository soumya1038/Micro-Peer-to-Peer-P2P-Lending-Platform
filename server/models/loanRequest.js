const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
    borrower: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    tenureMonths: {
        type: Number,
        required: true,
    },
    state: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    fundedAmount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model('LoanRequest', loanSchema);