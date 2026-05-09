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
    purpose: {
        type: String,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'funded', "partially_funded"],
        default: 'pending',
    },
    fundedAmount: {
        type: Number,
        default: 0,
    },
    outstandingBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalRepaidAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    monthlyInstallmentAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    repaymentStatus: {
        type: String,
        enum: ['not_started', 'active', 'completed', 'defaulted'],
        default: 'not_started',
    },
    repaymentStartDate: {
        type: Date,
        default: null,
    },
    lastRepaymentAt: {
        type: Date,
        default: null,
    },
    fullyRepaidAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

module.exports = mongoose.models.LoanRequest || mongoose.model('LoanRequest', loanSchema);
