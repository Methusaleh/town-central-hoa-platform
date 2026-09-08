import { Link } from "react-router-dom";
import { CalendarDays, FolderOpen, Waves } from "lucide-react";
import { PATHS } from "../../layout/navConfig";
import styles from "./Amenities.module.css";

export default function Amenities() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Coming soon</p>
        <h2>Pool & clubhouse</h2>
        <p>
          The new pool and clubhouse are still being built. When they open, this is where
          households will find hours, guest rules, and reservations. Nothing here is live yet.
        </p>
      </header>

      <section className={styles.card}>
        <span className={styles.badge}>
          <Waves size={16} />
          Not open
        </span>
        <h3>What will live here</h3>
        <ul>
          <li>Pool hours and guest rules</li>
          <li>Clubhouse reservations for household gatherings</li>
          <li>What to bring, capacity, and how the board approves a booking</li>
        </ul>
      </section>

      <section className={styles.card}>
        <h3>Until then</h3>
        <p>
          Neighborhood pool days and clubhouse gatherings will be posted on Events.
          Rules and packets go in Docs once the board files them.
        </p>
        <div className={styles.links}>
          <Link to={PATHS.events}>
            <CalendarDays size={16} />
            Events
          </Link>
          <Link to={PATHS.documents}>
            <FolderOpen size={16} />
            Docs
          </Link>
        </div>
      </section>
    </div>
  );
}
