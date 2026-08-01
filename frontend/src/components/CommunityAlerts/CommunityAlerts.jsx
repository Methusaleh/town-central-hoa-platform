import { useState, useEffect } from "react";
import styles from "./CommunityAlerts.module.css";

export default function CommunityAlerts({ user }) {
  const [alerts, setAlerts] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [reactions, setReactions] = useState({});
  const [activePicker, setActivePicker] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [replyInputs, setReplyInputs] = useState({});

  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("Lost Pet");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [posting, setPosting] = useState(false);

  // Moderation Modal State
  const [modModalId, setModModalId] = useState(null);
  const [removalReason, setRemovalReason] = useState("Violates community guidelines");

  const STOCK_REASONS = [
    "Violates community guidelines",
    "Off-topic / Individual grievance",
    "Unsafe or unauthorized media",
    "Unkind or disrespectful tone"
  ];

  const AVAILABLE_EMOJIS = ["👍", "❤️", "🎉", "💡", "⚠️"];
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/alerts`);
      const data = await res.json();
      if (res.ok) {
        setAlerts(data.alerts || []);
        
        const map = {};
        (data.comments || []).forEach(c => {
          if (!map[c.alert_id]) map[c.alert_id] = [];
          map[c.alert_id].push(c);
        });
        setCommentsMap(map);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  useEffect(() => {
    fetchAlerts();
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
      if (selectedFile) formData.append("image", selectedFile);

      const res = await fetch(`${API_URL}/api/alerts`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setContent("");
        setSelectedFile(null);
        setShowModal(false);
        fetchAlerts();
      } else {
        alert("Failed to publish alert.");
      }
    } catch (err) {
      console.error("Network error posting alert:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleEmojiClick = (itemId, emoji, userName = user?.first_name || "Resident") => {
    setReactions((prev) => {
      const itemReactions = prev[itemId] || {};
      const emojiData = itemReactions[emoji] || { count: 0, users: [], reactedByMe: false };
      
      const alreadyReacted = emojiData.reactedByMe;
      const newUsers = alreadyReacted
        ? emojiData.users.filter((u) => u !== userName)
        : [...emojiData.users, userName];
      
      const newCount = emojiData.count + (alreadyReacted ? -1 : 1);

      if (newCount <= 0) {
        const copy = { ...itemReactions };
        delete copy[emoji];
        return { ...prev, [itemId]: copy };
      }

      return {
        ...prev,
        [itemId]: {
          ...itemReactions,
          [emoji]: {
            count: newCount,
            users: newUsers,
            reactedByMe: !alreadyReacted,
          },
        },
      };
    });
    setActivePicker(null);
  };

  const handleAddComment = async (alertId) => {
    const text = replyInputs[alertId];
    if (!text?.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/alerts/${alertId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: user?.first_name || "Resident",
          content: text.trim()
        })
      });

      if (res.ok) {
        setReplyInputs({ ...replyInputs, [alertId]: "" });
        fetchAlerts();
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  const handleModerate = async () => {
    if (!modModalId) return;
    try {
      const res = await fetch(`${API_URL}/api/alerts/${modModalId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removal_reason: removalReason }),
      });

      if (res.ok) {
        setModModalId(null);
        fetchAlerts();
      } else {
        alert("Moderation action failed.");
      }
    } catch (err) {
      console.error("Moderation network error:", err);
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
          alerts.map((alert) => {
            const itemReactions = reactions[alert.id] || {};
            const alertComments = commentsMap[alert.id] || [];
            const isCommentOpen = commentsOpen[alert.id];
            const isPickerOpen = activePicker === alert.id;

            return (
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

                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span className={styles.timestamp}>
                      {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isAdmin && !alert.is_removed && (
                      <button onClick={() => setModModalId(alert.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}>🛡️ Remove</button>
                    )}
                  </div>
                </div>

                <p className={`${styles.content} ${alert.is_removed ? styles.removedText : ""}`}>{alert.content}</p>

                {/* Render Image Attachment if present */}
                {alert.image_url && !alert.is_removed && (
                  <div className={styles.imageContainer}>
                    <a href={alert.image_url} target="_blank" rel="noopener noreferrer">
                      <img src={alert.image_url} alt="Alert attachment" className={styles.alertImage} />
                    </a>
                  </div>
                )}

                {alert.removal_reason && (
                  <div className={styles.removalNotice}>
                    ⚠️ Removal Reason: {alert.removal_reason}
                  </div>
                )}

                {/* COMMENTS STREAM */}
                {alertComments.length > 0 && (
                  <div className={styles.commentsSection}>
                    {alertComments.map((c, idx) => (
                      <div key={idx} className={styles.commentBubble}>
                        <span><strong className={styles.commentAuthor}>{c.author_name}:</strong> {c.content}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* REACTIONS & REPLY ACTION BAR */}
                <div className={styles.reactionsContainer}>
                  {Object.entries(itemReactions).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      className={`${styles.reactionBadge} ${data.reactedByMe ? styles.active : ""}`}
                      onClick={() => handleEmojiClick(alert.id, emoji)}
                    >
                      <span>{emoji}</span>
                      <span>{data.count}</span>
                    </button>
                  ))}

                  <div style={{ position: "relative" }}>
                    <button
                      className={styles.addReactionBtn}
                      onClick={() => setActivePicker(isPickerOpen ? null : alert.id)}
                      title="Add reaction"
                    >
                      ➕
                    </button>

                    {isPickerOpen && (
                      <div className={styles.emojiPopover}>
                        {AVAILABLE_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            className={styles.emojiOption}
                            onClick={() => handleEmojiClick(alert.id, emoji)}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    className={`${styles.reactionBadge} ${isCommentOpen ? styles.active : ""}`}
                    style={{ marginLeft: "auto" }}
                    onClick={() => setCommentsOpen((prev) => ({ ...prev, [alert.id]: !isCommentOpen }))}
                  >
                    💬 Reply
                  </button>
                </div>

                {/* EXPANDABLE COMMENT INPUT */}
                {isCommentOpen && !alert.is_removed && (
                  <div className={styles.commentInputWrapper}>
                    <input
                      type="text"
                      placeholder="Write a reply... (Press Enter)"
                      value={replyInputs[alert.id] || ""}
                      onChange={(e) => setReplyInputs({ ...replyInputs, [alert.id]: e.target.value })}
                      className={styles.commentInput}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment(alert.id);
                          setCommentsOpen((prev) => ({ ...prev, [alert.id]: false }));
                        }
                        if (e.key === "Escape") {
                          setCommentsOpen((prev) => ({ ...prev, [alert.id]: false }));
                        }
                      }}
                    />
                  </div>
                )}

                <div className={styles.cardFooter}>
                  <span>Posted by {alert.author}</span>
                </div>
              </div>
            );
          })
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

              <div className={styles.inputGroup}>
                <label>Attach Photo (Optional - Great for Lost Pets)</label>
                <div 
                  onClick={() => document.getElementById("alert-file-input").click()}
                  style={{ 
                    border: "2px dashed #cbd5e1", 
                    borderRadius: "12px", 
                    padding: "20px", 
                    textAlign: "center", 
                    background: selectedFile ? "#f0fdf4" : "#f8fafc", 
                    cursor: "pointer"
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: "600", color: "#475569" }}>
                    {selectedFile ? `📷 Selected: ${selectedFile.name}` : "📁 Click to browse photo"}
                  </p>
                  <input 
                    id="alert-file-input"
                    type="file" 
                    accept="image/*"
                    hidden 
                    onChange={(e) => setSelectedFile(e.target.files[0] || null)} 
                  />
                </div>
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

      {/* ADMIN REMOVAL MODAL */}
      {modModalId && (
        <div className={styles.modalBackdrop} onClick={() => setModModalId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>🛡️ Moderate Alert</h3>
            <p>Select a stock reason for removing this alert:</p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", margin: "15px 0" }}>
              {STOCK_REASONS.map((reason, idx) => (
                <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", cursor: "pointer" }}>
                  <input 
                    type="radio" 
                    name="removalReason" 
                    value={reason} 
                    checked={removalReason === reason} 
                    onChange={(e) => setRemovalReason(e.target.value)} 
                  />
                  {reason}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={handleModerate} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", padding: "10px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
                Confirm Removal
              </button>
              <button onClick={() => setModModalId(null)} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "10px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}