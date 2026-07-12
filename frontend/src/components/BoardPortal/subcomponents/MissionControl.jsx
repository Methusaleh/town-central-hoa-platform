// ./frontend/src/components/BoardPortal/subcomponents/MissionControl.jsx
import styles from "../BoardPortal.module.css";

export default function MissionControl({ onNavigate }) {
  const adminTools = [
    { id: "requests", label: "Operations & Tickets", icon: "📋" },
    { id: "roster", label: "Master Roster", icon: "👥" },
    { id: "financials", label: "Assessment Ledger", icon: "💰" },
    { id: "admin-vendors", label: "Vendor Controls", icon: "🏢" }, // Note the "admin-" prefix
    { id: "admin-documents", label: "Document Manager", icon: "📄" }, // Note the "admin-" prefix
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Mission Control</h2>
        <button className={styles.cancelBtn} onClick={() => onNavigate("feed")}>
          ← Back to Resident Portal
        </button>
      </header>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
        {adminTools.map((tool) => (
          <button 
            key={tool.id}
            onClick={() => onNavigate(tool.id)}
            style={{ 
              padding: "30px", 
              borderRadius: "20px", 
              border: "1px solid #e2e8f0", 
              background: "white", 
              cursor: "pointer", 
              textAlign: "left",
              display: "flex", 
              flexDirection: "column", 
              gap: "10px" 
            }}
          >
            <span style={{ fontSize: "2rem" }}>{tool.icon}</span>
            <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}