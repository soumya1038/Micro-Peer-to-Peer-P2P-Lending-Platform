import { CardCvcElement, useElements, useStripe } from "@stripe/react-stripe-js";

import { useState } from "react";
import api from "../services/loanApi";

export default function PaymentForm({ loanId, amount, onSuccess }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handlePayment = async (e) => {
        try {
            setLoading(true);

            const res = await api.post(`/payments/${loanId}/create-payment-intent`, { amount });
            const result = await stripe.confirmCardPayment(
                res.data.clientSecret,
                {
                    payment_method: {
                        card: elements.getElement(CardCvcElement),
                        billing_details: {
                            name: 'Customer Name',
                        },
                    },
                }
            );

            if (result.error) {
                setError("Payment failed: " + result.error.message);
                alert("Payment failed");
            } else {
                if (result.paymentIntent.status === 'succeeded') {
                    setError("");
                    onSuccess();
                    alert("Payment successful!");
                } else {
                    setError("Payment failed: Unexpected status " + result.paymentIntent.status);
                    alert("Payment failed");
                }
            }
        } catch (error) {
            setError("Payment failed: " + error.message);
            alert("Payment failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <CardCvcElement options={{ hidePostalCode: true }} />
            <button onClick={handlePayment} disabled={!stripe || loading}>
                {loading ? "Processing..." : "Pay"}
            </button>
            {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
    );
}