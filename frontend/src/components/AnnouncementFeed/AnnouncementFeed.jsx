import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [news, setNews] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/announcements`)
      .then((res) => res.json())
      .then((data) => setNews(data))
      .catch((err) => console.error("Error fetching news:", err));
  }, [API_URL]);

  // Show only first 5 unless expanded
  const displayedNews = isExpanded ? news : news.slice(0, 5);

  return (
    <div className={styles.feedContainer}>
      <h3 className={styles.feedTitle}>Community Feed</h3>
      {displayedNews.map((item) => (
        <div
          key={item.id}
          className={`${styles.announcementCard} ${styles[item.priority]}`}
        >
          {/* ... existing card content ... */}
          <div className={styles.cardHeader}>
            <h4>{item.title}</h4>
            <span className={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
          <p>{item.content}</p>
        </div>
      ))}

      {news.length > 5 && (
        <button
          className={styles.expandBtn}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "Show Less" : `View All (${news.length})`}
        </button>
      )}
    </div>
  );
}
