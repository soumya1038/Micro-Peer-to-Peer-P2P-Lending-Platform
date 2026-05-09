import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useState } from "react";
import repaymentApi from "../services/repaymentApi";

export default function RepaymentForm({ loanId, amount, onSuccess }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleRepayment = async () => {
        setError("");

        if (!stripe || !elements) {
            setError("Stripe is still loading. Please wait a moment.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Please enter a valid repayment amount.");
            return;
        }

        try {
            setLoading(true);

            const res = await repaymentApi.post(`/${loanId}/create-payment-intent`, { amount });
            const result = await stripe.confirmCardPayment(res.data.clientSecret, {
                payment_method: {
                    card: elements.getElement(CardElement),
                    billing_details: {
                        name: "Borrower",
                    },
                },
            });

            if (result.error) {
                setError(`Repayment failed: ${result.error.message}`);
                return;
            }

            if (result.paymentIntent.status === "succeeded") {
                if (onSuccess) {
                    onSuccess();
                }
                alert("Repayment submitted successfully.");
                return;
            }

            setError(`Repayment failed: Unexpected status ${result.paymentIntent.status}`);
        } catch (error) {
            const message = error.response?.data?.message || error.message;
            setError(`Repayment failed: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <CardElement options={{ hidePostalCode: true }} />
            <button
                onClick={handleRepayment}
                disabled={!stripe || loading}
                className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition duration-200 disabled:bg-gray-400"
            >
                {loading ? "Processing..." : "Repay Now"}
            </button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
    );
}
