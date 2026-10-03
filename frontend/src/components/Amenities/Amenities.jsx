import styles from "./Amenities.module.css";

export default function Amenities() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Coming soon</p>
        <h2>Pool & clubhouse</h2>
        <p>
          A pool and clubhouse are planned for Town Central. Construction has not started yet — this is where
          hours, guest rules, and reservations will live when they open. We’ll share news here as plans move.
        </p>
      </header>
    </div>
  );
}
