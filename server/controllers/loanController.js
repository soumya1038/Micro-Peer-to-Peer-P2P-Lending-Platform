const LoanRequest = require('../models/loanRequest');
const Transaction = require('../models/Transaction');
const FundedLoan = require('../models/FundedLoan');
const mongoose = require('mongoose');

exports.createLoan = async (req, res) => {
    const { amount, tenureMonths, purpose } = req.body;

    const isborrower = req.user.role === 'borrower';
    if (!isborrower) {
        return res.status(403).json({ message: 'Only borrowers can create loan requests' });
    }

    const validAmount = amount > 0;
    if (!validAmount) {
        return res.status(400).json({ message: 'Invalid amount' });
    }
    const validTerm = tenureMonths > 0 && tenureMonths <= 36;
    if (!validTerm) {
        return res.status(400).json({ message: 'Invalid tenure' });
    }

    const loan = await LoanRequest.create({
        ...req.body, borrower: req.user.id
    });

    res.status(201).json({ message: 'Loan request created', loan });
};

exports.getMarketplace = async (req, res) => {
    const loans = await LoanRequest.find({ 
        state: { $in: ['pending', 'partially_funded'] } 
    }).populate('borrower', 'name');
    res.json({ loans });
};

exports.getMyLoans = async (req, res) => {
    const loans = await LoanRequest.find({ borrower: req.user.id });
    res.json({ loans });
};

exports.getLoanById = async (req, res) => {
    const loan = await LoanRequest.findById(req.params.id).populate('borrower', 'name');
    if (!loan) {
        return res.status(404).json({ message: 'Loan request not found' });
    }
    res.json({ loan });
};

exports.fundLoan = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Invalid funding amount' });
        }

        const loan = await LoanRequest.findById(req.params.id).session(session);

        if (!loan) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Loan request not found' });
        }

        const remainingAmount = loan.amount - loan.fundedAmount;

        if (amount > remainingAmount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: `Funding amount exceeds remaining loan amount. Remaining: ${remainingAmount}` });
        }

        if (loan.state === 'funded') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Loan is already fully funded' });
        }

        if (loan.borrower.toString() === req.user.id) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'You cannot fund your own loan' });
        }

        if (amount < 100) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Funding amount must be at least ₹100' });
        }

        await FundedLoan.create([{
            loanId: loan._id,
            lenderId: req.user.id,
            amount
        }], { session });

        await Transaction.create([{
            loanId: loan._id,
            lenderId: req.user.id,
            amount,
            type: 'funding'
        }], { session });

        loan.fundedAmount += amount;
        if (loan.fundedAmount === loan.amount) {
            loan.state = 'funded';
        } else {
            loan.state = 'partially_funded';
        }

        await loan.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Loan funded successfully', loan });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: 'Error funding loan', error: error.message });
    }
};