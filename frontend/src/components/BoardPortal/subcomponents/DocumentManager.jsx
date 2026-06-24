// File: ./frontend/src/components/BoardPortal/subcomponents/DocumentManager.jsx
import { useState } from "react";
import styles from "../BoardPortal.module.css";

export default function DocumentManager({ user }) {
  const [docForm, setDocForm] = useState({ 
    title: "", 
    file_url: "", 
    is_private: false, 
    requires_board_key: false 
  });
  const API_BASE = "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...docForm, uploaded_by: user?.id || null }),
      });

      if (response.ok) {
        alert("Document added to repository!");
        setDocForm({ title: "", file_url: "", is_private: false, requires_board_key: false });
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <div className={styles.formCard} style={{ marginTop: "10px" }}>
      <h3>Upload Community Document</h3>
      <form onSubmit={handleSubmit} className={styles.announcementForm}>
        <input 
          type="text" placeholder="Document Title" 
          value={docForm.title} 
          onChange={(e) => setDocForm({...docForm, title: e.target.value})} required 
        />
        <input 
          type="url" placeholder="File URL (e.g., Google Drive link)" 
          value={docForm.file_url} 
          onChange={(e) => setDocForm({...docForm, file_url: e.target.value})} required 
        />
        
        <div style={{ display: "flex", gap: "20px", margin: "10px 0" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={docForm.is_private} onChange={(e) => setDocForm({...docForm, is_private: e.target.checked})} />
            Private Record
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input type="checkbox" checked={docForm.requires_board_key} onChange={(e) => setDocForm({...docForm, requires_board_key: e.target.checked})} />
            Board Access Only
          </label>
        </div>
        
        <button type="submit" className={styles.submitBtn}>Upload Document</button>
      </form>
    </div>
  );
}