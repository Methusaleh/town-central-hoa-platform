import { useEffect, useState } from "react";
import { NEIGHBORHOOD_PHOTOS } from "./neighborhoodPhotos";
import styles from "./HomeOverview.module.css";

const INTERVAL_MS = 10000;

export default function NeighborhoodRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 861px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;

    const sync = () => {
      window.clearInterval(timer);
      if (!desktop.matches || motion.matches || NEIGHBORHOOD_PHOTOS.length < 2) return;
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % NEIGHBORHOOD_PHOTOS.length);
      }, INTERVAL_MS);
    };

    sync();
    desktop.addEventListener("change", sync);
    motion.addEventListener("change", sync);
    return () => {
      window.clearInterval(timer);
      desktop.removeEventListener("change", sync);
      motion.removeEventListener("change", sync);
    };
  }, []);

  if (!NEIGHBORHOOD_PHOTOS.length) return null;

  return (
    <div className={styles.rotator} aria-hidden="true">
      {NEIGHBORHOOD_PHOTOS.map((photo, i) => (
        <img
          key={photo.src}
          src={photo.src}
          alt=""
          className={i === index ? styles.rotatorOn : undefined}
          style={{ objectPosition: photo.position }}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
