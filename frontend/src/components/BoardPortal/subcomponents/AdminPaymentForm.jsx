import { useState } from "react";
import styles from "./AdminPaymentForm.module.css";

export default function AdminPaymentForm({ user, street_address, onPaymentSuccess }) {
  const [formData, setFormData] = useState({
    amount: "",
    payment_method: "check",
    reference_note: ""
  });
  const [status, setStatus] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
          admin_name: user?.first_name || "Board Member"
        })
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Success! Payment applied.`);
        setFormData({ amount: "", payment_method: "check", reference_note: "" });
        
        // Notify the parent (FinancialLedger) that data needs to be refreshed
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
      <h4>Log Payment for {street_address}</h4>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Amount ($)</label>
          <input 
            type="number" 
            step="0.01" 
            placeholder="0.00" 
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: e.target.value})}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Method</label>
          <select 
            value={formData.payment_method}
            onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
          >
            <option value="check">Paper Check</option>
            <option value="zelle">Zelle (Business)</option>
            <option value="ach">ACH Transfer</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Reference / Note</label>
          <input 
            type="text" 
            placeholder="e.g. Check #1042" 
            value={formData.reference_note}
            onChange={(e) => setFormData({...formData, reference_note: e.target.value})}
          />
        </div>

        <button type="submit" className={styles.submitBtn}>Apply Payment</button>
      </form>
      {status && <p className={styles.statusMessage}>{status}</p>}
    </div>
  );
}