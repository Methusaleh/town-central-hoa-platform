import { useState, useEffect } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user, onBack }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // Track which folder IDs are currently expanded in the tree view
  const [expandedFolders, setExpandedFolders] = useState({});
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = Root directory

  // Upload Form States
  const [customTitle, setCustomTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [requiresBoardKey, setRequiresBoardKey] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New Folder State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [parentFolderForNew, setParentFolderForNew] = useState(null);

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
      console.error("Error fetching document tree data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [API_BASE]);

  const toggleExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/documents/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parent_id: parentFolderForNew }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolderModal(false);
        setParentFolderForNew(null);
        fetchData();
      }
    } catch (err) {
      console.error("Error creating folder:", err);
    }
  };

  const handleUploadToSelectedFolder = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return alert("Please select files to upload.");

    setUploading(true);
    try {
      const formData = new FormData();
      if (customTitle.trim()) formData.append("title", customTitle.trim());
      formData.append("category_id", selectedFolderId || "");
      formData.append("requires_board_key", requiresBoardKey);
      if (user?.id) formData.append("uploaded_by", user.id);

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
    }
  };

  // Recursive Tree Node Renderer for Folders
  const renderFolderNode = (parentId = null, level = 0) => {
    const childFolders = folders.filter(f => (parentId === null ? !f.parent_id : f.parent_id === parentId));
    const folderDocs = documents.filter(d => (parentId === null ? !d.category_id : d.category_id === parentId));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: level > 0 ? "20px" : "0" }}>
        {childFolders.map(folder => {
          const isExpanded = !!expandedFolders[folder.id];
          const isSelected = selectedFolderId === folder.id;

          return (
            <div key={folder.id}>
              {/* Folder Row */}
              <div 
                onClick={() => setSelectedFolderId(folder.id)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  padding: "8px 12px", 
                  borderRadius: "8px", 
                  background: isSelected ? "#eff6ff" : "transparent", 
                  border: isSelected ? "1px solid #bfdbfe" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "background 0.15s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button 
                    onClick={(e) => toggleExpand(folder.id, e)} 
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "#64748b", width: "16px" }}
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                  <span>📁</span>
                  <span style={{ fontWeight: isSelected ? "700" : "600", color: "#1e293b", fontSize: "0.9rem" }}>{folder.name}</span>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setParentFolderForNew(folder.id); setShowNewFolderModal(true); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "0.75rem", cursor: "pointer", fontWeight: "600" }}
                  title="Add Subfolder"
                >
                  + Subfolder
                </button>
              </div>

              {/* Expanded Contents (Subfolders & Files) */}
              {isExpanded && (
                <div style={{ marginTop: "4px" }}>
                  {renderFolderNode(folder.id, level + 1)}
                </div>
              )}
            </div>
          );
        })}

        {/* Files directly inside this folder view */}
        {folderDocs.map(doc => (
          <div 
            key={doc.id} 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between", 
              padding: "6px 12px 6px 36px", 
              borderRadius: "6px", 
              background: "#f8fafc", 
              border: "1px solid #f1f5f9",
              fontSize: "0.85rem" 
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
              <span>📄</span>
              <span style={{ color: "#334155", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={doc.title}>{doc.title}</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexShrink: 0 }}>
              <a href={doc.file_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", fontWeight: "600", textDecoration: "none" }}>View</a>
              <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: "600" }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const selectedFolderName = selectedFolderId === null 
    ? "Root Directory" 
    : folders.find(f => f.id === selectedFolderId)?.name || "Selected Folder";

  return (
    <div className={styles.formCard} style={{ marginTop: "10px", maxWidth: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>← Back to Mission Control</button>
        <button className={styles.postBtn} onClick={() => { setParentFolderForNew(null); setShowNewFolderModal(true); }}>📁 + New Root Folder</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "25px", alignItems: "start" }}>
        {/* LEFT PANE: FILE TREE EXPLORER */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px", maxHeight: "600px", overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
            <h4 style={{ margin: 0, color: "#0f172a" }}>📂 Document Tree Explorer</h4>
            <button 
              onClick={() => setSelectedFolderId(null)} 
              style={{ background: selectedFolderId === null ? "#eff6ff" : "none", border: "1px solid #e2e8f0", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}
            >
              Root
            </button>
          </div>

          {folders.length === 0 && documents.length === 0 ? (
            <p style={{ color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>No folders or documents created yet.</p>
          ) : (
            renderFolderNode(null, 0)
          )}
        </div>

        {/* RIGHT PANE: UPLOAD TARGET */}
        <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "20px" }}>
          <h4 style={{ margin: "0 0 6px 0", color: "#0f172a" }}>📤 Upload Files</h4>
          <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 20px 0" }}>
            Target Destination: <strong style={{ color: "#2563eb" }}>{selectedFolderName}</strong>
          </p>

          <form onSubmit={handleUploadToSelectedFolder} className={styles.announcementForm} style={{ marginTop: 0 }}>
            <input 
              type="text" 
              placeholder="Optional Custom Title (leave blank for original filename)" 
              value={customTitle} 
              onChange={(e) => setCustomTitle(e.target.value)} 
            />

            <div 
              onClick={() => document.getElementById("tree-file-input").click()}
              style={{ border: "2px dashed #cbd5e1", borderRadius: "12px", padding: "25px", textAlign: "center", background: selectedFiles.length > 0 ? "#f0fdf4" : "#f8fafc", cursor: "pointer" }}
            >
              <p style={{ margin: 0, fontWeight: "600", color: "#475569" }}>
                {selectedFiles.length > 0 ? `✅ ${selectedFiles.length} file(s) selected` : "📁 Click to browse or drop files here"}
              </p>
              <input id="tree-file-input" type="file" multiple hidden onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0" }}>
              <input type="checkbox" id="boardKey" checked={requiresBoardKey} onChange={(e) => setRequiresBoardKey(e.target.checked)} style={{ width: "16px", height: "16px" }} />
              <label htmlFor="boardKey" style={{ cursor: "pointer", fontSize: "0.9rem", color: "#334155", fontWeight: "600" }}>🔒 Board Access Only (Hidden from Residents)</label>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={uploading || selectedFiles.length === 0}>
              {uploading ? "Uploading..." : `Upload to ${selectedFolderName}`}
            </button>
          </form>
        </div>
      </div>

      {/* NEW FOLDER MODAL */}
      {showNewFolderModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowNewFolderModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>📁 Create New Folder</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Creating inside: <strong>{parentFolderForNew ? folders.find(f => f.id === parentFolderForNew)?.name : "Root Directory"}</strong>
            </p>
            <form onSubmit={handleCreateFolder} style={{ display: "flex", flexDirection: "column", gap: "15px", marginTop: "15px" }}>
              <input 
                type="text" 
                placeholder="Folder Name (e.g., Meeting Minutes)" 
                value={newFolderName} 
                onChange={(e) => setNewFolderName(e.target.value)} 
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box" }}
                required 
                autoFocus
              />
              <div style={{ display: "flex", gap: "10px" }}>
                <button type="submit" className={styles.submitBtn} style={{ flex: 1 }}>Create Folder</button>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowNewFolderModal(false)} style={{ flex: 1 }}>Cancel/Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}