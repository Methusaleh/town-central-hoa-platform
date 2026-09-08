import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  ChevronRight,
  ClipboardList,
  Mail,
  MapPin,
  Wallet,
  Waves,
} from "lucide-react";
import Button from "../../components/ui/Button";
import { countUnseen, readFeedCursors } from "../../utils/feedCursors";
import { usePortal } from "../../layout/PortalContext";
import { PATHS } from "../../layout/navConfig";
import { apiFetch } from "../../api";
import {
  coverFor,
  eventDateParts,
  formatEventDate,
  formatEventTime,
  formatUtcYmd,
  typeMeta,
} from "../../components/Events/eventTypes";
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

function localTodayYmd() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
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

function announcementTone(item) {
  if (item?.priority === "urgent" || item?.channel_type === "urgent") return "urgent";
  if (item?.channel_type === "event") return "event";
  if (item?.is_sticky) return "sticky";
  return "normal";
}

function money(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "$0.00";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function upcomingFrom(events) {
  const today = localTodayYmd();
  return (Array.isArray(events) ? events : [])
    .filter((event) => formatUtcYmd(event.event_date) >= today)
    .sort((a, b) => formatUtcYmd(a.event_date).localeCompare(formatUtcYmd(b.event_date)));
}

function buildTodayLine({ featured, newPosts, newAlerts, newAnnouncements, dues }) {
  const bits = [];
  if (featured) {
    bits.push(`${featured.title} · ${formatEventDate(featured.event_date)}`);
  }
  if (newPosts) bits.push(`${newPosts} new on The Porch`);
  if (newAlerts) bits.push(`${newAlerts} active alert${newAlerts === 1 ? "" : "s"}`);
  if (newAnnouncements) bits.push(`${newAnnouncements} from the board`);
  if (Number(dues?.balance) > 0 && Number(dues?.days_past_due) > 0) {
    bits.push(`Your dues are ${dues.days_past_due} day${Number(dues.days_past_due) === 1 ? "" : "s"} past due`);
  } else if (Number(dues?.balance) > 0) {
    bits.push(`Balance due ${money(dues.balance)}`);
  } else if (dues && (dues.status === "Paid" || Number(dues.balance) === 0)) {
    bits.push("Dues are current");
  }
  if (!bits.length) {
    return "You’re caught up. Say hello on The Porch, or see what’s coming up.";
  }
  return bits.slice(0, 3).join("  ·  ");
}

const GO_TO = [
  { to: PATHS.dues, label: "My dues", hint: "Balance and how to pay", icon: Wallet },
  { to: PATHS.contact, label: "Contact the board", hint: "Write the board", icon: Mail },
  { to: PATHS.maintenance, label: "ARC & maintenance", hint: "Submit a request", icon: ClipboardList },
  { to: PATHS.amenities, label: "Pool & clubhouse", hint: "Coming soon — not open yet", icon: Waves },
];

export default function HomeOverview() {
  const { user } = usePortal();
  const navigate = useNavigate();
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [dues, setDues] = useState(null);
  const [rsvping, setRsvping] = useState(false);

  useEffect(() => {
    apiFetch("/api/alerts")
      .then((res) => res.json())
      .then((data) =>
        setRecentAlerts(
          (Array.isArray(data.alerts) ? data.alerts : []).filter(
            (item) => !item.is_removed && !item.resolved_at,
          ),
        ),
      )
      .catch((err) => console.error("Alerts preview fetch error:", err));

    apiFetch("/api/porch")
      .then((res) => res.json())
      .then((data) =>
        setRecentPosts((Array.isArray(data.posts) ? data.posts : []).filter((item) => !item.is_removed)),
      )
      .catch((err) => console.error("Porch preview fetch error:", err));

    apiFetch("/api/announcements")
      .then((res) => res.json())
      .then((data) =>
        setRecentAnnouncements(Array.isArray(data.announcements) ? data.announcements : []),
      )
      .catch((err) => console.error("Announcements preview fetch error:", err));

    apiFetch("/api/events")
      .then((res) => res.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Events preview fetch error:", err));
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    apiFetch(`/api/dues/${encodeURIComponent(user.email)}`)
      .then((res) => res.json())
      .then((data) => setDues(data && !data.error ? data : null))
      .catch((err) => console.error("Dues preview fetch error:", err));
  }, [user?.email]);

  const now = new Date();
  const greeting = greetingForHour(now.getHours());
  const upcoming = upcomingFrom(events);
  const featured = upcoming[0] || null;
  const moreEvents = upcoming.slice(1, 4);
  const featuredAnnouncement = recentAnnouncements[0] || null;
  const moreAnnouncements = recentAnnouncements.slice(1, 4);
  const activeAlert = recentAlerts[0] || null;
  const porchPreview = recentPosts.slice(0, 3);
  const cursors = readFeedCursors(user?.id);
  const newAnnouncements = countUnseen(recentAnnouncements, cursors.announcements);
  const newAlerts = countUnseen(recentAlerts, cursors.alerts);
  const newPosts = countUnseen(recentPosts, cursors.porch);
  const todayLine = useMemo(
    () =>
      buildTodayLine({
        featured,
        newPosts,
        newAlerts,
        newAnnouncements,
        dues,
      }),
    [featured, newPosts, newAlerts, newAnnouncements, dues],
  );

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const openPorchCompose = () => navigate(PATHS.porch, { state: { compose: true } });

  const toggleRsvp = async (event) => {
    if (!event || rsvping) return;
    setRsvping(true);
    setEvents((current) =>
      current.map((item) =>
        item.id === event.id
          ? {
              ...item,
              going: !item.going,
              rsvp_count: item.going
                ? Math.max(0, (item.rsvp_count || 0) - 1)
                : (item.rsvp_count || 0) + 1,
            }
          : item,
      ),
    );
    try {
      const res = await apiFetch(`/api/events/${event.id}/rsvp`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEvents((current) =>
          current.map((item) =>
            item.id === event.id
              ? {
                  ...item,
                  going: data.going,
                  rsvp_count: data.rsvp_count,
                }
              : item,
          ),
        );
      }
    } catch (err) {
      console.error("Home RSVP error:", err);
    } finally {
      setRsvping(false);
    }
  };

  const cover = featured ? coverFor(featured) : "";
  const featuredMeta = featured ? typeMeta(featured.event_type) : null;
  const featuredParts = featured ? eventDateParts(featured.event_date) : null;
  const duesPastDue = Number(dues?.balance) > 0 && Number(dues?.days_past_due) > 0;
  const duesDue = Number(dues?.balance) > 0;

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{dateLabel}</p>
        <h1>
          {greeting}, {user?.first_name || "neighbor"}
        </h1>
        <p className={styles.lede}>{todayLine}</p>
        <div className={styles.heroBar}>
          <div className={styles.heroActions}>
            <Button onClick={openPorchCompose}>Say hello on The Porch</Button>
            {featured && (
              <Button variant="secondary" className={styles.heroGhost} onClick={() => navigate(`${PATHS.events}/${featured.id}`)}>
                {featured.going ? "Your next event" : "See what’s next"}
              </Button>
            )}
          </div>
          <div className={styles.chips}>
            {newPosts > 0 && (
              <button type="button" className={styles.chip} onClick={() => navigate(PATHS.porch)}>
                {newPosts} new on The Porch
              </button>
            )}
            {newAnnouncements > 0 && (
              <button type="button" className={styles.chip} onClick={() => navigate(PATHS.announcements)}>
                {newAnnouncements} from the board
              </button>
            )}
            {newAlerts > 0 && (
              <button type="button" className={`${styles.chip} ${styles.chipAlert}`} onClick={() => navigate(PATHS.alerts)}>
                {newAlerts} alert{newAlerts === 1 ? "" : "s"}
              </button>
            )}
            {duesPastDue && (
              <button type="button" className={`${styles.chip} ${styles.chipWarn}`} onClick={() => navigate(PATHS.dues)}>
                Dues past due
              </button>
            )}
          </div>
        </div>
      </section>

      {activeAlert && (
        <button
          type="button"
          className={styles.alertBanner}
          onClick={() => navigate(`${PATHS.alerts}/${activeAlert.id}`)}
        >
          <Bell size={16} />
          <span>
            <strong>{activeAlert.category || "Alert"}</strong>
            {clip(activeAlert.content, 88)}
          </span>
          <ChevronRight size={16} />
        </button>
      )}

      {featured && (
        <article className={`${styles.feature} ${cover ? styles.featurePhoto : styles.featurePlain}`}>
          {cover ? (
            <button
              type="button"
              className={styles.featureMedia}
              onClick={() => navigate(`${PATHS.events}/${featured.id}`)}
            >
              <img src={cover} alt="" />
              <div className={styles.featureDate} aria-hidden="true">
                <span>{featuredParts.month}</span>
                <strong>{featuredParts.day}</strong>
              </div>
            </button>
          ) : (
            <div className={styles.featureRail} aria-hidden="true">
              <span>{featuredParts.month}</span>
              <strong>{featuredParts.day}</strong>
            </div>
          )}
          <div className={styles.featureBody}>
            <p className={styles.kicker}>{featuredMeta?.kicker || "Coming up"}</p>
            <h2>{featured.title}</h2>
            <p className={styles.featureMeta}>
              {formatEventTime(featured.event_time)}
              {featured.location ? (
                <>
                  <MapPin size={14} />
                  {featured.location}
                </>
              ) : null}
            </p>
            <p className={styles.featureGoing}>
              {featured.rsvp_count
                ? `${featured.rsvp_count} neighbor${featured.rsvp_count === 1 ? "" : "s"} going`
                : "Be the first to RSVP"}
              {featured.going ? " · you’re in" : ""}
            </p>
            <div className={styles.featureActions}>
              <Button
                variant={featured.going ? "secondary" : "primary"}
                onClick={() => toggleRsvp(featured)}
                disabled={rsvping}
                aria-pressed={featured.going}
              >
                {featured.going && <Check size={16} strokeWidth={2.5} aria-hidden />}
                {featured.going ? featuredMeta?.rsvpDone : featuredMeta?.rsvp}
              </Button>
              <Button variant="secondary" onClick={() => navigate(`${PATHS.events}/${featured.id}`)}>
                Event details
              </Button>
            </div>
          </div>
        </article>
      )}

      <div className={styles.columns}>
        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <div>
              <p className={styles.kicker}>Events</p>
              <h3>Coming up</h3>
            </div>
            <button type="button" className={styles.openLink} onClick={() => navigate(PATHS.events)}>
              Full calendar
            </button>
          </header>
          {upcoming.length === 0 ? (
            <p className={styles.empty}>Nothing on the books yet. The calendar is wide open.</p>
          ) : (
            <ul className={styles.eventList}>
              {(featured ? moreEvents : upcoming.slice(0, 4)).map((event) => {
                const parts = eventDateParts(event.event_date);
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={styles.eventRow}
                      onClick={() => navigate(`${PATHS.events}/${event.id}`)}
                    >
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
                      <ChevronRight size={16} className={styles.rowChev} />
                    </button>
                  </li>
                );
              })}
              {featured && moreEvents.length === 0 && (
                <li className={styles.quiet}>That’s the next gathering. More dates will show up here.</li>
              )}
            </ul>
          )}
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHead}>
            <div>
              <p className={styles.kicker}>Announcements</p>
              <h3>From the board</h3>
            </div>
            <button type="button" className={styles.openLink} onClick={() => navigate(PATHS.announcements)}>
              See all
            </button>
          </header>
          {featuredAnnouncement ? (
            <>
              <button
                type="button"
                className={`${styles.featuredNote} ${styles[announcementTone(featuredAnnouncement)]}`}
                onClick={() => navigate(`${PATHS.announcements}/${featuredAnnouncement.id}`)}
              >
                {featuredAnnouncement.image_url && (
                  <img src={featuredAnnouncement.image_url} alt="" />
                )}
                <div>
                  <div className={styles.metaRow}>
                    {featuredAnnouncement.is_sticky && <span className={styles.pin}>Pinned</span>}
                    <span className={styles.time}>{relativeTime(featuredAnnouncement.created_at)}</span>
                  </div>
                  <h4>{featuredAnnouncement.title}</h4>
                  <p>{clip(featuredAnnouncement.content, 140)}</p>
                </div>
              </button>
              {moreAnnouncements.length > 0 && (
                <ul className={styles.stack}>
                  {moreAnnouncements.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={styles.stackItem}
                        onClick={() => navigate(`${PATHS.announcements}/${item.id}`)}
                      >
                        <span>{item.title}</span>
                        <em>{relativeTime(item.created_at)}</em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className={styles.empty}>The board hasn’t posted lately.</p>
          )}
        </section>
      </div>

      <section className={styles.porch}>
        <header className={styles.panelHead}>
          <div>
            <p className={styles.kicker}>The Porch</p>
            <h3>What’s happening</h3>
          </div>
          <button type="button" className={styles.openLink} onClick={() => navigate(PATHS.porch)}>
            Open The Porch
          </button>
        </header>
        <button type="button" className={styles.composer} onClick={openPorchCompose}>
          <div className={styles.composerAvatar} aria-hidden="true">
            {user?.photo ? (
              <img src={user.photo} alt="" />
            ) : (
              (user?.first_name || "N").charAt(0).toUpperCase()
            )}
          </div>
          <span>What’s happening on the block, {user?.first_name || "neighbor"}?</span>
        </button>
        {porchPreview.length === 0 ? (
          <p className={styles.empty}>Quiet so far. Be the first to say hello.</p>
        ) : (
          <ul className={styles.chatList}>
            {porchPreview.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  className={styles.chatRow}
                  onClick={() => navigate(`${PATHS.porch}/${post.id}`)}
                >
                  <div className={styles.avatar} aria-hidden="true">
                    {post.author_photo ? (
                      <img src={post.author_photo} alt="" />
                    ) : (
                      (post.author_name || "R").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className={styles.chatCopy}>
                    <div className={styles.chatMeta}>
                      <strong>{post.author_name || "Neighbor"}</strong>
                      <span className={styles.time}>{relativeTime(post.created_at)}</span>
                    </div>
                    <p>{clip(post.content, 100) || (post.image_url ? "Shared a photo" : "")}</p>
                  </div>
                  {post.image_url && <img src={post.image_url} alt="" className={styles.thumb} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dues && (
        <section className={styles.household}>
          <button type="button" className={styles.duesCard} onClick={() => navigate(PATHS.dues)}>
            <div className={styles.duesIcon}>
              <Wallet size={18} />
            </div>
            <div>
              <p className={styles.kicker}>Your household</p>
              <h3>
                {duesDue ? money(dues.balance) : "Dues are current"}
              </h3>
              <p>
                {duesPastDue
                  ? `${dues.days_past_due} days past due`
                  : duesDue
                    ? "Balance due — see payment options"
                    : "No balance on this lot"}
              </p>
            </div>
            <ChevronRight size={18} className={styles.rowChev} />
          </button>
        </section>
      )}

      <nav className={styles.goto} aria-label="Around Town Central">
        {GO_TO.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.to}
              type="button"
              className={styles.gotoCard}
              onClick={() => navigate(item.to)}
            >
              <span className={styles.gotoIcon}>
                <Icon size={18} />
              </span>
              <strong>{item.label}</strong>
              <span>{item.hint}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
