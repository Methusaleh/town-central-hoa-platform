import { useState, useEffect, useRef } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user, onBack }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // Navigation State (History for Back/Forward)
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root
  const [history, setHistory] = useState([null]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sorting & Filtering
  const [sortBy, setSortBy] = useState("name-asc"); // name-asc, name-desc, date-desc

  // Context Menu State
  const [contextMenu, setContextMenu] = useState(null); // { type, item, x, y }

  // Modals State
  const [modalType, setModalType] = useState(null); // "new-folder", "rename", "share"
  const [modalData, setModalData] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [uploading, setUploading] = useState(false);

  const explorerRef = useRef(null);
  const API_BASE = import.meta.env.VITE_API_URL || "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  const fetchData = async () => {
    try {
      const [catsRes, docsRes] = await Promise.all([
        fetch(`${API_BASE}/api/documents/categories`),
        fetch(`${API_BASE}/api/documents`)
      ]);
      const catsData = await catsRes.json();
      const docsData = await docsRes.json();
      setFolders(catsData || []);
      setDocuments(docsData || []);
    } catch (err) {
      console.error("Error fetching explorer data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [API_BASE]);

  // Navigation Handlers with History Support
  const navigateToFolder = (folderId) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(folderId);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentFolderId(folderId);
    setContextMenu(null);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(history[newIndex]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentFolderId(history[newIndex]);
    }
  };

  // Build Breadcrumb Chain from Root down to Current Folder
  const getBreadcrumbs = () => {
    const path = [{ id: null, name: "Root" }];
    let currId = currentFolderId;
    const tempPath = [];
    while (currId !== null) {
      const folder = folders.find(f => f.id === currId);
      if (folder) {
        tempPath.unshift(folder);
        currId = folder.parent_id;
      } else {
        break;
      }
    }
    return [...path, ...tempPath];
  };

  // Filter & Sort Items in Current View
  const currentFolders = folders.filter(f => (currentFolderId === null ? !f.parent_id : f.parent_id === currentFolderId));
  const currentDocs = documents.filter(d => (currentFolderId === null ? !d.category_id : d.category_id === currentFolderId));

  const sortItems = (items, type) => {
    return [...items].sort((a, b) => {
      const nameA = (type === "folder" ? a.name : a.title).toLowerCase();
      const nameB = (type === "folder" ? b.name : b.title).toLowerCase();
      if (sortBy === "name-asc") return nameA.localeCompare(nameB);
      if (sortBy === "name-desc") return nameB.localeCompare(nameA);
      if (sortBy === "date-desc") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return 0;
    });
  };

  const displayedFolders = sortItems(currentFolders, "folder");
  const displayedDocs = sortItems(currentDocs, "file");

  // Direct Drag-and-Drop File Upload Handler
  const handleDropUpload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("category_id", currentFolderId || "");
      formData.append("requires_board_key", false);
      if (user?.id) formData.append("uploaded_by", user.id);

      files.forEach(file => formData.append("files", file));

      const res = await fetch(`${API_BASE}/api/documents`, { method: "POST", body: formData });
      if (res.ok) fetchData();
      else alert("Upload failed.");
    } catch (err) {
      console.error("Drop upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  // Right-Click Context Menu Trigger
  const handleContextMenu = (e, type, item = null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      type, // "file", "folder", or "bg"
      item,
      x: e.pageX,
      y: e.pageY
    });
  };

  // CRUD Actions
  const handleCreateFolderSubmit = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/documents/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inputVal.trim(), parent_id: currentFolderId }),
      });
      if (res.ok) {
        setInputVal("");
        setModalType(null);
        fetchData();
      }
    } catch (err) {
      console.error("Folder creation error:", err);
    }
  };

  const handleDelete = async (type, id) => {
    setContextMenu(null);
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

    try {
      const endpoint = type === "file" ? `${API_BASE}/api/documents/${id}` : `${API_BASE}/api/documents/categories/${id}`;
      // Note: If you don't have a backend route for category deletion yet, ensure it cascades or use file delete.
      const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className={styles.formCard} style={{ marginTop: "10px", maxWidth: "100%", position: "min-height" }}>
      {/* TOP MISSION CONTROL & ACTION BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>← Back to Mission Control</button>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", fontSize: "0.85rem", fontWeight: "600" }}
          >
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
            <option value="date-desc">Sort: Newest First</option>
          </select>
          <button className={styles.postBtn} onClick={() => { setInputVal(""); setModalType("new-folder"); }}>📁 + New Folder</button>
        </div>
      </div>

      {/* EXPLORER NAVIGATION CONTROLS BAR */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          <button 
            onClick={handleBack} 
            disabled={historyIndex === 0} 
            style={{ background: "white", border: "1px solid #cbd5e1", borderRadius: "6px", width: "32px", height: "32px", cursor: historyIndex === 0 ? "not-allowed" : "pointer", opacity: historyIndex === 0 ? 0.5 : 1, fontWeight: "bold" }}
          >
            ←
          </button>
          <button 
            onClick={handleForward} 
            disabled={historyIndex >= history.length - 1} 
            style={{ background: "white", border: "1px solid #cbd5e1", borderRadius: "6px", width: "32px", height: "32px", cursor: historyIndex >= history.length - 1 ? "not-allowed" : "pointer", opacity: historyIndex >= history.length - 1 ? 0.5 : 1, fontWeight: "bold" }}
          >
            →
          </button>
        </div>

        {/* Live Breadcrumb Path */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", fontWeight: "600", color: "#475569", overflowX: "auto" }}>
          <span>📍</span>
          {getBreadcrumbs().map((crumb, idx, arr) => (
            <span key={crumb.id || "root"} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {idx > 0 && <span style={{ color: "#94a3b8" }}>/</span>}
              <button 
                onClick={() => {
                  const targetIndex = history.indexOf(crumb.id);
                  if (targetIndex !== -1) {
                    setHistoryIndex(targetIndex);
                    setCurrentFolderId(crumb.id);
                  } else {
                    navigateToFolder(crumb.id);
                  }
                }}
                style={{ background: idx === arr.length - 1 ? "#e2e8f0" : "transparent", border: "none", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontWeight: "inherit", color: "#1e293b" }}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* MAIN FILE EXPLORER DROP ZONE CANVAS */}
      <div 
        ref={explorerRef}
        onContextMenu={(e) => handleContextMenu(e, "bg")}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDropUpload}
        style={{ 
          background: "white", 
          border: "2px dashed #cbd5e1", 
          borderRadius: "16px", 
          padding: "24px", 
          minHeight: "450px", 
          maxHeight: "650px", 
          overflowY: "auto",
          position: "relative" 
        }}
      >
        {uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 50, fontWeight: "700", color: "#2ecc71" }}>
            Uploading files to current folder...
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "15px" }}>
          {/* Folders Grid */}
          {displayedFolders.map(folder => (
            <div 
              key={folder.id}
              onDoubleClick={() => navigateToFolder(folder.id)}
              onContextMenu={(e) => handleContextMenu(e, "folder", folder)}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px", transition: "all 0.15s ease" }}
              title="Double-click to open"
            >
              <span style={{ fontSize: "2.5rem" }}>📁</span>
              <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "0.9rem", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{folder.name}</span>
            </div>
          ))}

          {/* Files Grid */}
          {displayedDocs.map(doc => (
            <div 
              key={doc.id}
              onContextMenu={(e) => handleContextMenu(e, "file", doc)}
              style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
            >
              <span style={{ fontSize: "2.5rem" }}>📄</span>
              <span style={{ fontWeight: "600", color: "#334155", fontSize: "0.85rem", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={doc.title}>{doc.title}</span>
              <div style={{ display: "flex", gap: "10px", marginTop: "auto", fontSize: "0.8rem" }}>
                <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontWeight: "650", textDecoration: "none" }}>Open</a>
                <button onClick={() => handleDelete("file", doc.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "650", padding: 0 }}>Delete</button>
              </div>
            </div>
          ))}

          {displayedFolders.length === 0 && displayedDocs.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "80px 0", color: "#94a3b8", fontStyle: "italic" }}>
              This folder is empty. Drag & drop files here or right-click to add a new folder.
            </div>
          )}
        </div>
      </div>

      {/* CUSTOM RIGHT-CLICK CONTEXT MENU */}
      {contextMenu && (
        <div 
          style={{ 
            position: "absolute", 
            top: contextMenu.y, 
            left: contextMenu.x, 
            background: "white", 
            border: "1px solid #e2e8f0", 
            borderRadius: "10px", 
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)", 
            zIndex: 1000, 
            padding: "6px 0",
            minWidth: "160px" 
          }}
        >
          {contextMenu.type === "file" && (
            <>
              <a href={contextMenu.item.file_url} target="_blank" rel="noreferrer" style={{ display: "block", padding: "8px 16px", color: "#1e293b", textDecoration: "none", fontSize: "0.85rem", fontWeight: "600" }}>👁️ Open / View</a>
              <button onClick={() => { navigator.clipboard.writeText(contextMenu.item.file_url); alert("Link copied to clipboard!"); setContextMenu(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}>🔗 Copy Link</button>
              <button onClick={() => handleDelete("file", contextMenu.item.id)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", color: "#ef4444", cursor: "pointer" }}>🗑️ Delete</button>
            </>
          )}

          {contextMenu.type === "folder" && (
            <>
              <button onClick={() => { navigateToFolder(contextMenu.item.id); setContextMenu(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}>📂 Open Folder</button>
              <button onClick={() => { setModalData(contextMenu.item); setInputVal(contextMenu.item.name); setModalType("rename"); setContextMenu(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}>✏️ Rename</button>
              <button onClick={() => handleDelete("folder", contextMenu.item.id)} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", color: "#ef4444", cursor: "pointer" }}>🗑️ Delete</button>
            </>
          )}

          {contextMenu.type === "bg" && (
            <>
              <button onClick={() => { setInputVal(""); setModalType("new-folder"); setContextMenu(null); }} style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 16px", fontSize: "0.85rem", fontWeight: "600", color: "#1e293b", cursor: "pointer" }}>📁 + Add New Folder</button>
            </>
          )}
        </div>
      )}

      {/* MODAL WINDOWS */}
      {modalType === "new-folder" && (
        <div className={styles.modalBackdrop} onClick={() => setModalType(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>📁 Create New Folder</h3>
            <form onSubmit={handleCreateFolderSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
              <input 
                type="text" 
                placeholder="Folder Name..." 
                value={inputVal} 
                onChange={(e) => setInputVal(e.target.value)} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" }}
                required 
                autoFocus
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>Create</button>
                <button type="button" className={styles.cancelBtn} onClick={() => setModalType(null)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}