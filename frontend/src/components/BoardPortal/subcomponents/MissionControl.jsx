import { useNavigate } from "react-router-dom";
import styles from "../BoardPortal.module.css";
import { PATHS, adminToolPaths } from "../../../layout/navConfig";

export default function MissionControl() {
  const navigate = useNavigate();
  const adminTools = [
    { id: "requests", label: "Operations & Tickets" },
    { id: "roster", label: "Master Roster" },
    { id: "financials", label: "Assessment Ledger" },
    { id: "admin-vendors", label: "Vendor Controls" },
    { id: "admin-documents", label: "Document Manager" },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Mission Control</h2>
        <button className={styles.cancelBtn} onClick={() => navigate(PATHS.home)}>
          ← Back to Resident Portal
        </button>
      </header>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
        {adminTools.map((tool) => (
          <button 
            key={tool.id}
            onClick={() => navigate(adminToolPaths[tool.id])}
            style={{ 
              padding: "24px", 
              borderRadius: "10px", 
              border: "1px solid var(--tc-line)", 
              background: "var(--tc-bg-elevated)", 
              color: "var(--tc-ink)",
              cursor: "pointer", 
              textAlign: "left",
              fontWeight: "650",
              fontSize: "1.05rem",
            }}
          >
            {tool.label}
          </button>
        ))}
      </div>
    </div>
  );
}