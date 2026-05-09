import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

import { useState } from "react";
import paymentApi from "../services/paymentApi";

export default function PaymentForm({ loanId, amount, onSuccess }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handlePayment = async () => {
        setError("");

        if (!stripe || !elements) {
            setError("Stripe is still loading. Please wait a moment.");
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            setError("Please enter a valid amount before paying.");
            return;
        }

        try {
            setLoading(true);

            const res = await paymentApi.post(`/${loanId}/create-payment-intent`, { amount });
            const result = await stripe.confirmCardPayment(
                res.data.clientSecret,
                {
                    payment_method: {
                        card: elements.getElement(CardElement),
                        billing_details: {
                            name: "Lender",
                        },
                    },
                }
            );

            if (result.error) {
                setError("Payment failed: " + result.error.message);
                alert("Payment failed");
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    await paymentApi.post(`/${loanId}/confirm-funding`, {
                        paymentIntentId: result.paymentIntent.id,
                    });
                    setError("");
                    if (onSuccess) {
                        onSuccess();
                    }
                    alert("Payment Successful");
                } else {
                    setError("Payment failed: Unexpected status " + result.paymentIntent.status);
                    alert("Payment failed");
                }
            }
        } catch (error) {
            const apiMessage = error.response?.data?.message;
            setError("Payment failed: " + (apiMessage || error.message));
            alert("Payment failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <CardElement options={{ hidePostalCode: true }} />
            <button
                onClick={handlePayment}
                disabled={!stripe || loading}
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 mt-3 disabled:bg-gray-400"
            >
                {loading ? "Processing..." : "Pay"}
            </button>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
        </div>
    );
}
