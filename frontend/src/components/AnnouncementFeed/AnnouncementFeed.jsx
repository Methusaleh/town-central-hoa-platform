import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed({ showCreateModal, onCloseCreateModal }) {
  const [notifications, setNotifications] = useState([]);
  const [reactions, setReactions] = useState({}); 
  const [comments, setComments] = useState({}); // { [itemId]: [{ author, text }, ...] }
  const [activePicker, setActivePicker] = useState(null); 
  const [commentsOpen, setCommentsOpen] = useState({});
  const [activeReactorsModal, setActiveReactorsModal] = useState(null); 
  
  // State for creating a new alert right from the dashboard
  const [newAlertTitle, setNewAlertTitle] = useState("");
  const [newAlertContent, setNewAlertContent] = useState("");
  const [newAlertCategory, setNewAlertCategory] = useState("Lost Pet");
  const [posting, setPosting] = useState(false);

  const AVAILABLE_EMOJIS = ["👍", "❤️", "🎉", "💡", "⚠️"];
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/notifications`)
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Error fetching notifications:", err));
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
      const res = await fetch(`${API_URL}/api/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newAlertCategory,
          author: `${window.currentUserFirstName || "Resident"}`,
          content: newAlertContent.trim(),
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        setNotifications([newPost, ...notifications]);
        setNewAlertTitle("");
        setNewAlertContent("");
        onCloseCreateModal();
      }
    } catch (err) {
      console.error("Error posting alert:", err);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className={styles.feedContainer}>
      <h3 className={styles.feedTitle}>💬 Neighborhood Stream</h3>
      
      {notifications.map((item) => {
        const itemReactions = reactions[item.id] || {};
        const itemComments = comments[item.id] || [];
        const isCommentOpen = commentsOpen[item.id];
        const isPickerOpen = activePicker === item.id;

        return (
          <div key={item.id} className={styles.announcementCard}>
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

            {/* Expandable Comment Input (No pop-up alerts, saves directly) */}
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
      })}

      {/* Modal to Post New Alert Right From Dashboard */}
      {showCreateModal && (
        <div className={styles.modalBackdrop} onClick={onCloseCreateModal}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>🚨 Post Community Alert</h3>
            <form onSubmit={handleCreateAlertSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text"
                placeholder="Alert Title (e.g., Gate Maintenance)"
                value={newAlertTitle}
                onChange={(e) => setNewAlertTitle(e.target.value)}
                className={styles.commentInput}
                required
              />
              <textarea
                placeholder="Describe the alert details..."
                value={newAlertContent}
                onChange={(e) => setNewAlertContent(e.target.value)}
                style={{ ...styles.commentInput, height: "80px", resize: "vertical" }}
                required
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <button type="submit" className={styles.quickPayBtn} style={{ flex: 1 }}>Post Alert</button>
                <button type="button" className={styles.modalCloseBtn} style={{ flex: 1 }} onClick={onCloseCreateModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}