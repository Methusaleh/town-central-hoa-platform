import styles from "./Amenities.module.css";

export default function Amenities() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.kicker}>Coming soon</p>
        <h2>Pool & clubhouse</h2>
        <p>
          Pool and clubhouse are slotted to begin after phase three is complete. The board has not received
          building plans yet.
        </p>
      </header>
    </div>
  );
}
