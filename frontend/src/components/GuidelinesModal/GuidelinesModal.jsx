import { useState } from "react";
import styles from "./GuidelinesModal.module.css";
import { apiFetch } from "../../api";

export default function GuidelinesModal({ user, onAgree }) {
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!isChecked) return;

    setLoading(true);
    try {
      const res = await apiFetch("/api/residents/agree-guidelines", {
        method: "POST",
        body: JSON.stringify({})
      });

      if (res.ok) {
        onAgree(); // Unlocks the portal features in parent state
      } else {
        alert("Failed to save agreement status.");
      }
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalCard}>
        <h2>🏡 Community Standards & Forum Guidelines</h2>
        <p className={styles.subtext}>
          Welcome to the Town Central digital community! To protect the welcoming, positive nature of our neighborhood, please review and accept our guidelines before participating in community discussions.
        </p>

        <div className={styles.rulesBox}>
          <ul>
            <li><strong>Be Kind & Respectful:</strong> Treat neighbors with the same courtesy you would expect in person.</li>
            <li><strong>Keep it Constructive:</strong> Focus on community building, safety, and fun. Individual grievances or complaints should be directed to the board privately via email rather than public channels.</li>
            <li><strong>No Explicit Media:</strong> Uploads, photos, and GIFs are monitored. Posting explicit, violent, or unsafe media will result in immediate content removal and account review.</li>
            <li><strong>Admin Oversight:</strong> Board members and admins reserve the right to remove non-compliant posts or comments.</li>
          </ul>
        </div>

        <form onSubmit={handleAccept} className={styles.form}>
          <label className={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={(e) => setIsChecked(e.target.checked)} 
            />
            <span>I have read, understood, and agree to abide by the Town Central community guidelines.</span>
          </label>

          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={!isChecked || loading}
          >
            {loading ? "Saving..." : "Accept & Enter Community"}
          </button>
        </form>
      </div>
    </div>
  );
}