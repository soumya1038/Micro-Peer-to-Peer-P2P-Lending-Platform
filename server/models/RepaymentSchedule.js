const mongoose = require('mongoose');

const repaymentScheduleSchema = new mongoose.Schema({
    loanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LoanRequest',
        required: true,
    },
    borrowerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    installmentNumber: {
        type: Number,
        required: true,
        min: 1,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    scheduledAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    dueAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    status: {
        type: String,
        enum: ['pending', 'due', 'partially_paid', 'paid', 'overdue'],
        default: 'pending',
    },
    paidAt: {
        type: Date,
        default: null,
    },
    lastPaymentAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

repaymentScheduleSchema.index({ loanId: 1, installmentNumber: 1 }, { unique: true });
repaymentScheduleSchema.index({ loanId: 1, status: 1 });
repaymentScheduleSchema.index({ borrowerId: 1, dueDate: 1 });

module.exports = mongoose.model('RepaymentSchedule', repaymentScheduleSchema);
