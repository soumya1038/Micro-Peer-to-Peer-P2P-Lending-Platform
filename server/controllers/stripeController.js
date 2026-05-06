const stripe = require('../config/stripe');
const User = require('../models/User');

exports.createConnectedAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if user already has a Stripe account
        if (user.stripeAccountId) {
            return res.json({ 
                message: 'Stripe account already exists', 
                accountId: user.stripeAccountId 
            });
        }

        // Create Stripe Connected Account
        const account = await stripe.accounts.create({
            type: 'express',
            country: 'US',
            email: user.email,
            capabilities: {
                transfers: { requested: true },
            },
        });

        // Save Stripe account ID to user
        user.stripeAccountId = account.id;
        await user.save();

        res.json({ 
            message: 'Stripe account created successfully', 
            accountId: account.id 
        });
    } catch (error) {
        console.error('Create Stripe account error:', error);
        res.status(500).json({ 
            message: 'Error creating Stripe account', 
            error: error.message 
        });
    }
};

exports.createAccountLink = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user || !user.stripeAccountId) {
            return res.status(404).json({ 
                message: 'Stripe account not found. Please create an account first.' 
            });
        }

        // Create account link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: user.stripeAccountId,
            refresh_url: `${process.env.CLIENT_URL}/lender`,
            return_url: `${process.env.CLIENT_URL}/lender`,
            type: 'account_onboarding',
        });

        res.json({ 
            url: accountLink.url 
        });
    } catch (error) {
        console.error('Create account link error:', error);
        res.status(500).json({ 
            message: 'Error creating account link', 
            error: error.message 
        });
    }
};

exports.getAccountStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user || !user.stripeAccountId) {
            return res.json({ 
                connected: false,
                message: 'No Stripe account connected' 
            });
        }

        // Retrieve account details from Stripe
        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        res.json({
            connected: true,
            accountId: account.id,
            detailsSubmitted: account.details_submitted,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
        });
    } catch (error) {
        console.error('Get account status error:', error);
        res.status(500).json({ 
            message: 'Error retrieving account status', 
            error: error.message 
        });
    }
};
