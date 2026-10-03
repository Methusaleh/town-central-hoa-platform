import styles from "./Footer.module.css";

export default function Footer({ onContactClick, onGuidelinesClick, onPublicDocsClick }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p>&copy; 2026 Town Central HOA. All rights reserved.</p>
        <nav className={styles.footerNav}>
          <button onClick={onContactClick} className={styles.linkBtn}>
            Contact Us
          </button>
          <button type="button" onClick={onGuidelinesClick} className={styles.linkBtn}>
            Guidelines
          </button>
          <button type="button" onClick={onPublicDocsClick} className={styles.linkBtn}>
            Public Documents
          </button>
        </nav>
      </div>
    </footer>
  );
}
