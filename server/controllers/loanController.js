const LoanRequest = require('../models/LoanRequest');

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
        status: { $in: ['pending', 'partially_funded'] }
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
