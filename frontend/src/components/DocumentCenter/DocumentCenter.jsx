import { useState, useEffect } from "react";
import styles from "./DocumentCenter.module.css";

export default function DocumentCenter({ user }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    fetch(`${API_URL}/api/documents`)
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch((err) => console.error("Error fetching documents:", err));
  }, [API_URL]);

  const handleDownload = (file) => {
    window.open(file.file_url, "_blank");
  };

  if (loading) return <p>Loading documents...</p>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Community Document Repository</h2>
        <p>Access official neighborhood files and governance covenants.</p>
      </header>

      <div className={styles.grid}>
        {/* Logic: If it requires board key, only show if user is board/admin */}
        {documents
          .filter((doc) => 
            !doc.requires_board_key || 
            (user?.role === "board_member" || user?.role === "super_admin")
          )
          .map((doc) => (
            <div key={doc.id} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <h3>{doc.title}</h3>
              </div>
              
              <ul className={styles.fileList}>
                <li className={styles.fileRow} onClick={() => handleDownload(doc)}>
                  <div className={styles.fileInfo}>
                    <span className={styles.fileName}>{doc.title}</span>
                    <span className={styles.fileSize}>Added: {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <button className={styles.downloadBtn}>
                    📥 <span className={styles.btnText}>Download</span>
                  </button>
                </li>
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}