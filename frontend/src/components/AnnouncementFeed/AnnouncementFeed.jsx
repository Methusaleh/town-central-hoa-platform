import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [notifications, setNotifications] = useState([]);
  const [reactions, setReactions] = useState({}); // { [itemId]: { '👍': { count: 1, users: ['Aaron'] }, ... } }
  const [activePicker, setActivePicker] = useState(null); // Tracks item ID for open emoji popover
  const [commentsOpen, setCommentsOpen] = useState({});
  const [activeReactorsModal, setActiveReactorsModal] = useState(null); // { itemId, emoji }
  
  const AVAILABLE_EMOJIS = ["👍", "❤️", "🎉", "💡", "⚠️"];
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/notifications`)
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Error fetching notifications:", err));
  }, [API_URL]);

  const handleEmojiClick = (itemId, emoji, userName = "Current Resident") => {
    setReactions((prev) => {
      const itemReactions = prev[itemId] || {};
      const emojiData = itemReactions[emoji] || { count: 0, users: [], reactedByMe: false };
      
      const alreadyReacted = emojiData.reactedByMe;
      const newUsers = alreadyReacted
        ? emojiData.users.filter((u) => u !== userName)
        : [...emojiData.users, userName];
      
      const newCount = emojiData.count + (alreadyReacted ? -1 : 1);

      // If count drops to 0, remove that emoji key entirely
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
      <h3 className={styles.feedTitle}>💬 Neighborhood Stream</h3>
      {notifications.map((item) => {
        const itemReactions = reactions[item.id] || {};
        const isCommentOpen = commentsOpen[item.id];
        const isPickerOpen = activePicker === item.id;

        return (
          <div
            key={item.id}
            className={`${styles.announcementCard} ${getPriorityClass(item.channel_type)}`}
          >
            <div className={styles.cardHeader}>
              <h4>{item.title}</h4>
              <span className={styles.date}>
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
            <p>{item.message || item.content}</p>

            {/* Reactions & Reply Action Bar */}
            <div className={styles.reactionsContainer}>
              {/* Render active reaction badges */}
              {Object.entries(itemReactions).map(([emoji, data]) => (
                <button
                  key={emoji}
                  className={`${styles.reactionBadge} ${data.reactedByMe ? styles.active : ""}`}
                  onClick={() => handleEmojiClick(item.id, emoji)}
                  title={`Clicked by: ${data.users.join(", ")}`}
                >
                  <span>{emoji}</span>
                  <span>{data.count}</span>
                </button>
              ))}

              {/* Add Reaction Button & Popover */}
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

            {/* Expandable Comment Box with Auto-Close functionality */}
            {isCommentOpen && (
              <div className={styles.commentInputWrapper}>
                <input
                  type="text"
                  placeholder="Write a neighborly reply (Press Escape or click away to close)..."
                  className={styles.commentInput}
                  autoFocus
                  onBlur={() => {
                    setTimeout(() => {
                      setCommentsOpen((prev) => ({ ...prev, [item.id]: false }));
                    }, 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      alert(`Reply posted: "${e.target.value}"`);
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
    </div>
  );
}