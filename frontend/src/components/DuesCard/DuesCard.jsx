import { useState, useEffect } from "react";
import styles from "./DuesCard.module.css";
import { apiFetch } from "../../api";

const EMPTY_PAY = {
  payee: "Town Central HOA",
  routing: "",
  account: "",
  lockbox: ["", "", ""],
  due_label: "June 1, 2026",
};

function dash(value) {
  const text = String(value || "").trim();
  return text || "—";
}

export default function DuesCard({ user }) {
  const [duesInfo, setDuesInfo] = useState(null);
  const [pay, setPay] = useState(EMPTY_PAY);
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState("overview");

  useEffect(() => {
    if (!user?.email) return undefined;
    let cancelled = false;
    Promise.all([
      apiFetch(`/api/dues/${encodeURIComponent(user.email)}`).then((res) => res.json()),
      apiFetch("/api/settings/dues-pay").then((res) => (res.ok ? res.json() : EMPTY_PAY)),
    ])
      .then(([dues, payInfo]) => {
        if (cancelled) return;
        setDuesInfo(dues);
        setPay({ ...EMPTY_PAY, ...(payInfo || {}) });
      })
      .catch((err) => {
        console.error("Error fetching dues:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  if (loading) return <div className={styles.loading}>Loading account details...</div>;

  const street = duesInfo?.street_address || user?.address || "";
  const lockbox = Array.isArray(pay.lockbox) ? pay.lockbox.filter((line) => String(line || "").trim()) : [];

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Annual Dues</h3>
        <span
          className={
            duesInfo?.status === "Paid" ? styles.paidTag : styles.pendingTag
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

      {paymentMode === "overview" && (
        <>
          <div className={styles.details}>
            <p>Next Due Date: <strong>{dash(pay.due_label)}</strong></p>
            <p>Last Payment: <strong>{duesInfo?.last_payment_date ? new Date(duesInfo.last_payment_date).toLocaleDateString() : "N/A"}</strong></p>
            {Number(duesInfo?.balance) > 0 && Number(duesInfo?.days_past_due) > 0 && (
              <p className={styles.pastDue}>
                Past due: <strong>{duesInfo.days_past_due} day{Number(duesInfo.days_past_due) === 1 ? "" : "s"}</strong>
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
            <button
              className={styles.payBtn}
              onClick={() => setPaymentMode("billpay")}
            >
              Use Bank Bill-Pay
            </button>

            <button
              className={styles.secondaryPayBtn}
              onClick={() => setPaymentMode("check")}
            >
              Send Physical Check
            </button>
          </div>
        </>
      )}

      {paymentMode === "billpay" && (
        <div className={styles.payPanel}>
          <h4>Fee-Free Bank Bill-Pay</h4>
          <p>
            Use your bank’s bill-pay to send dues to {pay.payee || "Town Central HOA"}. Put your street in the memo.
          </p>
          <ul>
            <li><strong>Payee:</strong> {dash(pay.payee)}</li>
            <li><strong>Routing:</strong> {dash(pay.routing)}</li>
            <li><strong>Account:</strong> {dash(pay.account)}</li>
            <li><strong>Memo / Reference:</strong> <em>{street}</em></li>
          </ul>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}

      {paymentMode === "check" && (
        <div className={styles.payPanel}>
          <h4>Physical Check</h4>
          <p>
            Make checks payable to <strong>{pay.payee || "Town Central HOA"}</strong> and put your street in the memo.
          </p>
          <p className={styles.payBox}>
            {pay.payee || "Town Central HOA"}
            {lockbox.map((line) => (
              <span key={line}>
                <br />
                {line}
              </span>
            ))}
            <br />
            <em>Memo: {street}</em>
          </p>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}
    </div>
  );
}
