const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

const { createPaymentIntent } = require('../controllers/paymentController');

router.post('/:id/create-payment-intent', auth, role('lender'), createPaymentIntent);

module.exports = router;