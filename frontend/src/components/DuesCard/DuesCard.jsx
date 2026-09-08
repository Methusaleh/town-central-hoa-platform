import { useState, useEffect } from "react";
import styles from "./DuesCard.module.css";
import { apiFetch } from "../../api";

export default function DuesCard({ user }) {
  const [duesInfo, setDuesInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState("overview");

  useEffect(() => {
    const fetchDues = async () => {
      try {
        const response = await apiFetch(`/api/dues/${encodeURIComponent(user?.email || "")}`);
        const data = await response.json();
        setDuesInfo(data);
      } catch (err) {
        console.error("Error fetching dues:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) fetchDues();
  }, [user?.email]);

  if (loading) return <div className={styles.loading}>Loading account details...</div>;

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
            <p>Next Due Date: <strong>June 1, 2026</strong></p>
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
        <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>Fee-Free Bank Bill-Pay</h4>
          <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.4", margin: "0 0 10px 0" }}>
            Use your bank’s bill-pay to send dues to Town Central HOA. Put your street in the memo.
            The board will post the routing and account numbers here before the first assessment is collected through the portal.
          </p>
          <ul style={{ fontSize: "0.85rem", color: "#334155", paddingLeft: "16px", margin: "0 0 15px 0", lineHeight: "1.5" }}>
            <li><strong>Payee:</strong> Town Central HOA</li>
            <li><strong>Routing / Account:</strong> Posted by the treasurer before go-live</li>
            <li><strong>Memo / Reference:</strong> <em>{duesInfo?.street_address || user?.address}</em></li>
          </ul>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}

      {paymentMode === "check" && (
        <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>Physical Check Instructions</h4>
          <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.4", margin: "0 0 10px 0" }}>
            Make checks payable to <strong>Town Central HOA</strong> and put your street in the memo.
            The lockbox address will be posted here before the board starts collecting through the portal.
          </p>
          <p style={{ fontSize: "0.85rem", fontWeight: "600", color: "#0f172a", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", margin: "0 0 15px 0", lineHeight: "1.5" }}>
            Town Central HOA<br />
            Lockbox address coming from the treasurer<br />
            <em>Memo: {duesInfo?.street_address || user?.address}</em>
          </p>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}
    </div>
  );
}
