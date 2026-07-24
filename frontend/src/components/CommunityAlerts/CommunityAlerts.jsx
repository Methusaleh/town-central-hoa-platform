import { useState, useEffect } from "react";
import styles from "./CommunityAlerts.module.css";

export default function CommunityAlerts({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("Lost Pet");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/alerts`)
      .then((res) => res.json())
      .then((data) => setAlerts(data))
      .catch((err) => console.error("Error fetching alerts:", err));
  }, [API_URL]);

  const handleSubmitAlert = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("author", `${user?.first_name || "Verified"} Resident`);
      formData.append("content", content.trim());
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const res = await fetch(`${API_URL}/api/alerts`, {
        method: "POST",
        body: formData, // FormData automatically sets correct multipart headers
      });

      if (res.ok) {
        const newAlert = await res.json();
        setAlerts([newAlert, ...alerts]);
        setContent("");
        setSelectedFile(null);
        setShowModal(false);
      } else {
        alert("Failed to publish alert.");
      }
    } catch (err) {
      console.error("Network error posting alert:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleFlagAlert = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/alerts/${id}/flag`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (res.ok) {
        if (data.removed) {
          setAlerts(alerts.filter((alert) => alert.id !== id));
        } else {
          setAlerts(
            alerts.map((alert) =>
              alert.id === id ? { ...alert, flags: data.flags } : alert
            )
          );
        }
      }
    } catch (err) {
      console.error("Network error flagging alert:", err);
    }
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
                <span className={styles.timestamp}>
                  {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className={styles.content}>{alert.content}</p>

              {/* Render Image Attachment if present */}
              {alert.image_url && (
                <div className={styles.imageContainer}>
                  <a href={alert.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={alert.image_url} alt="Alert attachment" className={styles.alertImage} />
                  </a>
                </div>
              )}

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
                  rows="3"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide brief details, locations, or times..."
                  className={styles.textarea}
                  required
                />
              </div>

              {/* Image Upload Input */}
              <div className={styles.inputGroup}>
                <label>Attach Photo (Optional - Great for Lost Pets)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  style={{ fontSize: "0.85rem", padding: "6px" }}
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
                <button type="submit" className={styles.submitBtn} disabled={posting}>
                  {posting ? "Publishing..." : "Publish Instantly"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}