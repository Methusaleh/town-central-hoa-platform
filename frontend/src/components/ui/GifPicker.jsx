import { useEffect, useState } from "react";
import { apiFetch } from "../../api";
import styles from "./GifPicker.module.css";

export default function GifPicker({ onPick, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiFetch(`/api/media/gifs?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setResults([]);
          setError(data.error || "GIF search is unavailable.");
        } else {
          setResults(Array.isArray(data.results) ? data.results : []);
        }
      } catch {
        setError("Network error loading GIFs.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, query ? 280 : 0);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search GIFs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        <button type="button" className={styles.close} onClick={onClose}>
          Close
        </button>
      </div>
      <div className={styles.body}>
        {error && <p className={styles.error}>{error}</p>}
        {loading && !results.length ? (
          <p className={styles.muted}>Searching…</p>
        ) : results.length === 0 && !error ? (
          <p className={styles.muted}>No GIFs match that.</p>
        ) : (
          <div className={styles.grid}>
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.cell}
                onClick={() => onPick(item.url)}
              >
                <img src={item.preview || item.url} alt={item.title || "GIF"} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
