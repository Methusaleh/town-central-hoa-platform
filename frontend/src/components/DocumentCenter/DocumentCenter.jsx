import { useState } from "react";
import styles from "./DocumentCenter.module.css";

export default function DocumentCenter({ user }) {
  // Mock asset payload matching your cloud architecture links
  const documentCategories = [
    {
      id: "welcome",
      title: "🏡 Onboarding & Welcome",
      accessLevel: "all",
      description: "Essential materials for new homeowners getting settled in Town Central.",
      files: [
        { name: "Official Digital Welcome Packet (2026).pdf", size: "2.4 MB", url: "https://town-central-hoa-platform.vercel.app/public-docs/Welcome_Packet_2026.pdf" },
        { name: "Community Amenity Keycard Guide.pdf", size: "840 KB", url: "#" },
        { name: "Piedmont Waste & Recycling Schedule.pdf", size: "1.1 MB", url: "#" }
      ]
    },
    {
      id: "governing",
      title: "📜 Governing Documents",
      accessLevel: "all",
      description: "The legal declarations, bylaws, and protective covenants of the community.",
      files: [
        { name: "HOA Declaration of Covenants, Conditions & Restrictions (CC&Rs).pdf", size: "5.8 MB", url: "#" },
        { name: "Community Bylaws & Voting Regulations.pdf", size: "1.9 MB", url: "#" },
        { name: "Approved Architectural Design Guidelines.pdf", size: "3.2 MB", url: "#" }
      ]
    },
    {
      id: "forms",
      title: "📝 Application Sheets & Forms",
      accessLevel: "all",
      description: "Blank template forms to print or download for board submittals.",
      files: [
        { name: "ARC Property Modification Application Form.pdf", size: "450 KB", url: "#" },
        { name: "Clubhouse Private Reservation Contract.pdf", size: "620 KB", url: "#" }
      ]
    },
    {
      id: "financials",
      title: "📊 Financials & Budgets",
      accessLevel: "board_only", // Gated
      files: [
        { name: "Annual Approved Budget 2026.pdf", size: "1.2 MB", url: "#" },
        { name: "Q1 Financial Ledger Summary.pdf", size: "900 KB", url: "#" }
      ]
    }
  ];

  const handleDownload = (file) => {
    if (file.url === "#") {
      alert(`"${file.name}" is a placeholder link for the demo. The Welcome Packet is fully active!`);
      return;
    }
    window.open(file.url, "_blank");
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>Community Document Repository</h2>
        <p>Access official neighborhood files, legal governance covenants, and application forms directly from cloud storage.</p>
      </header>

      <div className={styles.grid}>
        {documentCategories
          // Filter out board-only docs if the user is not authorized
          .filter((cat) => 
            cat.accessLevel === "all" || 
            (user?.role === "board_member" || user?.role === "super_admin")
          )
          .map((category) => (
            <div key={category.id} className={styles.categoryCard}>
              <div className={styles.categoryHeader}>
                <h3>{category.title}</h3>
                <p>{category.description}</p>
              </div>
              
              <ul className={styles.fileList}>
                {category.files.map((file, idx) => (
                  <li key={idx} className={styles.fileRow} onClick={() => handleDownload(file)}>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>{file.size}</span>
                    </div>
                    <button className={styles.downloadBtn}>
                      📥 <span className={styles.btnText}>Download</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}