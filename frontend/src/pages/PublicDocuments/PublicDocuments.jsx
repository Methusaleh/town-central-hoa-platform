import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import BrandMark from "../../components/ui/BrandMark";
import { API_URL } from "../../api";
import styles from "./PublicDocuments.module.css";

function formatAdded(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PublicDocumentsPage({ onBack }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/documents/public-library`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

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
        <h1>Public documents</h1>
      </header>

      <section className={styles.card}>
        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : files.length === 0 ? (
          <p className={styles.empty}>The board will post files here.</p>
        ) : (
          <ul className={styles.list}>
            {files.map((file) => (
              <li key={file.id}>
                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                  <FileText size={18} />
                  <span>
                    <strong>{file.title}</strong>
                    <em>
                      {[file.folder, formatAdded(file.created_at)].filter(Boolean).join(" · ")}
                    </em>
                  </span>
                  <b>Open</b>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
