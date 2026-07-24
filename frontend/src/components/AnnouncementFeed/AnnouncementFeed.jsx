import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [notifications, setNotifications] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [reactions, setReactions] = useState({}); 
  const [comments, setComments] = useState({}); 
  const [activePicker, setActivePicker] = useState(null); 
  const [commentsOpen, setCommentsOpen] = useState({});
  
  // Modal state for creating a new alert right from the alerts section
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlertCategory, setNewAlertCategory] = useState("Lost Pet");
  const [newAlertContent, setNewAlertContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [posting, setPosting] = useState(false);

  const AVAILABLE_EMOJIS = ["👍", "❤️", "🎉", "💡", "⚠️"];
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/notifications`).then((res) => res.json()),
      fetch(`${API_URL}/api/alerts`).then((res) => res.json())
    ])
      .then(([notifData, alertData]) => {
        setNotifications(Array.isArray(notifData) ? notifData : []);
        setAlerts(Array.isArray(alertData) ? alertData : []);
      })
      .catch((err) => console.error("Error fetching feed stream data:", err));
  }, [API_URL]);

  const handleEmojiClick = (itemId, emoji, userName = "Aaron") => {
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

  const handleAddComment = (itemId, text) => {
    if (!text.trim()) return;
    setComments((prev) => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { author: "Aaron", text: text.trim() }],
    }));
  };

  const handleCreateAlertSubmit = async (e) => {
    e.preventDefault();
    if (!newAlertContent.trim()) return;

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("category", newAlertCategory);
      formData.append("author", "Aaron Resident");
      formData.append("content", newAlertContent.trim());
      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const res = await fetch(`${API_URL}/api/alerts`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newAlert = await res.json();
        setAlerts([newAlert, ...alerts]);
        setNewAlertContent("");
        setSelectedFile(null);
        setShowCreateModal(false);
      } else {
        alert("Failed to publish alert.");
      }
    } catch (err) {
      console.error("Network error posting alert:", err);
    } finally {
      setPosting(false);
    }
  };

  const getPriorityClass = (channelType) => {
    switch (channelType) {
      case "critical_email":
        return styles.urgent;
      case "sms_notice":
        return styles.event;
      case "newsletter":
        return styles.newsletterStyle;
      default:
        return styles.normal;
    }
  };

  return (
    <div className={styles.feedContainer}>
      
      {/* SECTION 1: COMMUNITY ALERTS STREAM WITH THE '+' POST BUTTON */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 className={styles.feedTitle} style={{ margin: 0 }}>🚨 Community Alerts & Notices</h3>
          <button 
            onClick={() => setShowCreateModal(true)}
            className={styles.socialActionBtn}
            style={{ background: "#2ecc71", color: "white", border: "none", fontWeight: "700" }}
          >
            ➕ Post Alert
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className={styles.announcementCard} style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
            <p style={{ margin: 0 }}>No active community alerts right now.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={`alert-${alert.id}`} className={styles.announcementCard} style={{ borderLeft: "6px solid #f59e0b", marginBottom: "12px" }}>
              <div className={styles.cardHeader}>
                <span style={{ fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", background: "#fef3c7", color: "#b45309", padding: "4px 10px", borderRadius: "20px" }}>
                  {alert.category}
                </span>
                <span className={styles.date}>
                  {new Date(alert.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ marginTop: "10px" }}>{alert.content}</p>
              
              {alert.image_url && (
                <div style={{ marginTop: "10px", borderRadius: "8px", overflow: "hidden", maxHeight: "200px" }}>
                  <a href={alert.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={alert.image_url} alt="Alert attachment" style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }} />
                  </a>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", fontSize: "0.8rem", color: "#64748b" }}>
                <span>Posted by {alert.author}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SECTION 2: OFFICIAL BOARD ANNOUNCEMENTS & STREAM (WITH COLOR-CODED SPINES RESTORED) */}
      <div>
        <h3 className={styles.feedTitle}>💬 Neighborhood Stream & Updates</h3>
        {notifications.length === 0 ? (
          <div className={styles.announcementCard} style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
            <p style={{ margin: 0 }}>No neighborhood updates posted yet.</p>
          </div>
        ) : (
          notifications.map((item) => {
            const itemReactions = reactions[item.id] || {};
            const itemComments = comments[item.id] || [];
            const isCommentOpen = commentsOpen[item.id];
            const isPickerOpen = activePicker === item.id;

            return (
              <div 
                key={`notif-${item.id}`} 
                className={`${styles.announcementCard} ${getPriorityClass(item.channel_type)}`}
                style={{ marginBottom: "12px" }}
              >
                <div className={styles.cardHeader}>
                  <h4>{item.title}</h4>
                  <span className={styles.date}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p>{item.message || item.content}</p>

                {/* Live Comment Stream Render */}
                {itemComments.length > 0 && (
                  <div className={styles.commentsSection}>
                    {itemComments.map((c, idx) => (
                      <div key={idx} className={styles.commentBubble}>
                        <span><strong className={styles.commentAuthor}>{c.author}:</strong> {c.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reactions & Reply Action Bar */}
                <div className={styles.reactionsContainer}>
                  {Object.entries(itemReactions).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      className={`${styles.reactionBadge} ${data.reactedByMe ? styles.active : ""}`}
                      onClick={() => handleEmojiClick(item.id, emoji)}
                    >
                      <span>{emoji}</span>
                      <span>{data.count}</span>
                    </button>
                  ))}

                  <div style={{ position: "relative" }}>
                    <button
                      className={styles.addReactionBtn}
                      onClick={() => setActivePicker(isPickerOpen ? null : item.id)}
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
                            onClick={() => handleEmojiClick(item.id, emoji)}
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
                    onClick={() =>
                      setCommentsOpen((prev) => ({ ...prev, [item.id]: !isCommentOpen }))
                    }
                  >
                    💬 Reply
                  </button>
                </div>

                {/* Expandable Comment Input */}
                {isCommentOpen && (
                  <div className={styles.commentInputWrapper}>
                    <input
                      type="text"
                      placeholder="Write a neighborly reply... (Press Enter)"
                      className={styles.commentInput}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddComment(item.id, e.target.value);
                          e.target.value = "";
                          setCommentsOpen((prev) => ({ ...prev, [item.id]: false }));
                        }
                        if (e.key === "Escape") {
                          setCommentsOpen((prev) => ({ ...prev, [item.id]: false }));
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal to Post New Alert Right From Alerts Section */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>🚨 Post Community Alert</h3>
            <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "5px" }}>Share a community alert with your neighbors</p>
            <form onSubmit={handleCreateAlertSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Category</label>
                <select
                  value={newAlertCategory}
                  onChange={(e) => setNewAlertCategory(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px" }}
                >
                  <option value="Lost Pet">🐾 Lost / Found Pet</option>
                  <option value="Traffic / Party">🎉 Block Party / Traffic Warning</option>
                  <option value="Safety Alert">⚠️ Urgent Safety / Weather</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Details</label>
                <textarea
                  placeholder="Describe the notice details..."
                  value={newAlertContent}
                  onChange={(e) => setNewAlertContent(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", height: "90px", resize: "vertical", marginTop: "4px", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Attach Photo (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  style={{ width: "100%", marginTop: "4px", fontSize: "0.9rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" className={styles.socialActionBtn} style={{ flex: 1, justifyContent: "center", background: "#2ecc71", color: "white", border: "none" }} disabled={posting}>
                  {posting ? "Publishing..." : "Publish Instantly"}
                </button>
                <button type="button" className={styles.modalCloseBtn} style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}