import { use, useState } from "react";
import api from "../services/loanApi";
import { useNavigate } from "react-router-dom";

export default function CreateLoan() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        amount: "",
        tenureMonths: "",
        purpose: ""
    });

    const handlechange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setError("");

        // Debug: Check if token exists
        const token = localStorage.getItem('token');
        // console.log('Token from localStorage:', token);

        try {
            const response = await api.post("/create", {
                amount: Number(form.amount),
                tenureMonths: Number(form.tenureMonths),
                purpose: form.purpose
            });

            // // console.log('Loan created successfully:', response.data);
            setMessage("Loan request created successfully!");
            
            // Reset form
            setForm({
                amount: "",
                tenureMonths: "",
                purpose: ""
            });

            // Navigate after 2 seconds
            setTimeout(() => navigate("/borrower"), 2000);

        } catch (error) {
            console.error('Create loan error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            setError(error.response?.data?.message || "Failed to create loan");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold mb-4">Create Loan</h1>
                <p className="text-gray-600 mb-6">Fill out the form with the required details and submit it to the marketplace.</p>

                {message && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label>
                        <input
                            type="number"
                            placeholder="Enter loan amount"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.amount}
                            onChange={handlechange}
                            name="amount"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tenure (months)</label>
                        <input
                            type="number"
                            placeholder="Tenure Months"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.tenureMonths}
                            onChange={handlechange}
                            name="tenureMonths"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                        <input
                            type="text"
                            placeholder="Purpose of loan"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.purpose}
                            onChange={handlechange}
                            name="purpose"
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Create Loan
                    </button>
                </form>
            </div>
        </div>
    );
}