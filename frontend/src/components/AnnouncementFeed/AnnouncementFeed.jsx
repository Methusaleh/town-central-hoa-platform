import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [notifications, setNotifications] = useState([]);
  const [likes, setLikes] = useState({});
  const [commentsOpen, setCommentsOpen] = useState({});
  const [activeLikesModal, setActiveLikesModal] = useState(null); // Tracks item ID for the modal
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/notifications`)
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Error fetching notifications:", err));
  }, [API_URL]);

  const toggleLike = (id, userName = "Current Resident") => {
    setLikes((prev) => {
      const current = prev[id] || { count: 0, liked: false, users: [] };
      const alreadyLiked = current.liked;
      
      const newUsers = alreadyLiked
        ? current.users.filter((u) => u !== userName)
        : [...current.users, userName];

      return {
        ...prev,
        [id]: {
          count: current.count + (alreadyLiked ? -1 : 1),
          liked: !alreadyLiked,
          users: newUsers,
        },
      };
    });
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
        const itemLike = likes[item.id] || { count: 0, liked: false, users: [] };
        const isCommentOpen = commentsOpen[item.id];

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
                ❤️ {itemLike.liked ? "Liked" : "Like"}
              </button>

              {itemLike.count > 0 && (
                <button
                  className={styles.likesCountBtn}
                  onClick={() => setActiveLikesModal(item.id)}
                >
                  {itemLike.count} {itemLike.count === 1 ? "person" : "people"} liked this
                </button>
              )}

              <button
                className={`${styles.socialActionBtn} ${isCommentOpen ? styles.liked : ""}`}
                style={{ marginLeft: itemLike.count === 0 ? "auto" : "0" }}
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
                    // Small delay to allow clicking send or interacting if needed
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

      {/* Likes Modal */}
      {activeLikesModal && (
        <div className={styles.modalBackdrop} onClick={() => setActiveLikesModal(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>Liked by</h3>
            <ul className={styles.likesList}>
              {(likes[activeLikesModal]?.users || []).map((user, idx) => (
                <li key={idx} className={styles.likesListItem}>
                  👤 {user}
                </li>
              ))}
            </ul>
            <button className={styles.modalCloseBtn} onClick={() => setActiveLikesModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}