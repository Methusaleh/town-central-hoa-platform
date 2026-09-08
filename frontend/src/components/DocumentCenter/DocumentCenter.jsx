import { useMemo, useState, useEffect } from "react";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { apiFetch } from "../../api";
import styles from "./DocumentCenter.module.css";

function formatAdded(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function childrenOf(categories, parentId) {
  return categories
    .filter((category) => String(category.parent_id || "") === String(parentId || ""))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function countDocs(categoryId, categories, documents) {
  const direct = documents.filter((doc) => String(doc.category_id) === String(categoryId)).length;
  return childrenOf(categories, categoryId).reduce(
    (sum, child) => sum + countDocs(child.id, categories, documents),
    direct,
  );
}

function FolderBlock({ category, categories, documents, depth, forceOpen }) {
  const kids = childrenOf(categories, category.id);
  const files = documents
    .filter((doc) => String(doc.category_id) === String(category.id))
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));
  const total = countDocs(category.id, categories, documents);
  const [open, setOpen] = useState(depth < 1);
  const shown = forceOpen || open;

  if (total === 0) return null;

  return (
    <div className={styles.folder} style={{ marginLeft: depth ? 12 : 0 }}>
      <button type="button" className={styles.folderHead} onClick={() => setOpen((value) => !value)}>
        <ChevronRight size={16} className={shown ? styles.chevOpen : styles.chev} />
        <Folder size={16} />
        <span>{category.name}</span>
        <em>{total}</em>
      </button>
      {shown && (
        <div className={styles.folderBody}>
          {kids.map((child) => (
            <FolderBlock
              key={child.id}
              category={child}
              categories={categories}
              documents={documents}
              depth={depth + 1}
              forceOpen={forceOpen}
            />
          ))}
          {files.map((doc) => (
            <a
              key={doc.id}
              className={styles.file}
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText size={16} />
              <span>
                <strong>{doc.title}</strong>
                <em>{formatAdded(doc.created_at)}</em>
              </span>
              <b>Open</b>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentCenter() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch("/api/documents/categories?audience=residents").then((res) => res.json()),
      apiFetch("/api/documents?audience=residents").then((res) => res.json()),
    ])
      .then(([catsData, docsData]) => {
        setCategories(Array.isArray(catsData) ? catsData : []);
        setDocuments(Array.isArray(docsData) ? docsData : []);
      })
      .catch((err) => console.error("Error fetching repository data:", err))
      .finally(() => setLoading(false));
  }, []);

  const visibleDocuments = useMemo(() => {
    const allowed = documents.filter((doc) => !doc.is_private && !doc.requires_board_key);
    const needle = query.trim().toLowerCase();
    if (!needle) return allowed;
    return allowed.filter((doc) => String(doc.title || "").toLowerCase().includes(needle));
  }, [documents, query]);

  const residentCategories = useMemo(
    () => categories.filter((category) => category.audience !== "board"),
    [categories],
  );

  const roots = childrenOf(residentCategories, null);
  const unfiled = visibleDocuments.filter((doc) => !doc.category_id);
  const hasAnything = visibleDocuments.length > 0;

  if (loading) return <p className={styles.loading}>Loading documents…</p>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Library</p>
          <h2>Documents</h2>
          <p>Covenants, meeting packets, and neighborhood files the board posts for households.</p>
        </div>
        <label className={styles.search}>
          <input
            type="search"
            placeholder="Search files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </header>

      {!hasAnything ? (
        <p className={styles.empty}>No documents are posted yet.</p>
      ) : (
        <div className={styles.tree}>
          {roots.map((category) => (
            <FolderBlock
              key={category.id}
              category={category}
              categories={residentCategories}
              documents={visibleDocuments}
              depth={0}
              forceOpen={Boolean(query.trim())}
            />
          ))}
          {unfiled.length > 0 && (
            <div className={styles.folder}>
              <div className={styles.folderHead}>
                <Folder size={16} />
                <span>Unfiled</span>
                <em>{unfiled.length}</em>
              </div>
              <div className={styles.folderBody}>
                {unfiled.map((doc) => (
                  <a
                    key={doc.id}
                    className={styles.file}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FileText size={16} />
                    <span>
                      <strong>{doc.title}</strong>
                      <em>{formatAdded(doc.created_at)}</em>
                    </span>
                    <b>Open</b>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
