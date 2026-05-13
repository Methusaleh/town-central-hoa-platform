import styles from "./Landing.module.css";

export default function Landing({ onLogin }) {
  return (
    <div className={styles.heroWrapper}>
      <nav className={styles.topNav}>
        <div className={styles.logo}>Town Central HOA</div>
        <button className={styles.loginBtn} onClick={onLogin}>
          Resident Login
        </button>
      </nav>

      <main className={styles.mainContent}>
        <h1 className={styles.title}>Your Community, Connected.</h1>
        <p className={styles.subtitle}>
          The official resident portal for Town Central. Manage dues, view
          community updates, and contact the board.
        </p>
        <div className={styles.ctaContainer}>
          <button className={styles.primaryAction} onClick={onLogin}>
            Enter Resident Portal
          </button>
          <button className={styles.secondaryAction}>Public Documents</button>
        </div>
      </main>
    </div>
  );
}
