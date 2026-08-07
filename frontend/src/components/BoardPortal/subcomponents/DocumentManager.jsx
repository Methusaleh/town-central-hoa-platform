import { useState, useEffect } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user, onBack }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Root directory
  const [folderPath, setFolderPath] = useState([{ id: null, name: "Root" }]);
  
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  
  // Upload Form States
  const [customTitle, setCustomTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [requiresBoardKey, setRequiresBoardKey] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      console.error("Error fetching file system data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [API_BASE]);

  // Filter folders and documents belonging to the current active directory
  const currentFolders = folders.filter(f => (currentFolderId === null ? !f.parent_id : f.parent_id === currentFolderId));
  const currentDocs = documents.filter(d => (currentFolderId === null ? !d.category_id : d.category_id === currentFolderId));

  const handleOpenFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, folder]);
  };

  const handleNavigateBreadcrumb = (index) => {
    const targetFolder = folderPath[index];
    setCurrentFolderId(targetFolder.id);
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/documents/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parent_id: currentFolderId }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        fetchData();
      }
    } catch (err) {
      console.error("Error creating folder:", err);
    }
  };

  const handleBatchUpload = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return alert("Please select files to upload.");

    setUploading(true);
    try {
      const formData = new FormData();
      if (customTitle.trim()) formData.append("title", customTitle.trim());
      formData.append("category_id", currentFolderId || "");
      formData.append("requires_board_key", requiresBoardKey);
      if (user?.id) formData.append("uploaded_by", user.id);

      // Support multi-file batch appending
      for (const file of selectedFiles) {
        formData.append("files", file);
      }

      const res = await fetch(`${API_BASE}/api/documents`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");

      alert("Documents successfully uploaded!");
      setSelectedFiles([]);
      setCustomTitle("");
      setRequiresBoardKey(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!confirm("Are you sure? This will delete the file from storage forever.")) return;
    try {
      const res = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments(documents.filter(d => d.id !== id));
      } else {
        const errorData = await res.json();
        alert(`Delete failed: ${errorData?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Delete network error:", err);
      alert("Could not connect to the server to delete.");
    }
  };

  return (
    <div className={styles.formCard} style={{ marginTop: "10px", maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>← Back to Mission Control</button>
        <button className={styles.postBtn} onClick={() => setShowNewFolderModal(true)}>📁 + New Folder</button>
      </div>

      {/* BREADCRUMB NAVIGATION BAR */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "12px 16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "20px", fontSize: "0.95rem", fontWeight: "600" }}>
        <span>📍 Location:</span>
        {folderPath.map((folder, index) => (
          <span key={folder.id || "root"} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {index > 0 && <span style={{ color: "#94a3b8" }}>/</span>}
            <button 
              onClick={() => handleNavigateBreadcrumb(index)}
              style={{ background: index === folderPath.length - 1 ? "#e2e8f0" : "transparent", border: "none", padding: "4px 8px", borderRadius: "6px", cursor: "pointer", fontWeight: "inherit" }}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      {/* FILE SYSTEM GRID VIEW */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "15px", marginBottom: "30px" }}>
        {/* Render Folders */}
        {currentFolders.map(folder => (
          <div 
            key={folder.id} 
            onDoubleClick={() => handleOpenFolder(folder)}
            style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", transition: "transform 0.15s" }}
            title="Double-click to open folder"
          >
            <span style={{ fontSize: "1.8rem" }}>📁</span>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{folder.name}</div>
              <small style={{ color: "#64748b" }}>Folder</small>
            </div>
          </div>
        ))}

        {/* Render Files in Current Directory */}
        {currentDocs.map(doc => (
          <div key={doc.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
              <span style={{ fontSize: "1.5rem" }}>📄</span>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontWeight: "600", color: "#334155", fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={doc.title}>{doc.title}</div>
                <small style={{ color: "#94a3b8" }}>Added: {new Date(doc.created_at).toLocaleDateString()}</small>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
              <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: "650", textDecoration: "none" }}>View</a>
              <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.8rem", cursor: "pointer", fontWeight: "650" }}>Delete</button>
            </div>
          </div>
        ))}

        {currentFolders.length === 0 && currentDocs.length === 0 && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8", fontStyle: "italic", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            This folder is empty. Create a subfolder or upload files below.
          </div>
        )}
      </div>

      {/* UPLOAD PANEL */}
      <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px" }}>
        <h4 style={{ margin: "0 0 15px 0", color: "#0f172a" }}>📤 Upload Files to Active Folder</h4>
        <form onSubmit={handleBatchUpload} className={styles.announcementForm} style={{ marginTop: 0 }}>
          <input 
            type="text" 
            placeholder="Optional Custom Title (leave blank to use original filenames)" 
            value={customTitle} 
            onChange={(e) => setCustomTitle(e.target.value)} 
          />

          <div 
            onClick={() => document.getElementById("bulk-file-input").click()}
            style={{ border: "2px dashed #cbd5e1", borderRadius: "12px", padding: "25px", textAlign: "center", background: selectedFiles.length > 0 ? "#f0fdf4" : "#f8fafc", cursor: "pointer" }}
          >
            <p style={{ margin: 0, fontWeight: "600", color: "#475569" }}>
              {selectedFiles.length > 0 ? `✅ ${selectedFiles.length} file(s) selected for upload` : "📁 Click to browse or drag & drop multiple files here"}
            </p>
            <input id="bulk-file-input" type="file" multiple hidden onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
            <input type="checkbox" id="boardKey" checked={requiresBoardKey} onChange={(e) => setRequiresBoardKey(e.target.checked)} style={{ width: "16px", height: "16px" }} />
            <label htmlFor="boardKey" style={{ cursor: "pointer", fontSize: "0.9rem", color: "#334155", fontWeight: "600" }}>🔒 Board Access Only (Hidden from Residents)</label>
          </div>

          <button type="submit" className={styles.submitBtn} disabled={uploading || selectedFiles.length === 0}>
            {uploading ? "Uploading..." : `Upload ${selectedFiles.length || ""} File(s) & Publish`}
          </button>
        </form>
      </div>

      {/* NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowNewFolderModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>📁 Create New Folder</h3>
            <form onSubmit={handleCreateFolder} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
              <input 
                type="text" 
                placeholder="Folder Name (e.g., Bylaws & Covenants)" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" }}
                required 
                autoFocus
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>Create Folder</button>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowNewFolderModal(false)} style={{ flex: 1 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}