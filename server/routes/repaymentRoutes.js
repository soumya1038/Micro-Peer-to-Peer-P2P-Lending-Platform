const express = require('express');
const router = express.Router();

const auth = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');
const {
    createRepaymentPaymentIntent,
    getLoanRepaymentDetails,
    getBorrowerDueSummary,
} = require('../controllers/repaymentController');

router.post('/:id/create-payment-intent', auth, role(['borrower']), createRepaymentPaymentIntent);
router.get('/loan/:id', auth, getLoanRepaymentDetails);
router.get('/borrower/summary', auth, role(['borrower']), getBorrowerDueSummary);

module.exports = router;
