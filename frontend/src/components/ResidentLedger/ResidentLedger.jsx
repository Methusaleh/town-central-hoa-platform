import { useState, useEffect } from "react";
import styles from "./ResidentLedger.module.css";
import { apiFetch } from "../../api";

export default function ResidentLedger({ user }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user?.address) {
      apiFetch(`/api/dues/history/${encodeURIComponent(user.address)}`)
        .then((res) => res.json())
        .then((data) => setTransactions(Array.isArray(data) ? data : []))
        .catch((err) => console.error("History fetch error:", err));
    }
  }, [user?.address]);

  return (
    <div className={styles.ledgerContainer}>
      <h3>Dues History</h3>
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
                <td className={t.transaction_type === "charge" ? styles.charge : styles.credit}>
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