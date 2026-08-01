// frontend/src/pages/Contact/ContactPage.jsx
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
          if you cannot find the answers you need on the portal.
        </p>
      </header>

      <section className={styles.contactSection}>
        <div className={styles.contactCard}>
          <h3>Contact the Board</h3>
          <p>
            Please check the community documents, calendar, and FAQ sections first. If you still have questions not answered on the site, reach out to the board directly:
          </p>
          <a
            href="mailto:board@towncentralhoa.org"
            className={styles.emailLink}
          >
            board@towncentralhoa.org
          </a>
        </div>
      </section>

      <div className={styles.guideWrapper}>
        <CivicGuide />
      </div>
    </div>
  );
}