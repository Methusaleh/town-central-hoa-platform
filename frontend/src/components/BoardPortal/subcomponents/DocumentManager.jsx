import { useState, useEffect } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user }) {
  const [categories, setCategories] = useState([]);
  
  // 1. Removed file_url and added dedicated file state
  const [docForm, setDocForm] = useState({ 
    title: "", 
    category_id: "", 
    is_private: false, 
    requires_board_key: false 
  });
  const [selectedFile, setSelectedFile] = useState(null);
  
  // UI States
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [documents, setDocuments] = useState([]);

  const API_BASE = import.meta.env.VITE_API_URL || "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  useEffect(() => {
    fetch(`${API_BASE}/api/documents/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Error fetching categories:", err));
  }, [API_BASE]);

  useEffect(() => {
    fetch(`${API_BASE}/api/documents`)
      .then(res => res.json())
      .then(data => setDocuments(data));
  }, [API_BASE]);

  // 2. Filtered document list logic
  const filteredDocs = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterCategory === "" || doc.category_id.toString() === filterCategory)
  );

  // 3. Delete Handler
  const handleDelete = async (id) => {
    if (!confirm("Are you sure? This will delete the file from storage forever.")) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/documents/${id}`, { method: "DELETE" });
      
      if (response.ok) {
        // Success! Now remove it from the UI
        setDocuments(documents.filter(d => d.id !== id));
      } else {
        const errorData = await response.json();
        alert(`Delete failed: ${errorData.error}`);
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
      } else {
        const errorData = await response.json();
        alert(`Failed to save category: ${errorData.error || "Unknown server error"}`);
      }
    } catch (err) {
      console.error("Error creating category:", err);
      alert("Failed to reach the server.");
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.category_id) return alert("Please select or create a category.");
    if (!selectedFile) return alert("Please select a file to upload.");

    setUploading(true);

    try {
      // 2. Initialize FormData package
      const formData = new FormData();
      
      // Append text fields
      formData.append("title", docForm.title);
      formData.append("category_id", docForm.category_id);
      formData.append("is_private", docForm.is_private);
      formData.append("requires_board_key", docForm.requires_board_key);
      if (user?.id) formData.append("uploaded_by", user.id);
      
      // Append physical file (must match "file" expected by multer)
      formData.append("file", selectedFile);

      // 3. Send without setting Content-Type!
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        alert("Document securely uploaded and published!");
        setDocForm({ title: "", category_id: "", is_private: false, requires_board_key: false });
        setSelectedFile(null);
        document.getElementById("file-upload").value = ""; // Reset input visually
      } else {
        const errorData = await response.json();
        alert(`Upload failed: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("A network error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.formCard} style={{ marginTop: "10px" }}>
      <h3>Upload Community Document</h3>
      
      {/* --- CATEGORY CREATOR --- */}
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
          <select value={docForm.category_id} onChange={(e) => setDocForm({...docForm, category_id: e.target.value})} style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "white" }}>
            <option value="">-- Select a Category --</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        )}
      </div>

      {/* --- UPLOAD FORM WITH BOARD TOGGLE --- */}
      <form onSubmit={handleSubmit} className={styles.announcementForm}>
        <input 
          type="text" 
          placeholder="Document Title" 
          value={docForm.title} 
          onChange={(e) => setDocForm({...docForm, title: e.target.value})} 
          required 
        />

        <input 
          id="file-upload" 
          type="file" 
          onChange={(e) => setSelectedFile(e.target.files[0])} 
          required 
        />

        {/* Restore the Board-Only Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "15px 0" }}>
          <input 
            type="checkbox" 
            id="boardKey"
            checked={docForm.requires_board_key} 
            onChange={(e) => setDocForm({...docForm, requires_board_key: e.target.checked})} 
            style={{ cursor: "pointer", width: "18px", height: "18px" }}
          />
          <label htmlFor="boardKey" style={{ cursor: "pointer", fontSize: "0.9rem", color: "#334155", fontWeight: "600" }}>
            Board Access Only (Hide from residents)
          </label>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload & Publish"}
        </button>
      </form>
      
      <hr style={{ margin: "30px 0" }} />

      {/* --- SEARCH, FILTER & LIST (The code you already have) --- */}
      <h3>Community Documents</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input placeholder="Search documents..." onChange={(e) => setSearchTerm(e.target.value)} style={{ flex: 2, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }} />
        <select onChange={(e) => setFilterCategory(e.target.value)} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

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