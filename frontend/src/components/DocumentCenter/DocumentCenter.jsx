import { useState, useEffect } from "react";
import styles from "./DocumentCenter.module.css";
import { apiFetch } from "../../api";

export default function DocumentCenter({ user }) {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/api/documents/categories").then(res => res.json()),
      apiFetch("/api/documents").then(res => res.json())
    ])
    .then(([catsData, docsData]) => {
      setCategories(Array.isArray(catsData) ? catsData : []);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error fetching repository data:", err);
      setLoading(false);
    });
  }, []);

  const toggleCategory = (categoryId) => {
    // If clicking the already open category, close it. Otherwise, open the new one.
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const handleDownload = (file) => {
    window.open(file.file_url, "_blank");
  };

  if (loading) return <p>Loading document repository...</p>;

  // Security gate: Filter documents based on user role
  const visibleDocuments = documents.filter(doc => 
    !doc.requires_board_key || 
    (user?.role === "board_member" || user?.role === "super_admin")
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Community Document Repository</h2>
        <p>Access official neighborhood files, categorized by the Executive Board.</p>
      </header>

      <div className={styles.accordionContainer}>
        {categories.map(category => {
          // Find all documents that belong to this specific category loop
          const categoryDocs = visibleDocuments.filter(doc => doc.category_id === category.id);
          
          // Clean UX: Hide the category entirely if it has zero visible documents
          if (categoryDocs.length === 0) return null;

          const isExpanded = expandedCategory === category.id;

          return (
            <div key={category.id} className={styles.accordionItem}>
              {/* Accordion Header */}
              <button 
                className={`${styles.accordionHeader} ${isExpanded ? styles.expanded : ""}`}
                onClick={() => toggleCategory(category.id)}
              >
                <div className={styles.headerContent}>
                  <span className={styles.categoryIcon}>📁</span>
                  <h3>{category.name}</h3>
                  <span className={styles.docCount}>({categoryDocs.length})</span>
                </div>
                <span className={styles.chevron}>{isExpanded ? "▲" : "▼"}</span>
              </button>

              {/* Accordion Body (Files) */}
              {isExpanded && (
                <div className={styles.accordionContent}>
                  <ul className={styles.fileList}>
                    {categoryDocs.map(doc => (
                      <li key={doc.id} className={styles.fileRow}>
                        <div className={styles.fileInfo}>
                          <span className={styles.fileName}>📄 {doc.title}</span>
                          <span className={styles.fileSize}>Added: {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        {/* Updated to 'View' button */}
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={styles.downloadBtn}
                          style={{ textDecoration: 'none' }} // Ensure it looks like a button
                        >
                          👁️ <span className={styles.btnText}>View</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}