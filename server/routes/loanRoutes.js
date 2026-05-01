const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { createLoan, getMarketplace, getMyLoans, getLoanById, fundLoan } = require('../controllers/loanController');

router.post("/create", authMiddleware, roleMiddleware(['borrower']), createLoan);

router.get("/marketplace", authMiddleware, roleMiddleware(['lender']), getMarketplace);

router.get("/my-loans", authMiddleware, roleMiddleware(['borrower']), getMyLoans);

router.get("/:id", authMiddleware, getLoanById);

router.post("/:id/fund", authMiddleware, roleMiddleware(['lender']), fundLoan);

module.exports = router;