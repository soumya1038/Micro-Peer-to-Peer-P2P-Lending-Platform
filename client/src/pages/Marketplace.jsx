import { useState, useEffect } from "react";
import api from "../services/loanApi";
import LoanCard from "../components/LoanCard";


export default function Marketplace() {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            const res = await api.get("/marketplace");
            setLoans(res.data.loans);
            setLoading(false);
        } catch (error) {
            setError("Could not load loans");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <p className="text-center text-gray-600">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <p className="text-center text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">Loan Marketplace</h1>
                <p className="text-gray-600 mb-6">
                    Explore available loans from borrowers. You can fund any loan that interests you.
                </p>
                {loans.length === 0 ? (
                    <p className="text-center text-gray-500">No loans available at the moment.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loans.map((loan) => (
                            <LoanCard key={loan._id} loan={loan} onUpdate={fetchLoans} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
