import { useEffect, useState } from "react";
import Footer from "../../components/Footer/Footer";
import BrandMark from "../../components/ui/BrandMark";
import { API_URL } from "../../api";
import styles from "./Landing.module.css";

const DEFAULT_HERO = {
  kind: "image",
  file_url: "/landing-hero.jpg",
  object_position: "52% 72%",
};

export default function Landing({ onLogin, onRegisterClick, onContactClick, onGuidelinesClick, onPublicDocsClick }) {
  const [hero, setHero] = useState(DEFAULT_HERO);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/site/landing-hero`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && data?.file_url) setHero({ ...DEFAULT_HERO, ...data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
          {hero.kind === "video" ? (
            <video
              className={styles.heroPhoto}
              src={hero.file_url}
              autoPlay
              muted
              loop
              playsInline
              poster="/landing-hero.jpg"
            />
          ) : (
            <img
              className={styles.heroPhoto}
              src={hero.file_url}
              alt="Town Central entrance"
              style={{ objectPosition: hero.object_position }}
            />
          )}
          <div className={styles.copy}>
            <h1 className={styles.title}>The neighborhood, in one place.</h1>
            <p className={styles.subtitle}>
              Official Town Central HOA portal for announcements, events, documents, and resident services.
            </p>
          </div>
        </main>
      </div>

      <Footer
        onContactClick={onContactClick}
        onGuidelinesClick={onGuidelinesClick}
        onPublicDocsClick={onPublicDocsClick}
      />
    </div>
  );
}
