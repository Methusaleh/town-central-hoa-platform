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

  const API_BASE = import.meta.env.VITE_API_URL || "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  useEffect(() => {
    fetch(`${API_BASE}/api/documents/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Error fetching categories:", err));
  }, [API_BASE]);

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
      
      {/* INLINE CATEGORY CREATOR */}
      <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "10px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showNewCategory ? "10px" : "0" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>Document Category</label>
          <button 
            type="button" 
            onClick={() => setShowNewCategory(!showNewCategory)}
            style={{ background: "none", border: "none", color: "#3b82f6", fontWeight: "600", cursor: "pointer", fontSize: "0.85rem" }}
          >
            {showNewCategory ? "Cancel" : "+ Create New Category"}
          </button>
        </div>

        {showNewCategory ? (
          <div style={{ display: "flex", gap: "10px" }}>
            <input 
              type="text" 
              placeholder="e.g., 2026 Financials, Meeting Minutes" 
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
            />
            <button 
              type="button" 
              onClick={handleCreateCategory}
              disabled={creating}
              style={{ background: "#2ecc71", color: "white", border: "none", padding: "0 20px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
            >
              {creating ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <select 
            value={docForm.category_id} 
            onChange={(e) => setDocForm({...docForm, category_id: e.target.value})}
            style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "1rem", backgroundColor: "white" }}
          >
            <option value="">-- Select a Category --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* DOCUMENT UPLOAD FORM */}
      <form onSubmit={handleSubmit} className={styles.announcementForm} style={{ marginTop: 0 }}>
        
        <input 
          type="text" 
          placeholder="Document Title (e.g., Q1 Budget Report)" 
          value={docForm.title} 
          onChange={(e) => setDocForm({...docForm, title: e.target.value})} 
          required 
        />
        
        {/* NATIVE FILE PICKER */}
        <input 
          id="file-upload"
          type="file" 
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          onChange={(e) => setSelectedFile(e.target.files[0])} 
          required 
          style={{ padding: "10px", border: "1px dashed #cbd5e1", borderRadius: "8px", background: "#f8fafc", cursor: "pointer" }}
        />
        <small style={{ color: "#64748b", marginTop: "-10px", marginBottom: "10px", display: "block", fontSize: "0.8rem" }}>
          Max file size: 5MB. Supported formats: PDF, Word, Excel, Images.
        </small>
        
        <div style={{ display: "flex", gap: "20px", margin: "10px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.9rem" }}>
            <input type="checkbox" checked={docForm.is_private} onChange={(e) => setDocForm({...docForm, is_private: e.target.checked})} />
            Private Record (Hidden from search engines)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#475569", fontSize: "0.9rem" }}>
            <input type="checkbox" checked={docForm.requires_board_key} onChange={(e) => setDocForm({...docForm, requires_board_key: e.target.checked})} />
            Board Access Only
          </label>
        </div>
        
        <button type="submit" className={styles.submitBtn} disabled={uploading}>
          {uploading ? "Uploading to Cloudflare..." : "Upload & Publish Document"}
        </button>
      </form>
    </div>
  );
}