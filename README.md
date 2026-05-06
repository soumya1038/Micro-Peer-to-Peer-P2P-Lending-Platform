# Micro Peer-to-Peer (P2P) Lending Platform

## Overview

This project is a micro peer-to-peer lending platform that connects borrowers and lenders directly. Borrowers can request small loans, and lenders can fund those loans, enabling financial inclusion and decentralized investment opportunities.

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

* Stripe API (Stripe Connect)

---

## Features Implemented

### Week 1: Foundation & Loan Management

* User Authentication (JWT)
* Role-Based Access (Borrower / Lender)
* Loan Request Creation
* Borrower Dashboard
* Lender Marketplace (View Loan Requests)
* Protected Routes
* MongoDB Models:

  * User
  * LoanRequest

---

### Week 2: Funding & Stripe Onboarding

#### Backend

* FundedLoan Model (tracks investments)
* Transaction Model (tracks financial actions)
* Loan Funding Logic (multi-lender support)
* MongoDB ACID Transactions for consistency

#### Stripe Connect Integration

* Lender onboarding using Stripe Express accounts
* Stripe account creation via API
* Onboarding link generation
* Stripe account details stored in database

#### Lender Dashboard

* Stripe connection status display:

  * Account ID
  * Charges Enabled
  * Payouts Enabled
  * Details Submitted

---

## Current System Flow

### Borrower

1. Register/Login
2. Create Loan Request
3. View Own Loans

### Lender

1. Register/Login
2. Connect Stripe Account
3. View Loan Marketplace
4. (Next Step) Fund Loans

---

## API Endpoints

### Auth

* POST `/api/auth/register`
* POST `/api/auth/login`

### Loans

* POST `/api/loans/create`
* GET `/api/loans/my-loans`
* GET `/api/loans/marketplace`

### Stripe

* POST `/api/stripe/create-account`
* GET `/api/stripe/onboarding-link`

---

## Database Models

### User

* name
* email
* password
* role
* stripeAccountId

### LoanRequest

* borrowerId
* amount
* tenureMonths
* purpose
* status
* fundedAmount

### FundedLoan

* loanId
* lenderId
* amount

### Transaction

* type
* loanId
* lenderId
* amount

---

## Important Concepts Implemented

* Role-based authorization
* MongoDB multi-document transactions
* Stripe Connect onboarding flow
* Secure backend validation

---

## Future Plan

### Week 2 (Remaining)

* Stripe Payment Integration (PaymentIntent)
* Replace internal funding with real payments
* Stripe Webhook for payment confirmation
* Automatic loan status update after payment

---

### Week 3: Repayment System

* EMI calculation
* Repayment schedule generation
* Cron job for due tracking
* Borrower repayment via Stripe
* Distribution to lenders
* Platform fee deduction

---

### Week 4: Dashboard & Notifications

* Borrower Dashboard (loans, EMIs, history)
* Lender Dashboard (investments, returns)
* Notification system (email/in-app)
* Full system testing
* API documentation

---

## Security Practices

* JWT authentication
* Role-based route protection
* Backend-only financial logic
* Stripe webhook validation (planned)

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

```
MONGO_URI=your_mongo_uri
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

---

## Current Status

```text
✔ Week 1 Completed
✔ Week 2 (Onboarding) Completed
⏳ Week 2 (Payments) In Progress
```

---

## Next Step

Implement Stripe Payment + Webhook system for real loan funding.
