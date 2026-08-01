// frontend/src/pages/Landing/Landing.jsx
import Footer from "../../components/Footer/Footer";
import styles from "./Landing.module.css";

export default function Landing({ onLogin, onRegisterClick, onContactClick }) {
  return (
    <div className={styles.pageContainer}>
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
            The official resident portal for Town Central.
          </p>
          <div className={styles.ctaContainer}>
            <button className={styles.primaryAction} onClick={onRegisterClick}>
              Claim Your Profile
            </button>
          </div>
        </main>
      </div>

      {/* Footer handles the navigation to the Guide/Contact page */}
      <Footer onContactClick={onContactClick} />
    </div>
  );
}