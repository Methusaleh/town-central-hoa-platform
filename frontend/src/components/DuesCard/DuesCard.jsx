import { useState, useEffect } from "react";
import styles from "./DuesCard.module.css";

export default function DuesCard({ residentName }) {
  const [duesInfo, setDuesInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDues = async () => {
      try {
        const response = await fetch(
          `https://town-central-hoa-platform-469564564131.us-central1.run.app/api/dues/${residentName}`,
        );
        const data = await response.json();
        setDuesInfo(data);
      } catch (err) {
        console.error("Error fetching dues:", err);
      } finally {
        setLoading(false);
      }
    };

    if (residentName) fetchDues();
  }, [residentName]);

  if (loading)
    return <div className={styles.loading}>Loading account details...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Annual Assessments</h3>
        <span
          className={
            duesInfo?.status === "Paid" 
              ? styles.paidTag 
              : duesInfo?.status === "Partial"
                ? styles.pendingTag // Adopts the amber warning color notice frame
                : styles.pendingTag
          }
        >
          {duesInfo?.status || "No Record"}
        </span>
      </div>

      <div className={styles.amountArea}>
        <span className={styles.label}>Current Balance</span>
        <h2 className={styles.balance}>
          ${parseFloat(duesInfo?.balance || 0).toFixed(2)}
        </h2>
      </div>

      <div className={styles.details}>
        <p>
          Next Due Date: <strong>June 1, 2026</strong>
        </p>
        <p>
          Last Payment:{" "}
          <strong>
            {duesInfo?.last_payment_date
              ? new Date(duesInfo.last_payment_date).toLocaleDateString()
              : "N/A"}
          </strong>
        </p>
      </div>

      <button
        className={styles.payBtn}
        disabled={!duesInfo || duesInfo.balance <= 0}
      >
        {duesInfo?.balance > 0 ? "Pay Now" : "Nothing Due"}
      </button>
    </div>
  );
}
