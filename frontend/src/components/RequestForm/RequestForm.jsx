import { useState } from "react";
import styles from "./RequestForm.module.css";
import { apiFetch } from "../../api";

export default function RequestForm({ user }) {
  const [formData, setFormData] = useState({
    type: "maintenance",
    subject: "",
    description: "",
  });
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null); // Clear previous status before a new attempt

    try {
      const response = await apiFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          first_name: user?.first_name || "Guest",
          last_name: user?.last_name || "Resident",
          resident_id: user?.id || null,
        }),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ type: "maintenance", subject: "", description: "" });
      } else {
        // If the server responds with an error code (like 404 or 500)
        const errorData = await response.json();
        console.error("Server Error Details:", errorData);
        setStatus("error");
      }
    } catch (err) {
      // If the fetch itself fails (like a network timeout or ERR_CONNECTION_REFUSED)
      console.error("Network or Fetch Error:", err);
      setStatus("error");
    }
  };

  return (
    <div className={styles.formCard}>
      {status === "success" && (
        <p className={styles.successMsg}>✅ Submitted!</p>
      )}
      {status === "error" && (
        <p className={styles.errorMsg}>❌ Something went wrong.</p>
      )}

      <h3>Submit a New Request</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        {/* ADD THESE FIELDS BACK IN */}
        <div className={styles.inputGroup}>
          <label>Request Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="maintenance">Maintenance</option>
            <option value="arc">ARC Change</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            required
          />
        </div>

        <button type="submit" className={styles.submitBtn}>
          Submit Request
        </button>
      </form>
    </div>
  );
}