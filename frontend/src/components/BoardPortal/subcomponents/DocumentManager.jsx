import { useState, useEffect } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user, onBack }) {
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  const [docForm, setDocForm] = useState({ 
    title: "", 
    category_id: "", 
    is_private: false, 
    requires_board_key: false 
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  useEffect(() => {
    fetch(`${API_BASE}/api/documents/categories`)
      .then(res => res.json())
      .then(data => setCategories(data || []))
      .catch(err => console.error("Error fetching categories:", err));
  }, [API_BASE]);

  useEffect(() => {
    fetch(`${API_BASE}/api/documents`)
      .then(res => res.json())
      .then(data => setDocuments(data || []))
      .catch(err => console.error("Error fetching docs:", err));
  }, [API_BASE]);

  // Safe filter logic using optional chaining
  const filteredDocs = (documents || []).filter(doc => 
    doc?.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterCategory === "" || doc?.category_id?.toString() === filterCategory)
  );

  const handleDelete = async (id) => {
    if (!confirm("Are you sure? This will delete the file from storage forever.")) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
      if (response.ok) {
        setDocuments(documents.filter(d => d.id !== id));
      } else {
        const errorData = await response.json();
        alert(`Delete failed: ${errorData?.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Delete network error:", err);
      alert("Could not connect to the server to delete.");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreating(true);
    try {
      const response = await fetch(`${API_BASE}/api/documents/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName }),
      });

      if (response.ok) {
        const newCat = await response.json();
        setCategories([...categories, newCat]);
        setDocForm({ ...docForm, category_id: newCat.id });
        setNewCategoryName("");
        setShowNewCategory(false);
      }
    } catch (err) {
      console.error("Error creating category:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docForm?.category_id) return alert("Please select or create a category.");
    if (!selectedFile) return alert("Please select a file to upload.");

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", docForm.title);
      formData.append("category_id", docForm.category_id);
      formData.append("is_private", docForm.is_private);
      formData.append("requires_board_key", docForm.requires_board_key);
      if (user?.id) formData.append("uploaded_by", user.id);
      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE}/api/documents`, { method: "POST", body: formData });

      if (!response.ok) throw new Error("Upload failed");

      alert("Document securely uploaded!");
      setDocForm({ title: "", category_id: "", is_private: false, requires_board_key: false });
      setSelectedFile(null);
      
      const refresh = await fetch(`${API_BASE}/api/documents`);
      const data = await refresh.json();
      setDocuments(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.formCard} style={{ marginTop: "10px" }}>
      <div style={{ marginBottom: "20px" }}>
        <button className={styles.cancelBtn} onClick={onBack}>← Back to Mission Control</button>
      </div>

      <h3>Upload Community Document</h3>
      
      {/* Category Selection Block */}
      <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "10px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showNewCategory ? "10px" : "0" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Document Category</label>
          <button type="button" onClick={() => setShowNewCategory(!showNewCategory)} style={{ background: "none", border: "none", color: "#3b82f6", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}>
            {showNewCategory ? "Cancel" : "+ Create New Category"}
          </button>
        </div>
        {showNewCategory ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" placeholder="e.g., Financials" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
            <button type="button" onClick={handleCreateCategory} disabled={creating} style={{ background: "#2ecc71", color: "white", border: "none", padding: "0 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>{creating ? "..." : "Save"}</button>
          </div>
        ) : (
          <select value={docForm?.category_id || ""} onChange={(e) => setDocForm({...docForm, category_id: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }}>
            <option value="">-- Select a Category --</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        )}
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className={styles.announcementForm}>
        <input type="text" placeholder="Document Title" value={docForm?.title || ""} onChange={(e) => setDocForm({...docForm, title: e.target.value})} required />
        <div 
          onClick={() => document.getElementById("hidden-file-input")?.click()}
          style={{ border: "2px dashed #cbd5e1", borderRadius: "12px", padding: "30px", textAlign: "center", background: selectedFile ? "#f0fdf4" : "#f8fafc", cursor: "pointer" }}
        >
          <p style={{ margin: 0, fontWeight: "600", color: "#475569" }}>{selectedFile ? `Selected: ${selectedFile.name}` : "Drag & Drop file here, or click to browse"}</p>
          <input id="hidden-file-input" type="file" hidden onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "15px 0" }}>
          <input type="checkbox" id="boardKey" checked={!!docForm?.requires_board_key} onChange={(e) => setDocForm({...docForm, requires_board_key: e.target.checked})} />
          <label htmlFor="boardKey" style={{ cursor: "pointer", fontSize: "0.9rem", color: "#334155", fontWeight: "600" }}>Board Access Only</label>
        </div>
        <button type="submit" className={styles.submitBtn} disabled={uploading}>{uploading ? "Uploading..." : "Upload & Publish"}</button>
      </form>
      
      <hr style={{ margin: "30px 0" }} />

      <h3>Community Documents List</h3>
      <div className={styles.documentList}>
        {filteredDocs.map(doc => (
          <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #eee" }}>
            <div><strong>{doc.title}</strong><br /><small>{categories.find(c => c.id === doc.category_id)?.name || "Uncategorized"}</small></div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">View</a>
              <button onClick={() => handleDelete(doc.id)} style={{ color: "red" }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}