import { useState, useEffect } from "react";
import styles from "./CommunityAlerts.module.css";

export default function CommunityAlerts({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("Lost Pet");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  // Fetch active alerts on load
  useEffect(() => {
    // In future iterations, link this to your backend alert table endpoint
    // For now, initializing clean state architecture matching your board rules
    setLoading(false);
  }, []);

  // Handle posting an alert instantly
  const handleSubmitAlert = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const newAlert = {
      id: Date.now().toString(),
      category,
      author: `${user?.first_name || "Verified"} Resident`,
      timestamp: "Just now",
      content: content.trim(),
      flags: 0,
    };

    setAlerts([newAlert, ...alerts]);
    setContent("");
    setShowModal(false);
  };

  // Handle community flagging (auto-hide if it reaches 3 flags)
  const handleFlagAlert = (id) => {
    setAlerts(
      alerts
        .map((alert) => {
          if (alert.id === id) {
            const updatedFlags = alert.flags + 1;
            if (updatedFlags >= 3) {
              return null; // Auto-removes post if flagged 3 times by community
            }
            return { ...alert, flags: updatedFlags };
          }
          return alert;
        })
        .filter(Boolean)
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2>🚨 Community Alerts</h2>
          <p>Time-sensitive neighborhood notices (lost pets, block parties, traffic).</p>
        </div>
        <button onClick={() => setShowModal(true)} className={styles.postBtn}>
          + Post Alert
        </button>
      </header>

      {/* Alerts Feed */}
      <div className={styles.feed}>
        {alerts.length === 0 ? (
          <div className={styles.emptyCard}>
            <p>No active neighborhood alerts right now.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className={styles.alertCard}>
              <div className={styles.cardHeader}>
                <span
                  className={`${styles.tag} ${
                    alert.category === "Lost Pet"
                      ? styles.tagPet
                      : alert.category === "Traffic / Party"
                      ? styles.tagTraffic
                      : styles.tagSafety
                  }`}
                >
                  {alert.category === "Lost Pet" && "🐾 "}
                  {alert.category === "Traffic / Party" && "🎉 "}
                  {alert.category === "Safety Alert" && "⚠️ "}
                  {alert.category}
                </span>
                <span className={styles.timestamp}>{alert.timestamp}</span>
              </div>
              <p className={styles.content}>{alert.content}</p>
              <div className={styles.cardFooter}>
                <span>Posted by {alert.author}</span>
                <button
                  onClick={() => handleFlagAlert(alert.id)}
                  className={styles.flagBtn}
                  title="Flag if inappropriate or miscategorized"
                >
                  🚩 Report
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post Alert Modal */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>Create Community Alert</h3>

            {/* MANDATORY DISCLAIMER */}
            <div className={styles.disclaimer}>
              ⚠️ <strong>Rule Check:</strong> Community Alerts are strictly for time-sensitive neighborhood notices (lost pets, street safety, block parties). General complaints or maintenance requests should use the <strong>Contact the Board</strong> channel instead.
            </div>

            <form onSubmit={handleSubmitAlert} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.select}
                >
                  <option value="Lost Pet">🐾 Lost / Found Pet</option>
                  <option value="Traffic / Party">🎉 Block Party / Traffic Warning</option>
                  <option value="Safety Alert">⚠️ Urgent Safety / Weather</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label>Details</label>
                <textarea
                  rows="4"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide brief details, locations, or times..."
                  className={styles.textarea}
                  required
                />
              </div>

              <div className={styles.modalButtonGroup}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Publish Instantly
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}