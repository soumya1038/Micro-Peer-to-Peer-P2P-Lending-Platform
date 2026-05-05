const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const stripe = require("../config/stripe");

exports.register = async (req, res) => {
    const { name, email, password, role } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    if (role === 'lender' || role === 'borrower') {
        const user = await User.create({ name, email, password: hashed, role });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ message: 'User registered successfully', token, role: user.role });
    } else {
        res.status(403).json({ message: 'Invalid role' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ message: 'Login successful', token, role: user.role });
};

// exports.createStripeAccount = async (req, res) => {
//     const account = await stripe.account.create({
//         type: "express"
//     });
//     res.json({accountId: account.id});
// };

exports.createStripeAccount = async (req, res) => {
    try {
        const account = await stripe.accounts.create({
            type: "express",
        });
        res.json({ accountId: account.id });
    } catch (error) {
        res.status(500).json({ message: 'Error creating Stripe account' });
    }
};

exports.generateOnboardingLink = async (req, res) => {
    const { accountId } = req.body;
    try {
        const link = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.FRONTEND_URL}/onboarding/refresh`,
            return_url: `${process.env.FRONTEND_URL}/onboarding/return`,
            type: 'account_onboarding',
        });
        res.json({ url: link.url });
        await User.findByIdAndUpdate(req.user.id, { stripeAccountId: accountId });
    } catch (error) {
        res.status(500).json({ message: 'Error generating onboarding link' });
    }
};