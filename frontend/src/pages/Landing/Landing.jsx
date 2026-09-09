import Footer from "../../components/Footer/Footer";
import BrandMark from "../../components/ui/BrandMark";
import styles from "./Landing.module.css";

export default function Landing({ onLogin, onRegisterClick, onContactClick }) {
  return (
    <div className={styles.container}>
      <div className={styles.heroWrapper}>
        <nav className={styles.topNav}>
          <div className={styles.logo}>
            <BrandMark size={28} />
            <span>Town Central</span>
          </div>
          <div className={styles.navButtons}>
            <button className={styles.secondaryNavBtn} onClick={onRegisterClick}>
              Claim profile
            </button>
            <button className={styles.loginBtn} onClick={onLogin}>
              Resident login
            </button>
          </div>
        </nav>

        <main className={styles.mainContent}>
          <img
            className={styles.heroPhoto}
            src="/landing-standin.png"
            alt=""
          />
          <div className={styles.copy}>
            <h1 className={styles.title}>The neighborhood, in one place.</h1>
            <p className={styles.subtitle}>
              Official Town Central HOA portal for announcements, events, documents, and resident services.
            </p>
          </div>
        </main>
      </div>

      <Footer onContactClick={onContactClick} />
    </div>
  );
}
