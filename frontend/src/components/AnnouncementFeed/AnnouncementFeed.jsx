import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [reactions, setReactions] = useState({});
  const [activePicker, setActivePicker] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [replyInputs, setReplyInputs] = useState({});

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

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch(`${API_URL}/api/announcements`);
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
        
        const map = {};
        (data.comments || []).forEach(c => {
          if (!map[c.announcement_id]) map[c.announcement_id] = [];
          map[c.announcement_id].push(c);
        });
        setCommentsMap(map);
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [API_URL]);

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

  const handleAddComment = async (announcementId) => {
    const text = replyInputs[announcementId];
    if (!text?.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/announcements/${announcementId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: user?.first_name || "Resident",
          content: text.trim()
        })
      });

      if (res.ok) {
        setReplyInputs({ ...replyInputs, [announcementId]: "" });
        fetchAnnouncements();
      }
    } catch (err) {
      console.error("Error posting comment:", err);
    }
  };

  const handleModerate = async () => {
    if (!modModalId) return;
    try {
      const res = await fetch(`${API_URL}/api/announcements/${modModalId}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removal_reason: removalReason }),
      });

      if (res.ok) {
        setModModalId(null);
        fetchAnnouncements();
      } else {
        alert("Moderation action failed.");
      }
    } catch (err) {
      console.error("Moderation network error:", err);
    }
  };

  return (
    <div className={styles.feedContainer}>
      <h3 className={styles.feedTitle}>📌 Official Announcements & Neighborhood Feed</h3>

      {announcements.length === 0 ? (
        <div className={styles.announcementCard} style={{ textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
          <p style={{ margin: 0 }}>No announcements posted yet.</p>
        </div>
      ) : (
        announcements.map((item) => {
          const itemReactions = reactions[item.id] || {};
          const itemComments = commentsMap[item.id] || [];
          const isCommentOpen = commentsOpen[item.id];
          const isPickerOpen = activePicker === item.id;

          return (
            <div 
              key={`announcement-${item.id}`} 
              className={`${styles.announcementCard} ${item.is_sticky ? styles.stickyCard : ""}`}
              style={{ marginBottom: "16px" }}
            >
              <div className={styles.cardHeader}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {item.is_sticky && (
                    <span className={styles.stickyBadge}>📌 Pinned Announcement</span>
                  )}
                  <h4>{item.title}</h4>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className={styles.date}>{new Date(item.created_at).toLocaleDateString()}</span>
                  {isAdmin && !item.is_removed && (
                    <button onClick={() => setModModalId(item.id)} className={styles.removeBtn}>🛡️ Remove</button>
                  )}
                </div>
              </div>

              <p className={item.is_removed ? styles.removedText : ""}>{item.content}</p>

              {item.image_url && !item.is_removed && (
                <div style={{ marginTop: "12px", borderRadius: "12px", overflow: "hidden", maxHeight: "250px" }}>
                  <a href={item.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={item.image_url} alt="Announcement attachment" style={{ width: "100%", maxHeight: "250px", objectFit: "cover" }} />
                  </a>
                </div>
              )}

              {item.removal_reason && (
                <div className={styles.removalNotice}>
                  ⚠️ Removal Reason: {item.removal_reason}
                </div>
              )}

              {/* COMMENTS STREAM */}
              {itemComments.length > 0 && (
                <div className={styles.commentsSection}>
                  {itemComments.map((c, idx) => (
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
                  onClick={() => setCommentsOpen((prev) => ({ ...prev, [item.id]: !isCommentOpen }))}
                >
                  💬 Reply
                </button>
              </div>

              {/* EXPANDABLE COMMENT INPUT */}
              {isCommentOpen && !item.is_removed && (
                <div className={styles.commentInputWrapper}>
                  <input
                    type="text"
                    placeholder="Write a reply... (Press Enter)"
                    value={replyInputs[item.id] || ""}
                    onChange={(e) => setReplyInputs({ ...replyInputs, [item.id]: e.target.value })}
                    className={styles.commentInput}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAddComment(item.id);
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

      {/* ADMIN REMOVAL MODAL */}
      {modModalId && (
        <div className={styles.modalBackdrop} onClick={() => setModModalId(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>🛡️ Moderate Announcement</h3>
            <p>Select a stock reason for removing this announcement:</p>
            
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