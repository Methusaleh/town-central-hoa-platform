import styles from "./Footer.module.css";

export default function Footer({ onContactClick }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>&copy; 2026 Town Central HOA. All rights reserved.</p>
        <nav className={styles.footerNav}>
          <button onClick={onContactClick} className={styles.linkBtn}>
            Contact Us
          </button>
          <button
            type="button"
            className={styles.link}
            title="The board will post public files here when they have them."
          >
            Public Documents
          </button>
        </nav>
      </div>
    </footer>
  );
}
