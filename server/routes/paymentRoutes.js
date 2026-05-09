const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

const { createPaymentIntent, confirmFundingPayment } = require('../controllers/paymentController');

router.post('/:id/create-payment-intent', auth, role(['lender']), createPaymentIntent);
router.post('/:id/confirm-funding', auth, role(['lender']), confirmFundingPayment);

module.exports = router;
