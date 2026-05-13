import { useEffect, useState } from "react";
import styles from "./AnnouncementFeed.module.css";

export default function AnnouncementFeed() {
  const [news, setNews] = useState([]);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/announcements`)
      .then((res) => res.json())
      .then((data) => setNews(data))
      .catch((err) => console.error("Error fetching news:", err));
  }, []);

  return (
    <div className={styles.feedContainer}>
      <h3 className={styles.feedTitle}>Community Feed</h3>
      {news.map((item) => (
        <div
          key={item.id}
          className={`${styles.announcementCard} ${styles[item.priority]}`}
        >
          <div className={styles.cardHeader}>
            <h4>{item.title}</h4>
            <span className={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}
            </span>
          </div>
          <p>{item.content}</p>
        </div>
      ))}
    </div>
  );
}
