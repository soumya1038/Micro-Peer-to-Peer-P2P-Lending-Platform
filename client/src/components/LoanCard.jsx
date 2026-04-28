function LoanCard({ loan }) {

    return (
        <div>
            <h3>
                ₹{loan.amount}
            </h3>

            <p>
                {loan.purpose}
            </p>

            <p>
                {loan.tenureMonths} months
            </p>

        </div>
    )
}