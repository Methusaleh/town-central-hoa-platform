import { useEffect, useRef, useState } from "react";
import Button from "../ui/Button";
import { apiFetch } from "../../api";
import { GuidelinesList } from "./guidelines.jsx";
import styles from "./GuidelinesModal.module.css";

export default function GuidelinesModal({ mode = "agree", onAgree, onClose }) {
  const review = mode === "review";
  const [isChecked, setIsChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!review) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [review, onClose]);

  const handleAccept = async (e) => {
    e.preventDefault();
    if (!isChecked || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/residents/agree-guidelines", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        onAgree?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Couldn't save that. Try again.");
      }
    } catch {
      setError("Network error saving your agreement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      onClick={review ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={cardRef}
        className={styles.card}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guidelines-title"
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.kicker}>Town Central</p>
        <h2 id="guidelines-title">Community guidelines</h2>
        <p className={styles.lede}>
          {review
            ? "These apply to The Porch, Alerts, and anything you post."
            : "Read these before you use The Porch, Alerts, or anything you post. One checkbox, then you're in."}
        </p>

        <GuidelinesList className={styles.rules} />

        {review ? (
          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAccept} className={styles.form}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
              />
              <span>I have read these guidelines and will follow them.</span>
            </label>
            {error && <p className={styles.error}>{error}</p>}
            <Button type="submit" disabled={!isChecked || loading}>
              {loading ? "Saving…" : "Agree"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
