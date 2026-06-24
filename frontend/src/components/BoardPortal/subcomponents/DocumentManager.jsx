import { useState, useEffect } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user }) {
  const [categories, setCategories] = useState([]);
  const [docForm, setDocForm] = useState({ 
    title: "", 
    file_url: "", 
    category_id: "", 
    is_private: false, 
    requires_board_key: false 
  });
  
  // States for the inline "Create Category" tool
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  // 1. Fetch existing categories on load
  useEffect(() => {
    fetch(`${API_BASE}/api/documents/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error("Error fetching categories:", err));
  }, [API_BASE]);

  // 2. Handle creating a brand new category
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
        // Add to our list and automatically select it for the user
        setCategories([...categories, newCat]);
        setDocForm({ ...docForm, category_id: newCat.id });
        setNewCategoryName("");
        setShowNewCategory(false);
      }
    } catch (err) {
      console.error("Error creating category:", err);
      alert("Failed to create category.");
    } finally {
      setCreating(false);
    }
  };

  // 3. Handle submitting the actual document
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!docForm.category_id) {
      alert("Please select or create a category for this document.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...docForm, uploaded_by: user?.id || null }),
      });

      if (response.ok) {
        alert("Document added to repository!");
        setDocForm({ title: "", file_url: "", category_id: "", is_private: false, requires_board_key: false });
      } else {
        alert("Failed to upload document.");
      }
    } catch (err) {
      console.error("Upload error:", err);
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
          type="text" placeholder="Document Title (e.g., Q1 Budget Report)" 
          value={docForm.title} 
          onChange={(e) => setDocForm({...docForm, title: e.target.value})} required 
        />
        <input 
          type="url" placeholder="File URL (e.g., Google Drive or Dropbox link)" 
          value={docForm.file_url} 
          onChange={(e) => setDocForm({...docForm, file_url: e.target.value})} required 
        />
        
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
        
        <button type="submit" className={styles.submitBtn}>Upload & Publish Document</button>
      </form>
    </div>
  );
}