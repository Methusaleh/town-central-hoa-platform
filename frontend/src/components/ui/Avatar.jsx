import styles from "./Avatar.module.css";

export default function Avatar({ name = "", photo, size = "md" }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return photo ? (
    <img src={photo} alt="" className={`${styles.avatar} ${styles[size]}`} />
  ) : (
    <div className={`${styles.avatar} ${styles.fallback} ${styles[size]}`} aria-hidden="true">
      {initial}
    </div>
  );
}
