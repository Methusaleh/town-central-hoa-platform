import BrandMark from "../../components/ui/BrandMark";
import { GuidelinesList } from "../../components/GuidelinesModal/guidelines.jsx";
import styles from "./Guidelines.module.css";

export default function GuidelinesPage({ onBack }) {
  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <button type="button" onClick={onBack} className={styles.backBtn}>
          Back to home
        </button>
        <span className={styles.logo}>
          <BrandMark size={26} />
          Town Central
        </span>
      </nav>

      <header className={styles.header}>
        <p className={styles.kicker}>Town Central</p>
        <h1>Community guidelines</h1>
        <p>
          These apply once you have a login — The Porch, Alerts, and anything you post.
          You&apos;ll agree to them the first time you sign in.
        </p>
      </header>

      <section className={styles.card}>
        <GuidelinesList className={styles.rules} />
      </section>
    </div>
  );
}
