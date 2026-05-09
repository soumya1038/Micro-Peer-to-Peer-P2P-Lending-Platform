const stripe = require('../config/stripe');
const LoanRequest = require('../models/LoanRequest');
const FundedLoan = require('../models/FundedLoan');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const RepaymentSchedule = require('../models/RepaymentSchedule');
const mongoose = require('mongoose');
const {
    toPaise,
    fromPaise,
    getServiceFeeRate,
    generateRepaymentScheduleForLoan,
} = require('../services/repaymentService');

function parseMetadataAmount(amount) {
    const parsed = Number(amount);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeOutstanding(loan) {
    if (Number.isFinite(loan.outstandingBalance) && loan.outstandingBalance > 0) {
        return Number(loan.outstandingBalance.toFixed(2));
    }
    const fallback = Number(loan.amount || 0) - Number(loan.totalRepaidAmount || 0);
    return Number(Math.max(fallback, 0).toFixed(2));
}

async function processFundingPaymentIntent(paymentIntent) {
    const metadata = paymentIntent.metadata || {};
    const loanId = metadata.loanId;
    const borrowerId = metadata.borrowerId;
    const lenderId = metadata.lenderId;
    const amount = parseMetadataAmount(metadata.amount);

    if (!loanId || !borrowerId || !lenderId || !amount) {
        throw new Error('Missing or invalid metadata for funding payment');
    }

    const alreadyProcessed = await Transaction.findOne({ paymentIntentId: paymentIntent.id });
    if (alreadyProcessed) {
        return { duplicate: true, type: 'loan_funding' };
    }

    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        const loan = await LoanRequest.findById(loanId).session(session);
        if (!loan) {
            throw new Error('Loan request not found');
        }

        if (!['pending', 'partially_funded'].includes(loan.status)) {
            throw new Error(`Loan cannot be funded in current state: ${loan.status}`);
        }

        if (loan.borrower.toString() !== borrowerId) {
            throw new Error('Borrower metadata mismatch');
        }

        if (borrowerId === lenderId) {
            throw new Error('Self-funding attempt detected');
        }

        const remaining = loan.amount - loan.fundedAmount;
        if (amount > remaining) {
            throw new Error('Overfund attempt detected. Payment amount exceeds remaining funding needed.');
        }

        await FundedLoan.create([{
            loanId,
            lenderId,
            amount,
        }], { session });

        await Transaction.create([{
            type: 'funding',
            loanId,
            lenderId,
            borrowerId,
            amount,
            status: 'success',
            paymentIntentId: paymentIntent.id,
        }], { session });

        loan.fundedAmount += amount;
        loan.status = loan.fundedAmount >= loan.amount ? 'funded' : 'partially_funded';
        await loan.save({ session });

        if (loan.status === 'funded') {
            await generateRepaymentScheduleForLoan(loan, session);
        }

        await session.commitTransaction();
        return { processed: true, type: 'loan_funding' };
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }
}

async function processRepaymentPaymentIntent(paymentIntent) {
    const metadata = paymentIntent.metadata || {};
    const loanId = metadata.loanId;
    const borrowerId = metadata.borrowerId;
    const amount = parseMetadataAmount(metadata.amount);

    if (!loanId || !borrowerId || !amount) {
        throw new Error('Missing or invalid metadata for repayment payment');
    }

    const alreadyProcessed = await Transaction.findOne({ paymentIntentId: paymentIntent.id });
    if (alreadyProcessed) {
        return { duplicate: true, type: 'loan_repayment' };
    }

    const session = await mongoose.startSession();
    let payoutPlan = [];
    let serviceFeeAmount = 0;

    try {
        session.startTransaction();

        const loan = await LoanRequest.findById(loanId).session(session);
        if (!loan) {
            throw new Error('Loan request not found');
        }

        if (loan.status !== 'funded') {
            throw new Error('Repayment is only allowed for fully funded loans');
        }

        if (loan.borrower.toString() !== borrowerId) {
            throw new Error('Borrower metadata mismatch');
        }

        const fundedLoans = await FundedLoan.find({ loanId }).session(session);
        if (fundedLoans.length === 0) {
            throw new Error('No lender funding records found for this loan');
        }

        if (loan.repaymentStatus === 'not_started') {
            await generateRepaymentScheduleForLoan(loan, session);
        }

        let schedules = await RepaymentSchedule.find({
            loanId,
            status: { $in: ['pending', 'due', 'overdue', 'partially_paid'] },
            dueAmount: { $gt: 0 },
        })
            .sort({ dueDate: 1, installmentNumber: 1 })
            .session(session);

        if (schedules.length === 0) {
            await generateRepaymentScheduleForLoan(loan, session);
            schedules = await RepaymentSchedule.find({
                loanId,
                status: { $in: ['pending', 'due', 'overdue', 'partially_paid'] },
                dueAmount: { $gt: 0 },
            })
                .sort({ dueDate: 1, installmentNumber: 1 })
                .session(session);
        }

        if (schedules.length === 0) {
            throw new Error('No active repayment schedule entries found');
        }

        const outstanding = normalizeOutstanding(loan);
        const outstandingPaise = toPaise(outstanding);
        const repaymentPaise = toPaise(amount);

        if (repaymentPaise > outstandingPaise) {
            throw new Error(`Repayment amount exceeds outstanding balance (INR ${outstanding})`);
        }

        const serviceFeeRate = getServiceFeeRate();
        let serviceFeePaise = Math.round(repaymentPaise * serviceFeeRate);
        if (serviceFeePaise >= repaymentPaise && repaymentPaise > 0) {
            serviceFeePaise = repaymentPaise - 1;
        }
        if (serviceFeePaise < 0) {
            serviceFeePaise = 0;
        }
        const distributablePaise = repaymentPaise - serviceFeePaise;

        let remainingRepayment = repaymentPaise;
        for (const schedule of schedules) {
            if (remainingRepayment <= 0) {
                break;
            }

            const duePaise = toPaise(schedule.dueAmount);
            if (duePaise <= 0) {
                continue;
            }

            const paidThisInstallment = Math.min(duePaise, remainingRepayment);
            const newDuePaise = duePaise - paidThisInstallment;
            const newPaidPaise = toPaise(schedule.paidAmount) + paidThisInstallment;

            schedule.dueAmount = fromPaise(newDuePaise);
            schedule.paidAmount = fromPaise(newPaidPaise);
            schedule.lastPaymentAt = new Date();

            if (newDuePaise === 0) {
                schedule.status = 'paid';
                schedule.paidAt = new Date();
            } else {
                schedule.status = 'partially_paid';
            }

            await schedule.save({ session });
            remainingRepayment -= paidThisInstallment;
        }

        if (remainingRepayment > 0) {
            throw new Error('Repayment allocation failed. Remaining amount could not be mapped to schedule.');
        }

        loan.totalRepaidAmount = Number((Number(loan.totalRepaidAmount || 0) + amount).toFixed(2));
        const newOutstandingPaise = Math.max(outstandingPaise - repaymentPaise, 0);
        loan.outstandingBalance = fromPaise(newOutstandingPaise);
        loan.lastRepaymentAt = new Date();
        loan.repaymentStatus = newOutstandingPaise === 0 ? 'completed' : 'active';
        loan.fullyRepaidAt = newOutstandingPaise === 0 ? new Date() : null;
        await loan.save({ session });

        const totalFundedPaise = fundedLoans.reduce((sum, item) => sum + toPaise(item.amount), 0);
        if (totalFundedPaise <= 0) {
            throw new Error('Invalid funded amount distribution for this loan');
        }

        const lenderUsers = await User.find({
            _id: { $in: fundedLoans.map((item) => item.lenderId) }
        }).session(session);
        const lenderById = new Map(lenderUsers.map((user) => [user._id.toString(), user]));

        let remainingDistributable = distributablePaise;
        payoutPlan = fundedLoans.map((funding, index) => {
            let payoutPaise;
            if (index === fundedLoans.length - 1) {
                payoutPaise = remainingDistributable;
            } else {
                payoutPaise = Math.floor((distributablePaise * toPaise(funding.amount)) / totalFundedPaise);
                remainingDistributable -= payoutPaise;
            }

            const lenderUser = lenderById.get(funding.lenderId.toString());
            return {
                lenderId: funding.lenderId.toString(),
                connectedAccountId: lenderUser?.stripeAccountId || null,
                amountPaise: payoutPaise,
            };
        });

        serviceFeeAmount = fromPaise(serviceFeePaise);

        await Transaction.create([{
            type: 'repayment',
            loanId,
            borrowerId,
            amount,
            serviceFeeAmount,
            status: 'success',
            paymentIntentId: paymentIntent.id,
        }], { session });

        await session.commitTransaction();
    } catch (error) {
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        throw error;
    } finally {
        session.endSession();
    }

    // Payouts happen outside Mongo transaction because Stripe API calls cannot be rolled back.
    for (const payout of payoutPlan) {
        if (payout.amountPaise <= 0) {
            continue;
        }

        if (!payout.connectedAccountId) {
            await Transaction.create({
                type: 'payout',
                loanId,
                lenderId: payout.lenderId,
                amount: fromPaise(payout.amountPaise),
                connectedAccountId: null,
                status: 'failed',
                errorMessage: 'Lender has no connected Stripe account for payout',
            });
            continue;
        }

        try {
            const transfer = await stripe.transfers.create({
                amount: payout.amountPaise,
                currency: 'inr',
                destination: payout.connectedAccountId,
                description: `Loan repayment payout for loan ${loanId}`,
                metadata: {
                    loanId,
                    lenderId: payout.lenderId,
                    borrowerId,
                    paymentIntentId: paymentIntent.id,
                    type: 'loan_repayment_payout',
                },
            });

            await Transaction.create({
                type: 'payout',
                loanId,
                lenderId: payout.lenderId,
                borrowerId,
                amount: fromPaise(payout.amountPaise),
                connectedAccountId: payout.connectedAccountId,
                transferId: transfer.id,
                status: 'success',
            });
        } catch (error) {
            await Transaction.create({
                type: 'payout',
                loanId,
                lenderId: payout.lenderId,
                borrowerId,
                amount: fromPaise(payout.amountPaise),
                connectedAccountId: payout.connectedAccountId,
                status: 'failed',
                errorMessage: error.message,
            });
        }
    }

    return {
        processed: true,
        type: 'loan_repayment',
        serviceFeeAmount,
    };
}

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();

    if (!endpointSecret || !endpointSecret.startsWith('whsec_')) {
        console.error('Stripe webhook secret is misconfigured. STRIPE_WEBHOOK_SECRET must start with "whsec_".');
        return res.status(500).json({ message: 'Webhook secret misconfigured on server' });
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (error) {
        console.error('Webhook signature verification failed:', error.message);
        return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    if (event.type !== 'payment_intent.succeeded') {
        return res.json({ received: true });
    }

    const paymentIntent = event.data.object;
    const metadataType = paymentIntent.metadata?.type;

    try {
        if (metadataType === 'loan_funding') {
            const result = await processFundingPaymentIntent(paymentIntent);
            return res.json({ received: true, result });
        }

        if (metadataType === 'loan_repayment') {
            const result = await processRepaymentPaymentIntent(paymentIntent);
            return res.json({ received: true, result });
        }

        return res.json({ received: true, ignored: true });
    } catch (error) {
        console.error('Error processing Stripe webhook event:', {
            eventType: event.type,
            metadataType,
            paymentIntentId: paymentIntent.id,
            message: error.message,
        });
        return res.status(500).json({ message: error.message });
    }
};

exports.processFundingPaymentIntent = processFundingPaymentIntent;
