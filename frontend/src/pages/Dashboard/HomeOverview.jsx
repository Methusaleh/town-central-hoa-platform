import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { countUnseen, readFeedCursors } from "../../utils/feedCursors";
import { usePortal } from "../../layout/PortalContext";
import { HOME_OPEN_PATHS, PATHS } from "../../layout/navConfig";
import { apiFetch } from "../../api";
import styles from "./HomeOverview.module.css";

function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function clip(text, max = 110) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function formatUtcYmd(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTodayYmd() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

function eventParts(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return { month: "—", day: "–" };
  return {
    month: d.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
    day: String(d.getUTCDate()),
  };
}

function formatEventTime(timeStr) {
  if (!timeStr) return "All day";
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

function relativeTime(dateInput) {
  if (!dateInput) return "";
  const then = new Date(dateInput).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateInput).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function alertMeta(category) {
  if (category === "Lost Pet") return { tone: "pet" };
  if (category === "Traffic / Party") return { tone: "party" };
  if (category === "Safety Alert") return { tone: "safety" };
  return { tone: "default" };
}

function announcementTone(item) {
  if (item?.priority === "urgent" || item?.channel_type === "urgent") return "urgent";
  if (item?.channel_type === "event") return "event";
  if (item?.is_sticky) return "sticky";
  return "normal";
}

function upcomingFrom(events) {
  const today = localTodayYmd();
  return (Array.isArray(events) ? events : [])
    .filter((event) => formatUtcYmd(event.event_date) >= today)
    .sort((a, b) => formatUtcYmd(a.event_date).localeCompare(formatUtcYmd(b.event_date)));
}

export default function HomeOverview() {
  const { user } = usePortal();
  const navigate = useNavigate();
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    apiFetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setRecentAlerts(Array.isArray(data.alerts) ? data.alerts : []))
      .catch((err) => console.error("Alerts preview fetch error:", err));

    apiFetch("/api/porch")
      .then((res) => res.json())
      .then((data) => setRecentPosts(Array.isArray(data.posts) ? data.posts : []))
      .catch((err) => console.error("Porch preview fetch error:", err));

    apiFetch("/api/announcements")
      .then((res) => res.json())
      .then((data) =>
        setRecentAnnouncements(Array.isArray(data.announcements) ? data.announcements : []),
      )
      .catch((err) => console.error("Announcements preview fetch error:", err));

    apiFetch("/api/events")
      .then((res) => res.json())
      .then((data) => setRecentEvents(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Events preview fetch error:", err));
  }, []);

  const open = (key) => navigate(HOME_OPEN_PATHS[key]);
  const now = new Date();
  const hour = now.getHours();
  const greeting = greetingForHour(hour);
  const upcoming = upcomingFrom(recentEvents);
  const upcomingPreview = upcoming.slice(0, 4);
  const featured = recentAnnouncements[0] || null;
  const moreAnnouncements = recentAnnouncements.slice(1, 3);
  const cursors = readFeedCursors(user?.id);
  const newAnnouncements = countUnseen(recentAnnouncements, cursors.announcements);
  const newAlerts = countUnseen(recentAlerts, cursors.alerts);
  const newPosts = countUnseen(recentPosts, cursors.porch);

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{dateLabel}</p>
          <h2>
            {greeting}, {user?.first_name || "neighbor"}
          </h2>
          <p className={styles.lede}>
            Neighborhood news, calendar, alerts, and conversation — in one place.
          </p>
        </div>
        <div className={styles.pulseRow}>
          <button type="button" className={`${styles.pulse} ${styles.pulseEvents}`} onClick={() => open("events")}>
            <strong>{upcoming.length}</strong>
            <span>Upcoming events</span>
          </button>
          <button
            type="button"
            className={`${styles.pulse} ${styles.pulseNews} ${newAnnouncements ? styles.pulseHot : ""}`}
            onClick={() => open("announcements")}
          >
            <strong>{newAnnouncements}</strong>
            <span>New announcements</span>
          </button>
          <button
            type="button"
            className={`${styles.pulse} ${styles.pulseAlerts} ${newAlerts ? styles.pulseHot : ""}`}
            onClick={() => open("alerts")}
          >
            <strong>{newAlerts}</strong>
            <span>New alerts</span>
          </button>
          <button
            type="button"
            className={`${styles.pulse} ${styles.pulseChat} ${newPosts ? styles.pulseHot : ""}`}
            onClick={() => open("porch")}
          >
            <strong>{newPosts}</strong>
            <span>New Porch posts</span>
          </button>
        </div>
      </section>

      <div className={styles.bento}>
        <article className={`${styles.tile} ${styles.newsTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <p className={styles.kicker}>Announcements</p>
              <h3>From the board</h3>
            </div>
            <button type="button" className={styles.openLink} onClick={() => open("announcements")}>
              See all
            </button>
          </header>

          {featured ? (
            <button
              type="button"
              className={`${styles.featured} ${styles[announcementTone(featured)]}`}
              onClick={() => navigate(`${PATHS.announcements}/${featured.id}`)}
            >
              {featured.image_url && (
                <img src={featured.image_url} alt="" className={styles.featuredImg} />
              )}
              <div className={styles.featuredBody}>
                <div className={styles.metaRow}>
                  {featured.is_sticky && <span className={styles.pin}>Pinned</span>}
                  <span className={styles.time}>{relativeTime(featured.created_at)}</span>
                </div>
                <h4>{featured.title}</h4>
                <p>{clip(featured.content, 160)}</p>
              </div>
            </button>
          ) : (
            <p className={styles.empty}>The board hasn’t posted lately. Check back soon.</p>
          )}

          {moreAnnouncements.length > 0 && (
            <ul className={styles.stack}>
              {moreAnnouncements.map((item) => (
                <li key={item.id}>
                  <button type="button" className={styles.stackItem} onClick={() => navigate(`${PATHS.announcements}/${item.id}`)}>
                    <span className={styles.stackTitle}>{item.title}</span>
                    <span className={styles.time}>{relativeTime(item.created_at)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className={`${styles.tile} ${styles.eventsTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <p className={styles.kicker}>Events</p>
              <h3>Coming up</h3>
            </div>
            <button type="button" className={styles.openLink} onClick={() => open("events")}>
              See all
            </button>
          </header>

          {upcoming.length === 0 ? (
            <p className={styles.empty}>Nothing on the books yet. The calendar is wide open.</p>
          ) : (
            <ul className={styles.eventList}>
              {upcomingPreview.map((event) => {
                const parts = eventParts(event.event_date);
                return (
                  <li key={event.id}>
                    <button type="button" className={styles.eventRow} onClick={() => navigate(`${PATHS.events}/${event.id}`)}>
                      <div className={styles.dateBlock} aria-hidden="true">
                        <span>{parts.month}</span>
                        <strong>{parts.day}</strong>
                      </div>
                      <div className={styles.eventCopy}>
                        <h4>{event.title}</h4>
                        <p>
                          {formatEventTime(event.event_time)}
                          {event.location ? ` · ${event.location}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className={`${styles.tile} ${styles.alertsTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <p className={styles.kicker}>Alerts</p>
              <h3>Need-to-know</h3>
            </div>
            <button type="button" className={styles.openLink} onClick={() => open("alerts")}>
              See all
            </button>
          </header>

          {recentAlerts.length === 0 ? (
            <p className={styles.empty}>All clear on the block. No active alerts.</p>
          ) : (
            <ul className={styles.alertList}>
              {recentAlerts.slice(0, 4).map((alert) => {
                const meta = alertMeta(alert.category);
                return (
                  <li key={alert.id}>
                    <button type="button" className={styles.alertRow} onClick={() => navigate(`${PATHS.alerts}/${alert.id}`)}>
                      <span className={`${styles.tag} ${styles[meta.tone]}`}>
                        {alert.category}
                      </span>
                      <p>{clip(alert.content, 92)}</p>
                      <span className={styles.time}>{relativeTime(alert.created_at)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className={`${styles.tile} ${styles.chatTile}`}>
          <header className={styles.tileHeader}>
            <div>
              <p className={styles.kicker}>The Porch</p>
              <h3>What's happening</h3>
            </div>
            <button type="button" className={styles.openLink} onClick={() => open("porch")}>
              Join in
            </button>
          </header>

          {recentPosts.length === 0 ? (
            <p className={styles.empty}>Quiet porch so far. Be the first to say hello.</p>
          ) : (
            <ul className={styles.chatList}>
              {recentPosts.slice(0, 4).map((post) => (
                <li key={post.id}>
                  <button type="button" className={styles.chatRow} onClick={() => navigate(`${PATHS.porch}/${post.id}`)}>
                    <div className={styles.avatar} aria-hidden="true">
                      {(post.author_name || "R").charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.chatCopy}>
                      <div className={styles.chatMeta}>
                        <strong>{post.author_name || "Neighbor"}</strong>
                        <span className={styles.time}>{relativeTime(post.created_at)}</span>
                      </div>
                      <p>{clip(post.content, 88) || (post.image_url ? "Shared a photo" : "")}</p>
                    </div>
                    {post.image_url && <img src={post.image_url} alt="" className={styles.thumb} />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
