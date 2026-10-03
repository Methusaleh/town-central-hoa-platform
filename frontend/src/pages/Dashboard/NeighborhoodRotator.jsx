import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import { NEIGHBORHOOD_PHOTOS } from "./neighborhoodPhotos";
import styles from "./HomeOverview.module.css";

const INTERVAL_MS = 10000;

function toSlides(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      src: row.file_url || row.src,
      position: row.object_position || row.position || "center 40%",
    }))
    .filter((row) => row.src);
}

export default function NeighborhoodRotator() {
  const [photos, setPhotos] = useState(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/site/home-photos")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setPhotos(toSlides(data));
      })
      .catch(() => {
        if (!cancelled) setPhotos(NEIGHBORHOOD_PHOTOS);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = photos === null ? NEIGHBORHOOD_PHOTOS : photos;

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 861px)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer = 0;

    const sync = () => {
      window.clearInterval(timer);
      if (!desktop.matches || motion.matches || slides.length < 2) return;
      timer = window.setInterval(() => {
        setIndex((current) => (current + 1) % slides.length);
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
  }, [slides.length]);

  if (!slides.length) return null;

  const safeIndex = index % slides.length;

  return (
    <div className={styles.rotator} aria-hidden="true">
      {slides.map((photo, i) => (
        <img
          key={`${photo.src}-${i}`}
          src={photo.src}
          alt=""
          className={i === safeIndex ? styles.rotatorOn : undefined}
          style={{ objectPosition: photo.position }}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}
