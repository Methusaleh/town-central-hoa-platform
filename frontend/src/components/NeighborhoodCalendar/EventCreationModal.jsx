import { useState } from "react";
import styles from "./NeighborhoodCalendar.module.css";

export default function EventCreationModal({ onClose, onEventCreated }) {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Community Event");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !eventDate) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("event_date", eventDate);
      formData.append("event_time", eventTime);
      formData.append("location", location.trim());
      formData.append("category", category);
      formData.append("description", description.trim());
      if (selectedFile) formData.append("attachment", selectedFile);

      const res = await fetch(`${API_URL}/api/events`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onEventCreated();
        onClose();
      } else {
        alert("Failed to create event.");
      }
    } catch (err) {
      console.error("Event post network error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3>🗓️ Create Neighborhood Event</h3>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Event Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Annual Block Party" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", boxSizing: "border-box" }}
              required 
            />
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Date *</label>
              <input 
                type="date" 
                value={eventDate} 
                onChange={(e) => setEventDate(e.target.value)} 
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", boxSizing: "border-box" }}
                required 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Time</label>
              <input 
                type="time" 
                value={eventTime} 
                onChange={(e) => setEventTime(e.target.value)} 
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", boxSizing: "border-box" }} 
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Location</label>
            <input 
              type="text" 
              placeholder="e.g. Community Clubhouse" 
              value={location} 
              onChange={(e) => setLocation(e.target.value)} 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", marginTop: "4px", boxSizing: "border-box" }} 
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Description Details</label>
            <textarea 
              placeholder="Event notes or schedule..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", height: "80px", resize: "vertical", marginTop: "4px", boxSizing: "border-box" }} 
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Attach Document / Flyer (Optional)</label>
            <input 
              type="file" 
              onChange={(e) => setSelectedFile(e.target.files[0] || null)} 
              style={{ width: "100%", marginTop: "4px", fontSize: "0.85rem" }} 
            />
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
            <button type="submit" style={{ flex: 1, background: "#2ecc71", color: "white", border: "none", padding: "12px", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }} disabled={loading}>
              {loading ? "Publishing..." : "Publish Event"}
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "12px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}