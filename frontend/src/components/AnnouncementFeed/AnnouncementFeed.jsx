import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";
import { apiFetch } from "../../api";

export default function AnnouncementFeed({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [commentsMap, setCommentsMap] = useState({});
  const [reactions, setReactions] = useState({});
  const [activePicker, setActivePicker] = useState(null);
  const [commentsOpen, setCommentsOpen] = useState({});
  const [replyInputs, setReplyInputs] = useState({});

  // Board Announcement Creation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [channelType, setChannelType] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [isSticky, setIsSticky] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [gifUrl, setGifUrl] = useState("");
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
  const isAdmin = user?.role === "board_member" || user?.role === "super_admin";

  const fetchAnnouncements = async () => {
    try {
      const res = await apiFetch("/api/announcements");
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
  }, []);

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    setPosting(true);
    try {
      const formData = new FormData();
      formData.append("title", newTitle.trim());
      formData.append("content", newContent.trim());
      formData.append("channel_type", channelType);
      formData.append("priority", priority);
      formData.append("is_sticky", isSticky);
      if (selectedFile) formData.append("image", selectedFile);
      if (gifUrl) formData.append("image_url", gifUrl);

      const res = await apiFetch("/api/announcements", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setChannelType("general");
        setPriority("normal");
        setIsSticky(false);
        setSelectedFile(null);
        setGifUrl("");
        setShowCreateModal(false);
        fetchAnnouncements();
      } else {
        alert("Failed to post announcement.");
      }
    } catch (err) {
      console.error("Network error posting announcement:", err);
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

  const handleAddComment = async (announcementId) => {
    const text = replyInputs[announcementId];
    if (!text?.trim()) return;

    try {
      const res = await apiFetch(`/api/announcements/${announcementId}/comments`, {
        method: "POST",
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
      const res = await apiFetch(`/api/announcements/${modModalId}/moderate`, {
        method: "PATCH",
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 className={styles.feedTitle} style={{ margin: 0 }}>📌 Official Announcements & Neighborhood Feed</h3>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className={styles.socialActionBtn}
            style={{ background: "#2ecc71", color: "white", border: "none", fontWeight: "700" }}
          >
            ➕ Post Announcement
          </button>
        )}
      </div>

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
              style={{ marginBottom: "16px", borderLeft: item.is_sticky ? "6px solid #eab308" : "6px solid #10b981" }}
            >
              <div className={styles.cardHeader}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {item.is_sticky && (
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", background: "#fef08a", color: "#854d0e", padding: "4px 10px", borderRadius: "20px" }}>
                      📌 Pinned Announcement
                    </span>
                  )}
                  <h4>{item.title}</h4>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className={styles.date}>{new Date(item.created_at).toLocaleDateString()}</span>
                  {isAdmin && !item.is_removed && (
                    <button onClick={() => setModModalId(item.id)} className={styles.removeBtn} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "600", fontSize: "0.8rem" }}>🛡️ Remove</button>
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

      {/* BOARD ANNOUNCEMENT CREATION MODAL */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>📌 Post Official Announcement</h3>
            <form onSubmit={handleCreateAnnouncement} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Title</label>
                <input 
                  type="text" 
                  placeholder="Announcement Title..." 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", boxSizing: "border-box" }}
                  required 
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Channel Type</label>
                  <select 
                    value={channelType} 
                    onChange={(e) => setChannelType(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", background: "white" }}
                  >
                    <option value="general">General Feed Post</option>
                    <option value="critical_email">Critical Email Alert</option>
                    <option value="sms_notice">SMS Notice</option>
                    <option value="newsletter">Newsletter Archive</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Priority</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", background: "white" }}
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0" }}>
                <input 
                  type="checkbox" 
                  id="modalSticky" 
                  checked={isSticky} 
                  onChange={(e) => setIsSticky(e.target.checked)} 
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <label htmlFor="modalSticky" style={{ cursor: "pointer", fontSize: "0.85rem", fontWeight: "600", color: "#1e293b" }}>
                  📌 Pin to top of feed (Sticky Announcement)
                </label>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Content Details</label>
                <textarea
                  placeholder="Type announcement details..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", height: "100px", resize: "vertical", marginTop: "4px", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Attach Image / GIF (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  style={{ width: "100%", marginTop: "4px", fontSize: "0.85rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" className={styles.socialActionBtn} style={{ flex: 1, justifyContent: "center", background: "#2ecc71", color: "white", border: "none" }} disabled={posting}>
                  {posting ? "Publishing..." : "Publish Announcement"}
                </button>
                <button type="button" className={styles.modalCloseBtn} style={{ flex: 1 }} onClick={() => setShowCreateModal(false)}>
                  Cancel
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