import { useState } from "react";
import styles from "./RequestForm.module.css";

export default function RequestForm({ user }) {
  const [formData, setFormData] = useState({
    type: "maintenance",
    subject: "",
    description: "",
  });
  const [status, setStatus] = useState(null); // 'success' or 'error'

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          first_name: user?.first_name || "Guest",
          last_name: "Resident", // Placeholder until full auth is ready
          resident_id: 1, // Placeholder
        }),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ type: "maintenance", subject: "", description: "" });
      } else {
        setStatus("error");
      }
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <div className={styles.formCard}>
      {status === "success" && (
        <p className={styles.successMsg}>✅ Request submitted successfully!</p>
      )}
      {status === "error" && (
        <p className={styles.errorMsg}>❌ Something went wrong. Try again.</p>
      )}

      <h3>Submit a New Request</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* ... existing input groups ... */}
        <button type="submit" className={styles.submitBtn}>
          Submit Request
        </button>
      </form>
    </div>
  );
}
