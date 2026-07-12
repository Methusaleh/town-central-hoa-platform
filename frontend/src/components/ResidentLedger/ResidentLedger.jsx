import { useState, useEffect } from "react";
import styles from "./ResidentLedger.module.css";

export default function ResidentLedger({ user }) {
  const [transactions, setTransactions] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    if (user?.address) {
      fetch(`${API_URL}/api/dues/history/${encodeURIComponent(user.address)}`)
        .then((res) => res.json())
        .then((data) => setTransactions(data))
        .catch((err) => console.error("History fetch error:", err));
    }
  }, [user?.address, API_URL]);

  return (
    <div className={styles.ledgerContainer}>
      <h3>Transaction History</h3>
      <div className={styles.scrollArea}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.created_at).toLocaleDateString()}</td>
                <td style={{ textTransform: "capitalize" }}>{t.transaction_type}</td>
                {/* Method displays exactly as recorded in the database */}
                <td>{t.payment_method || "Check"}</td>
                <td style={{ color: t.transaction_type === "charge" ? "#ef4444" : "#10b981" }}>
                  {t.transaction_type === "charge" ? "+" : "-"}${parseFloat(t.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}