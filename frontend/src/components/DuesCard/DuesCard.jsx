import styles from "./DuesCard.module.css";

export default function DuesCard({ residentName }) {
  // Mock data - this will eventually come from your SQL table
  const duesInfo = {
    balance: 150.0,
    status: "Pending",
    dueDate: "June 1, 2026",
    lastPayment: "May 1, 2026",
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Annual Assessments</h3>
        <span
          className={
            duesInfo.status === "Paid" ? styles.paidTag : styles.pendingTag
          }
        >
          {duesInfo.status}
        </span>
      </div>

      <div className={styles.amountArea}>
        <span className={styles.label}>Current Balance</span>
        <h2 className={styles.balance}>${duesInfo.balance.toFixed(2)}</h2>
      </div>

      <div className={styles.details}>
        <p>
          Next Due Date: <strong>{duesInfo.dueDate}</strong>
        </p>
        <p>
          Last Payment: <strong>{duesInfo.lastPayment}</strong>
        </p>
      </div>

      <button
        className={styles.payBtn}
        disabled={duesInfo.balance === 0}
        onClick={() => alert("Redirecting to Secure Payment...")}
      >
        {duesInfo.balance > 0 ? "Pay Now" : "Nothing Due"}
      </button>
    </div>
  );
}
