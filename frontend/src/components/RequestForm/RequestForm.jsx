import { useState } from "react";
import styles from "./RequestForm.module.css";

export default function RequestForm({ user }) {
  const [formData, setFormData] = useState({
    type: "maintenance",
    subject: "",
    description: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(
      `Request Submitted! The board will review your ${formData.type} request.`,
    );
    // We will wire this to a POST route next
  };

  return (
    <div className={styles.formCard}>
      <h3>Submit a New Request</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>Request Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="maintenance">Common Area Maintenance</option>
            <option value="arc">Architectural Change (ARC)</option>
          </select>
        </div>

        <div className={styles.inputGroup}>
          <label>Subject</label>
          <input
            type="text"
            placeholder="e.g., Fence Repair or Pool Gate"
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
            rows="4"
            placeholder="Please provide as much detail as possible..."
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
