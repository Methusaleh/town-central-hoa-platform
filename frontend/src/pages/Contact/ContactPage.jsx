import CivicGuide from "../../components/CivicGuide/CivicGuide";
import BrandMark from "../../components/ui/BrandMark";
import styles from "./ContactPage.module.css";

export default function ContactPage({ onBack }) {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <button onClick={onBack} className={styles.backBtn}>
          Back to home
        </button>
        <span className={styles.logo}>
          <BrandMark size={26} />
          Town Central
        </span>
      </nav>

      <header className={styles.header}>
        <h1>Contact & civic resources</h1>
        <p>
          Find the right department for your needs or reach out to the board
          if you cannot find the answers you need on the portal.
        </p>
      </header>

      <section className={styles.contactSection}>
        <div className={styles.contactCard}>
          <h3>Contact the board</h3>
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
