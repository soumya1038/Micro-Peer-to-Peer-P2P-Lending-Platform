const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');
const RepaymentSchedule = require('../models/RepaymentSchedule');
const FundedLoan = require('../models/FundedLoan');
const { getServiceFeeRate } = require('../services/repaymentService');

function normalizeOutstanding(loan) {
    if (Number.isFinite(loan.outstandingBalance) && loan.outstandingBalance > 0) {
        return Number(loan.outstandingBalance.toFixed(2));
    }
    const fallback = Number(loan.amount || 0) - Number(loan.totalRepaidAmount || 0);
    return Number(Math.max(fallback, 0).toFixed(2));
}

exports.createRepaymentPaymentIntent = async (req, res) => {
    try {
        const loanId = req.params.id;
        const amount = Number(req.body.amount);

        if (!Number.isFinite(amount) || amount <= 0) {
            return res.status(400).json({ message: 'Invalid repayment amount' });
        }

        const loan = await LoanRequest.findById(loanId);
        if (!loan) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        if (loan.borrower.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only repay your own loan' });
        }

        if (loan.status !== 'funded') {
            return res.status(400).json({ message: 'Loan is not fully funded yet' });
        }

        if (loan.repaymentStatus === 'completed') {
            return res.status(400).json({ message: 'Loan is already fully repaid' });
        }

        const outstanding = normalizeOutstanding(loan);
        if (outstanding <= 0) {
            return res.status(400).json({ message: 'No outstanding repayment amount for this loan' });
        }

        if (amount > outstanding) {
            return res.status(400).json({
                message: `Repayment amount cannot exceed outstanding balance (INR ${outstanding})`
            });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'inr',
            metadata: {
                type: 'loan_repayment',
                loanId: loan._id.toString(),
                borrowerId: req.user.id,
                amount: amount.toString(),
            },
        });

        return res.status(201).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            outstandingBalance: outstanding,
            serviceFeeRate: getServiceFeeRate(),
        });
    } catch (error) {
        console.error('Create repayment payment intent error:', error);
        return res.status(500).json({ message: error.message });
    }
};

exports.getLoanRepaymentDetails = async (req, res) => {
    try {
        const loanId = req.params.id;
        const loan = await LoanRequest.findById(loanId).populate('borrower', 'name email');
        if (!loan) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        const isBorrower = loan.borrower._id.toString() === req.user.id;
        if (!isBorrower && req.user.role === 'lender') {
            const invested = await FundedLoan.findOne({ loanId, lenderId: req.user.id });
            if (!invested) {
                return res.status(403).json({ message: 'You are not allowed to view this loan schedule' });
            }
        } else if (!isBorrower && req.user.role !== 'lender') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const schedules = await RepaymentSchedule.find({ loanId }).sort({ installmentNumber: 1 });
        const dueNow = schedules
            .filter((item) => ['due', 'overdue', 'partially_paid'].includes(item.status))
            .reduce((sum, item) => sum + Number(item.dueAmount || 0), 0);

        const outstanding = normalizeOutstanding(loan);
        const paid = Number((Number(loan.totalRepaidAmount || 0)).toFixed(2));

        return res.json({
            loan,
            schedules,
            summary: {
                outstandingBalance: outstanding,
                totalRepaidAmount: paid,
                dueNow: Number(dueNow.toFixed(2)),
                serviceFeeRate: getServiceFeeRate(),
            },
        });
    } catch (error) {
        console.error('Get loan repayment details error:', error);
        return res.status(500).json({ message: error.message });
    }
};

exports.getBorrowerDueSummary = async (req, res) => {
    try {
        const activeLoans = await LoanRequest.find({
            borrower: req.user.id,
            status: 'funded',
            repaymentStatus: { $in: ['active', 'defaulted'] }
        }).select('_id amount outstandingBalance totalRepaidAmount monthlyInstallmentAmount repaymentStatus');

        const loanIds = activeLoans.map((loan) => loan._id);
        const schedules = loanIds.length > 0
            ? await RepaymentSchedule.find({
                loanId: { $in: loanIds },
                status: { $in: ['due', 'overdue', 'partially_paid'] }
            }).select('loanId dueAmount status dueDate installmentNumber')
            : [];

        const dueByLoan = new Map();
        for (const schedule of schedules) {
            const key = schedule.loanId.toString();
            const existing = dueByLoan.get(key) || { dueNow: 0, items: [] };
            existing.dueNow += Number(schedule.dueAmount || 0);
            existing.items.push(schedule);
            dueByLoan.set(key, existing);
        }

        const items = activeLoans.map((loan) => {
            const dueData = dueByLoan.get(loan._id.toString()) || { dueNow: 0, items: [] };
            return {
                loanId: loan._id,
                outstandingBalance: normalizeOutstanding(loan),
                totalRepaidAmount: Number((loan.totalRepaidAmount || 0).toFixed(2)),
                monthlyInstallmentAmount: Number((loan.monthlyInstallmentAmount || 0).toFixed(2)),
                dueNow: Number(dueData.dueNow.toFixed(2)),
                dueItems: dueData.items,
            };
        });

        const totals = items.reduce((acc, item) => {
            acc.outstanding += item.outstandingBalance;
            acc.dueNow += item.dueNow;
            return acc;
        }, { outstanding: 0, dueNow: 0 });

        return res.json({
            items,
            totals: {
                outstanding: Number(totals.outstanding.toFixed(2)),
                dueNow: Number(totals.dueNow.toFixed(2)),
            },
        });
    } catch (error) {
        console.error('Get borrower due summary error:', error);
        return res.status(500).json({ message: error.message });
    }
};
