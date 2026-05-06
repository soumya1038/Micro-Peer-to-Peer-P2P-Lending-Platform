const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { 
    createConnectedAccount, 
    createAccountLink, 
    getAccountStatus 
} = require('../controllers/stripeController');

// Create Stripe Connected Account
router.post('/create-account', authMiddleware, roleMiddleware(['lender']), createConnectedAccount);

// Get onboarding link
router.get('/onboarding-link', authMiddleware, roleMiddleware(['lender']), createAccountLink);

// Get account status
router.get('/account-status', authMiddleware, roleMiddleware(['lender']), getAccountStatus);

module.exports = router;
