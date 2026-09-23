import styles from "./Amenities.module.css";

export default function Amenities() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Coming soon</p>
        <h2>Pool & clubhouse</h2>
        <p>The pool and clubhouse are still being built. Hours, guest rules, and reservations will live here when they open.</p>
      </header>
    </div>
  );
}
