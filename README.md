# Micro Peer-to-Peer (P2P) Lending Platform

## Overview

This platform connects borrowers and lenders directly for micro-loans. Borrowers can request small loans, and lenders can fund them through Stripe.

---

## Tech Stack

### Frontend

* React.js
* Context API
* Tailwind CSS

### Backend

* Node.js
* Express.js

### Database

* MongoDB (Mongoose ODM)

### Payments

* Stripe API (Connect + PaymentIntents + Webhooks)

---

## Features Implemented

### Week 1: Foundation and Loan Requests

* User authentication (JWT)
* Role-based access (Borrower / Lender)
* Borrower loan request creation
* Borrower loan listing
* Lender marketplace listing
* Protected frontend routes
* Core models: `User`, `LoanRequest`

### Week 2: Lender Onboarding and Loan Funding

* Stripe Connect onboarding for lenders (Express accounts)
* Stripe account status endpoint for lender dashboard
* Funding via Stripe PaymentIntent (`/api/payments/:id/create-payment-intent`)
* Stripe webhook verification and funding finalization (`/api/webhook`)
* Funding records and transaction records updated after successful payment
* ACID transaction handling for financial writes

### Week 3: Repayment and Scheduling (In Progress)

* Repayment schedule model and automatic schedule generation when loan becomes fully funded
* Cron-based due status updater (`node-cron`) for pending/due/overdue transitions
* Borrower repayment PaymentIntent flow (`/api/repayments/:id/create-payment-intent`)
* Webhook repayment processing with:
  * schedule allocation
  * outstanding balance update
  * platform service fee deduction
  * lender payout transfer attempts via Stripe Connect

---

## Current System Flow

### Borrower

1. Register/Login
2. Create loan request
3. View own loans and repayment schedule
4. Make repayments through Stripe card flow

### Lender

1. Register/Login
2. Connect Stripe account
3. Browse marketplace
4. Enter funding amount and pay through Stripe

---

## API Endpoints

### Auth

* POST `/api/auth/register`
* POST `/api/auth/login`

### Loans

* POST `/api/loans/create`
* GET `/api/loans/my-loans`
* GET `/api/loans/marketplace`
* GET `/api/loans/:id`

### Stripe

* POST `/api/stripe/create-account`
* GET `/api/stripe/onboarding-link`
* GET `/api/stripe/account-status`

### Payments

* POST `/api/payments/:id/create-payment-intent`

### Webhook

* POST `/api/webhook`

### Repayments

* POST `/api/repayments/:id/create-payment-intent`
* GET `/api/repayments/loan/:id`
* GET `/api/repayments/borrower/summary`

---

## Security Practices

* JWT authentication and role-based authorization
* All financial amounts validated on backend
* Stripe webhook signature verification
* Server-side status checks before fund updates

---

## Installation

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

---

## Environment Variables

### Backend `.env`

```env
PORT=5500
MONGO_URI=mongodb://localhost:27017/p2p-lending
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLATFORM_SERVICE_FEE_RATE=0.02
REPAYMENT_CRON_SCHEDULE=0 * * * *
CLIENT_URL=http://localhost:3000
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5500/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Current Status

* Week 1: Completed (core features)
* Week 2: Completed (onboarding + funding + webhook flow)
* Week 3: In progress (repayment engine + borrower repayment flow implemented)

## Next Step

Finish Week 3 with deeper repayment testing and then move into Week 4 dashboards + notifications.
