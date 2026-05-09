import { useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import PaymentForm from "./PaymentForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function LoanCard({ loan, onUpdate }) {
    const [amount, setAmount] = useState("");
    const remainingAmount = loan.amount - loan.fundedAmount;
    const canFund = loan.status === "pending" || loan.status === "partially_funded";

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-2xl font-bold mb-4">Name: {loan.borrower.name}</h2>
            <h3 className="text-xl font-bold mb-2">Loan Amount: INR {loan.amount}</h3>
            <p className="text-gray-600">Remaining: INR {remainingAmount}</p>
            <p className="text-gray-600">Funded: INR {loan.fundedAmount}</p>
            <p className="text-gray-600">Tenure: {loan.tenureMonths} months</p>
            <p className="text-sm mt-2">
                <span
                    className={`px-2 py-1 rounded ${
                        loan.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : loan.status === "funded"
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                    }`}
                >
                    {loan.status}
                </span>
            </p>

            {canFund && (
                <div className="mt-4">
                    <input
                        type="number"
                        placeholder="Enter amount to fund"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                    <p className="text-xs text-gray-500 mb-3">
                        Enter an amount between INR 100 and INR {remainingAmount}, then pay using Stripe.
                    </p>
                    <Elements stripe={stripePromise}>
                        <PaymentForm
                            loanId={loan._id}
                            amount={Number(amount)}
                            onSuccess={() => {
                                setAmount("");
                                if (onUpdate) onUpdate();
                            }}
                        />
                    </Elements>
                </div>
            )}
        </div>
    );
}
