import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [notifications, setNotifications] = useState([]);
  const [likes, setLikes] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/notifications`)
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Error fetching notifications:", err));
  }, [API_URL]);

  const toggleLike = (id) => {
    setLikes((prev) => ({
      ...prev,
      [id]: {
        count: (prev[id]?.count || 0) + (prev[id]?.liked ? -1 : 1),
        liked: !prev[id]?.liked,
      },
    }));
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
        const itemLike = likes[item.id] || { count: 0, liked: false };
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

            {/* Social Interaction Buttons */}
            <div className={styles.socialActionsBar}>
              <button
                className={`${styles.socialActionBtn} ${itemLike.liked ? styles.liked : ""}`}
                onClick={() => toggleLike(item.id)}
              >
                ❤️ {itemLike.count > 0 ? `${itemLike.count} Likes` : "Like"}
              </button>
              <button
                className={styles.socialActionBtn}
                onClick={() =>
                  setCommentsOpen((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                }
              >
                💬 Reply / Comment
              </button>
            </div>

            {/* Expandable Comment Box */}
            {commentsOpen[item.id] && (
              <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="Write a neighborly reply..."
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      alert(`Reply posted: "${e.target.value}"`);
                      e.target.value = "";
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