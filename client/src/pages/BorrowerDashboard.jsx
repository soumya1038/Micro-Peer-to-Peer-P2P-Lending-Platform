import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import loanApi from "../services/loanApi";
import repaymentApi from "../services/repaymentApi";
import RepaymentForm from "../components/RepaymentForm";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function toMoney(value) {
    const parsed = Number(value || 0);
    return Number(parsed.toFixed(2));
}

function outstandingForLoan(loan) {
    if (Number.isFinite(loan.outstandingBalance) && loan.outstandingBalance > 0) {
        return toMoney(loan.outstandingBalance);
    }
    return toMoney(Number(loan.amount || 0) - Number(loan.totalRepaidAmount || 0));
}

export default function BorrowerDashboard() {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [detailsByLoan, setDetailsByLoan] = useState({});
    const [repayAmounts, setRepayAmounts] = useState({});

    const activeFundedLoans = useMemo(
        () => loans.filter((loan) => loan.status === "funded"),
        [loans]
    );

    const fetchLoans = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await loanApi.get("/my-loans");
            setLoans(res.data.loans || []);
        } catch (error) {
            setError(error.response?.data?.message || "Could not load your loans");
        } finally {
            setLoading(false);
        }
    };

    const loadLoanDetails = async (loanId) => {
        try {
            const res = await repaymentApi.get(`/loan/${loanId}`);
            setDetailsByLoan((prev) => ({ ...prev, [loanId]: res.data }));
        } catch (error) {
            setDetailsByLoan((prev) => ({
                ...prev,
                [loanId]: { loadError: error.response?.data?.message || "Could not load schedule" },
            }));
        }
    };

    useEffect(() => {
        fetchLoans();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-8">
                <p className="text-center text-gray-600">Loading your dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h1 className="text-3xl font-bold">Borrower Dashboard</h1>
                    <p className="text-gray-600 mt-2">
                        Track your active loans, check repayment schedule, and make repayments securely.
                    </p>
                    <Link
                        to="/create-loan"
                        className="inline-block mt-4 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Create New Loan Request
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded">
                        {error}
                    </div>
                )}

                {loans.length === 0 ? (
                    <div className="bg-white p-6 rounded-lg shadow-md text-gray-600">
                        You have not created any loan requests yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {loans.map((loan) => {
                            const details = detailsByLoan[loan._id];
                            const outstanding = Math.max(outstandingForLoan(loan), 0);
                            const canRepay = loan.status === "funded" && outstanding > 0;
                            const repayAmount = Number(repayAmounts[loan._id] || 0);

                            return (
                                <div key={loan._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                                    <h2 className="text-xl font-bold mb-2">Loan ID: {loan._id.slice(-8)}</h2>
                                    <p className="text-gray-700">Amount: INR {toMoney(loan.amount)}</p>
                                    <p className="text-gray-700">Funded: INR {toMoney(loan.fundedAmount)}</p>
                                    <p className="text-gray-700">Tenure: {loan.tenureMonths} months</p>
                                    <p className="text-gray-700">Outstanding: INR {outstanding}</p>
                                    <p className="text-gray-700">Total Repaid: INR {toMoney(loan.totalRepaidAmount)}</p>
                                    <p className="text-gray-700">
                                        Monthly Installment: INR {toMoney(loan.monthlyInstallmentAmount)}
                                    </p>
                                    <p className="mt-2">
                                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-sm">
                                            {loan.status} | repayment: {loan.repaymentStatus || "not_started"}
                                        </span>
                                    </p>

                                    {loan.status === "funded" && (
                                        <button
                                            className="mt-4 text-blue-600 hover:underline"
                                            onClick={() => loadLoanDetails(loan._id)}
                                        >
                                            View Repayment Schedule
                                        </button>
                                    )}

                                    {details?.loadError && (
                                        <p className="text-red-600 text-sm mt-2">{details.loadError}</p>
                                    )}

                                    {details?.schedules?.length > 0 && (
                                        <div className="mt-4 border rounded p-3 bg-gray-50">
                                            <p className="text-sm font-semibold mb-2">
                                                Due Now: INR {toMoney(details.summary?.dueNow)}
                                            </p>
                                            <div className="max-h-40 overflow-y-auto text-sm">
                                                {details.schedules.map((schedule) => (
                                                    <div
                                                        key={`${schedule.loanId}-${schedule.installmentNumber}`}
                                                        className="flex justify-between py-1 border-b border-gray-200 last:border-b-0"
                                                    >
                                                        <span>Inst #{schedule.installmentNumber}</span>
                                                        <span>{new Date(schedule.dueDate).toLocaleDateString()}</span>
                                                        <span>Due INR {toMoney(schedule.dueAmount)}</span>
                                                        <span className="capitalize">{schedule.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {canRepay && (
                                        <div className="mt-5 space-y-3">
                                            <input
                                                type="number"
                                                placeholder={`Repay up to INR ${outstanding}`}
                                                value={repayAmounts[loan._id] || ""}
                                                onChange={(e) =>
                                                    setRepayAmounts((prev) => ({ ...prev, [loan._id]: e.target.value }))
                                                }
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                            <Elements stripe={stripePromise}>
                                                <RepaymentForm
                                                    loanId={loan._id}
                                                    amount={repayAmount}
                                                    onSuccess={async () => {
                                                        setRepayAmounts((prev) => ({ ...prev, [loan._id]: "" }));
                                                        await fetchLoans();
                                                        await loadLoanDetails(loan._id);
                                                    }}
                                                />
                                            </Elements>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeFundedLoans.length === 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded">
                        Once a lender fully funds your loan, repayment schedule and repayment actions will appear here.
                    </div>
                )}
            </div>
        </div>
    );
}
