const LoanRequest = require('../models/LoanRequest');
const RepaymentSchedule = require('../models/RepaymentSchedule');

const MAX_SERVICE_FEE_RATE = 0.2;

function toPaise(amount) {
    return Math.round(Number(amount || 0) * 100);
}

function fromPaise(amount) {
    return Number((amount / 100).toFixed(2));
}

function addMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}

function getServiceFeeRate() {
    const configured = Number(process.env.PLATFORM_SERVICE_FEE_RATE || 0.02);
    if (!Number.isFinite(configured) || configured < 0) {
        return 0.02;
    }
    return Math.min(configured, MAX_SERVICE_FEE_RATE);
}

async function generateRepaymentScheduleForLoan(loan, session) {
    const existingCount = await RepaymentSchedule.countDocuments({ loanId: loan._id }).session(session);
    if (existingCount > 0) {
        return { created: false, count: existingCount };
    }

    const tenureMonths = Math.max(1, Number(loan.tenureMonths || 1));
    const totalPrincipalPaise = toPaise(loan.amount);
    const baseInstallmentPaise = Math.floor(totalPrincipalPaise / tenureMonths);
    let remainingPaise = totalPrincipalPaise;

    const firstDueDate = addMonths(new Date(), 1);
    firstDueDate.setHours(0, 0, 0, 0);

    const schedules = [];
    for (let month = 1; month <= tenureMonths; month += 1) {
        const installmentPaise = month === tenureMonths ? remainingPaise : baseInstallmentPaise;
        remainingPaise -= installmentPaise;

        const dueDate = addMonths(firstDueDate, month - 1);
        schedules.push({
            loanId: loan._id,
            borrowerId: loan.borrower,
            installmentNumber: month,
            dueDate,
            scheduledAmount: fromPaise(installmentPaise),
            dueAmount: fromPaise(installmentPaise),
            paidAmount: 0,
            status: 'pending',
        });
    }

    await RepaymentSchedule.insertMany(schedules, { session });

    loan.outstandingBalance = fromPaise(totalPrincipalPaise);
    loan.totalRepaidAmount = 0;
    loan.monthlyInstallmentAmount = fromPaise(baseInstallmentPaise);
    loan.repaymentStatus = 'active';
    loan.repaymentStartDate = firstDueDate;
    loan.lastRepaymentAt = null;
    loan.fullyRepaidAt = null;
    await loan.save({ session });

    return { created: true, count: schedules.length };
}

async function refreshDueStatuses() {
    const now = new Date();

    await RepaymentSchedule.updateMany(
        { status: { $in: ['pending', 'partially_paid'] }, dueDate: { $lte: now } },
        [{ $set: { status: { $cond: [{ $gt: ['$dueAmount', 0] }, 'due', '$status'] } } }]
    );

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await RepaymentSchedule.updateMany(
        { status: 'due', dueDate: { $lt: sevenDaysAgo }, dueAmount: { $gt: 0 } },
        { $set: { status: 'overdue' } }
    );

    const affectedLoans = await RepaymentSchedule.distinct('loanId', {
        status: { $in: ['due', 'overdue', 'partially_paid', 'pending'] }
    });

    if (affectedLoans.length === 0) {
        return { updatedLoanCount: 0 };
    }

    for (const loanId of affectedLoans) {
        const totals = await RepaymentSchedule.aggregate([
            { $match: { loanId } },
            {
                $group: {
                    _id: '$loanId',
                    dueAmount: { $sum: '$dueAmount' },
                    paidAmount: { $sum: '$paidAmount' }
                }
            }
        ]);

        if (totals.length === 0) {
            continue;
        }

        const total = totals[0];
        const outstanding = Number(total.dueAmount || 0);
        const repaid = Number(total.paidAmount || 0);

        const update = {
            outstandingBalance: Number(outstanding.toFixed(2)),
            totalRepaidAmount: Number(repaid.toFixed(2)),
            repaymentStatus: outstanding <= 0 ? 'completed' : 'active',
            fullyRepaidAt: outstanding <= 0 ? new Date() : null,
        };

        await LoanRequest.updateOne({ _id: loanId }, { $set: update });
    }

    return { updatedLoanCount: affectedLoans.length };
}

module.exports = {
    toPaise,
    fromPaise,
    getServiceFeeRate,
    generateRepaymentScheduleForLoan,
    refreshDueStatuses,
};
