// Replace ./frontend/src/components/BoardPortal/subcomponents/AdminPaymentForm.jsx
import { useState } from "react";
import styles from "./AdminPaymentForm.module.css";

export default function AdminPaymentForm({ user, street_address, onPaymentSuccess }) {
  const [formData, setFormData] = useState({
    transaction_type: "payment",
    amount: "",
    payment_method: "check",
    reference_note: ""
  });
  const [displayAmount, setDisplayAmount] = useState("");
  const [status, setStatus] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  // Handles raw number typing and auto-formats to two decimal places
  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, ""); // Strip non-digits
    if (!rawValue) {
      setDisplayAmount("");
      setFormData({ ...formData, amount: "" });
      return;
    }

    const numericValue = (parseInt(rawValue, 10) / 100).toFixed(2);
    setDisplayAmount(numericValue);
    setFormData({ ...formData, amount: numericValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Processing...");

    try {
      const res = await fetch(`${API_URL}/api/dues/manual-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          street_address,
          ...formData,
          admin_name: user?.first_name || "Board Treasurer"
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Success! Record applied.`);
        setFormData({ transaction_type: "payment", amount: "", payment_method: "check", reference_note: "" });
        setDisplayAmount("");
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setStatus("❌ Network error. Please check server connection.");
    }
  };

  return (
    <div className={styles.formContainer}>
      <h4>Manage Ledger for {street_address}</h4>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Transaction Type</label>
          <select 
            value={formData.transaction_type}
            onChange={(e) => setFormData({...formData, transaction_type: e.target.value})}
          >
            <option value="payment">Record Incoming Payment</option>
            <option value="charge">Issue Opening / Special Charge</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Amount ($)</label>
          <input 
            type="text" 
            placeholder="0.00" 
            value={displayAmount}
            onChange={handleAmountChange}
            required
          />
        </div>

        {formData.transaction_type === "payment" && (
          <div className={styles.inputGroup}>
            <label>Payment Method</label>
            <select 
              value={formData.payment_method}
              onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
            >
              <option value="check">Paper Check</option>
              <option value="zelle">Zelle (Business)</option>
              <option value="ach">ACH Transfer</option>
            </select>
          </div>
        )}

        <div className={styles.inputGroup}>
          <label>Reference / Note</label>
          <input 
            type="text" 
            placeholder={formData.transaction_type === "charge" ? "e.g. 2026 Opening Balance or Special Assessment" : "e.g. Check #1042"} 
            value={formData.reference_note}
            onChange={(e) => setFormData({...formData, reference_note: e.target.value})}
          />
        </div>

        <button type="submit" className={styles.submitBtn}>
          {formData.transaction_type === "charge" ? "Post Charge to Account" : "Apply Payment"}
        </button>
      </form>
      {status && <p className={styles.statusMessage}>{status}</p>}
    </div>
  );
}