import { useState } from "react"
import api from "../services/loanApi"

export default function LoanCard({ loan, onUpdate }) {
    const [amount, setAmount] = useState("");
    const [msg, setMsg] = useState("");
    const [error, setError] = useState("");

    const fundLoan = async () => {
        setMsg("");
        setError("");

        if (!amount || amount <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        try {
            // console.log('Funding loan:', loan._id, 'Amount:', amount);
            const response = await api.post(`/${loan._id}/fund`, { amount: Number(amount) });
            console.log('Fund response:', response.data);
            setMsg("Loan funded successfully!");
            setAmount("");
            if (onUpdate) onUpdate();
        } catch (error) {
            // console.error("Error funding loan:", error);
            // console.error("Error response:", error.response?.data);
            setError(error.response?.data?.message || "Error funding loan. Please try again.");
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-bold mb-2">Loan Amount: ₹{loan.amount}</h3>
            <p className="text-gray-600">Remaining: ₹{loan.amount - loan.fundedAmount}</p>
            <p className="text-gray-600">Funded: ₹{loan.fundedAmount}</p>
            <p className="text-gray-600">Tenure: {loan.tenureMonths} months</p>
            <p className="text-sm mt-2">
                <span className={`px-2 py-1 rounded ${
                    loan.state === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    loan.state === 'funded' ? 'bg-green-100 text-green-800' :
                    'bg-blue-100 text-blue-800'
                }`}>
                    {loan.state}
                </span>
            </p>
            
            {(loan.state === "pending" || loan.state === "partially_funded") && (
                <div className="mt-4">
                    <input 
                        type="number" 
                        placeholder="Enter amount to fund"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                    />
                    <button 
                        onClick={fundLoan}
                        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
                    >
                        Fund Loan
                    </button>
                </div>
            )}
            
            {msg && <p className="mt-2 text-green-600 font-medium">{msg}</p>}
            {error && <p className="mt-2 text-red-600 font-medium">{error}</p>}
        </div>
    )
}