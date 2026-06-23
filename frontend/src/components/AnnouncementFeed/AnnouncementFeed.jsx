import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [notifications, setNotifications] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    // Repointed from /api/announcements to our new notification engine path
    fetch(`${API_URL}/api/notifications`)
      .then((res) => res.json())
      .then((data) => setNotifications(data))
      .catch((err) => console.error("Error fetching notifications:", err));
  }, [API_URL]);

  // Show only first 5 unless expanded
  const displayedNotifications = isExpanded ? notifications : notifications.slice(0, 5);

  // Helper function to dynamically map database channel_types to our styling borders
  const getPriorityClass = (channelType) => {
    switch (channelType) {
      case "critical_email":
        return styles.urgent; // Red highlight border
      case "sms_notice":
        return styles.event;  // Blue highlight border
      case "newsletter":
        return styles.newsletterStyle; // Secondary dark gray styling
      default:
        return styles.normal; // Standard emerald green border
    }
  };

  return (
    <div className={styles.feedContainer}>
      <h3 className={styles.feedTitle}>Community Feed</h3>
      {displayedNotifications.map((item) => (
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
          <p>{item.message || item.content}</p> {/* Fallback safety for column key matching */}
        </div>
      ))}

      {notifications.length > 5 && (
        <button
          className={styles.expandBtn}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show Less" : `View All (${notifications.length})`}
        </button>
      )}
    </div>
  );
}