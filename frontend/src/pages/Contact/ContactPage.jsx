import CivicGuide from "../../components/CivicGuide/CivicGuide";
import styles from "./ContactPage.module.css";

export default function ContactPage({ onBack }) {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <button onClick={onBack} className={styles.backBtn}>
          ← Back to Home
        </button>
        <span className={styles.logo}>Town Central HOA</span>
      </nav>

      <header className={styles.header}>
        <h1>Contact & Civic Resources</h1>
        <p>
          Find the right department for your needs or reach out to the Board
          directly.
        </p>
      </header>

      <section className={styles.emailSection}>
        <div className={styles.emailCard}>
          <h3>Email the Board</h3>
          <p>
            For official HOA business, architectural requests, or dues
            inquiries:
          </p>
          <a
            href="mailto:board@towncentralhoa.com"
            className={styles.emailLink}
          >
            board@towncentralhoa.com
          </a>
        </div>
      </section>

      {/* Re-using the CivicGuide component here! */}
      <CivicGuide />
    </div>
  );
}
