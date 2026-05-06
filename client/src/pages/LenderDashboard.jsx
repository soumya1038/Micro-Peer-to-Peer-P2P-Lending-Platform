import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { createAccount, getOnboardingLink, getAccountStatus } from "../services/stripeApi";

export default function LenderDashboard() {
    const [stripeStatus, setStripeStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        checkStripeStatus();
    }, []);

    const checkStripeStatus = async () => {
        try {
            const status = await getAccountStatus();
            setStripeStatus(status);
            setLoading(false);
        } catch (error) {
            console.error("Error checking Stripe status:", error);
            setLoading(false);
        }
    };

    const setupStripeAccount = async () => {
        try {
            setMessage("Creating Stripe account...");
            const accountData = await createAccount();
            
            setMessage("Redirecting to Stripe onboarding...");
            const linkData = await getOnboardingLink();
            
            // Redirect to Stripe onboarding
            window.location.href = linkData.url;
        } catch (error) {
            console.error("Error setting up Stripe account:", error);
            setMessage("Error setting up Stripe account. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">Lender Dashboard</h1>
                <p className="text-gray-600 mb-6">
                    Welcome to your dashboard! Here you can view your loans, manage your profile, and explore the marketplace.
                </p>

                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-bold mb-4">Stripe Account Status</h2>
                    
                    {loading ? (
                        <p className="text-gray-500">Loading...</p>
                    ) : stripeStatus?.connected ? (
                        <div>
                            <p className="text-green-600 font-medium mb-2">✓ Stripe account connected</p>
                            <p className="text-sm text-gray-600">Account ID: {stripeStatus.accountId}</p>
                            <p className="text-sm text-gray-600">Details Submitted: {stripeStatus.detailsSubmitted ? 'Yes' : 'No'}</p>
                            <p className="text-sm text-gray-600">Charges Enabled: {stripeStatus.chargesEnabled ? 'Yes' : 'No'}</p>
                            <p className="text-sm text-gray-600">Payouts Enabled: {stripeStatus.payoutsEnabled ? 'Yes' : 'No'}</p>
                            
                            {!stripeStatus.detailsSubmitted && (
                                <button 
                                    onClick={setupStripeAccount} 
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Complete Stripe Onboarding
                                </button>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="text-gray-600 mb-4">Connect your bank account to receive payments from funded loans.</p>
                            <button 
                                onClick={setupStripeAccount} 
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                Connect Bank Account with Stripe
                            </button>
                        </div>
                    )}

                    {message && (
                        <p className="mt-4 text-blue-600">{message}</p>
                    )}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                    <Link 
                        to="/marketplace" 
                        className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Explore Loan Marketplace
                    </Link>
                </div>
            </div>
        </div>
    );
}