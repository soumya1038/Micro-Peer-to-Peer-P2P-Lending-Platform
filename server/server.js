const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { startRepaymentCron } = require('./jobs/repaymentCron');

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use('/api/webhook', require('./routes/webhookRoutes'));
app.use(express.json());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/stripe', require('./routes/stripeRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/repayments', require('./routes/repaymentRoutes'));

app.get('/', (req, res) => {
    res.send('Welcome to the P2P Lending Platform API');
});

const PORT = process.env.PORT || 5000;
startRepaymentCron();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
