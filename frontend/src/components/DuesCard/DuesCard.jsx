import { useState, useEffect } from "react";
import styles from "./DuesCard.module.css";

export default function DuesCard({ user }) {
  const [duesInfo, setDuesInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMode, setPaymentMode] = useState("overview"); // "overview", "stripe", "billpay", "check"
  const [clientSecret, setClientSecret] = useState("");
  const [processing, setProcessing] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    const fetchDues = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dues/${user?.email}`);
        const data = await response.json();
        setDuesInfo(data);
      } catch (err) {
        console.error("Error fetching dues:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) fetchDues();
  }, [user?.email, API_URL]);

  const initStripeACH = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${API_URL}/api/billing/create-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          amount: duesInfo?.balance || 0,
          street_address: duesInfo?.street_address || user?.address,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setClientSecret(data.clientSecret);
        setPaymentMode("stripe");
      } else {
        alert(data.error || "Could not initialize secure checkout.");
      }
    } catch (err) {
      console.error("Billing network error:", err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading account details...</div>;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>Annual Assessments</h3>
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
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
            <button 
              className={styles.payBtn} 
              onClick={initStripeACH}
              disabled={!duesInfo || duesInfo.balance <= 0 || processing}
            >
              {processing ? "Loading Gateway..." : "⚡ Pay Online (Stripe ACH - $5 Fee)"}
            </button>

            <button 
              className={styles.secondaryPayBtn} 
              onClick={() => setPaymentMode("billpay")}
            >
              🏦 Use Bank Bill-Pay (Free)
            </button>

            <button 
              className={styles.secondaryPayBtn} 
              onClick={() => setPaymentMode("check")}
            >
              ✉️ Send Physical Check (Free)
            </button>
          </div>
        </>
      )}

      {paymentMode === "stripe" && (
        <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>Secure Digital Bank Transfer</h4>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 15px 0", lineHeight: "1.4" }}>
            A flat $5.00 processing fee applies to automated digital checkouts. Your balance will update instantly upon completion.
          </p>
          <div style={{ background: "white", padding: "20px", borderRadius: "10px", border: "1px dashed #cbd5e1", textAlign: "center", margin: "15px 0" }}>
            <p style={{ margin: "0 0 4px 0", fontWeight: "600", color: "#0f172a" }}>🔒 Stripe Financial Connections Widget Ready</p>
            <small style={{ color: "#94a3b8" }}>Test Client Secret Generated Successfully</small>
          </div>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}

      {paymentMode === "billpay" && (
        <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>🏦 Fee-Free Bank Bill-Pay</h4>
          <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.4", margin: "0 0 10px 0" }}>
            Set up Town Central HOA as a payee inside your personal banking app to push payments with zero fees:
          </p>
          <ul style={{ fontSize: "0.85rem", color: "#334155", paddingLeft: "16px", margin: "0 0 15px 0", lineHeight: "1.5" }}>
            <li><strong>Payee:</strong> Town Central HOA</li>
            <li><strong>Routing / Account:</strong> [HOA Business Bank Routing & Account]</li>
            <li><strong>Memo / Reference:</strong> <em>{duesInfo?.street_address || user?.address}</em></li>
          </ul>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}

      {paymentMode === "check" && (
        <div style={{ background: "#f8fafc", padding: "18px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#0f172a" }}>✉️ Physical Check Instructions</h4>
          <p style={{ fontSize: "0.85rem", color: "#475569", lineHeight: "1.4", margin: "0 0 10px 0" }}>
            Make checks payable to <strong>Town Central HOA</strong> and mail or drop them off at the management lockbox:
          </p>
          <p style={{ fontSize: "0.85rem", fontWeight: "600", color: "#0f172a", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", margin: "0 0 15px 0", lineHeight: "1.5" }}>
            Town Central HOA Lockbox<br />
            123 Community Way, Piedmont, OK 73078<br />
            <em>Memo: {duesInfo?.street_address || user?.address}</em>
          </p>
          <button onClick={() => setPaymentMode("overview")} className={styles.backLinkBtn}>← Back to Payment Options</button>
        </div>
      )}
    </div>
  );
}