import { useState } from "react";
import styles from "./Profile.module.css";

export default function Profile({ user, onBack }) {
  // Local state to manage notification toggles
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    textAlerts: false,
    newsletter: true,
  });

  const handleToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>← Back to Dashboard</button>
        <h2>Account Settings</h2>
      </header>

      <div className={styles.grid}>
        {/* Left Card: Profile Overview */}
        <div className={styles.card}>
          <div className={styles.avatarSection}>
            <img 
              src={user?.photo || "https://via.placeholder.com/150"} 
              alt="Profile Avatar" 
              className={styles.avatar} 
            />
            <h3>{user?.first_name || "Resident"}</h3>
            <span className={styles.badge}>{user?.role || "Resident"}</span>
          </div>
          
          <hr className={styles.divider} />
          
          <div className={styles.infoGroup}>
            <label>Email Address</label>
            <p>{user?.email || "Not linked"}</p>
          </div>

          <div className={styles.infoGroup}>
            <label>Linked Property</label>
            <p><strong>{user?.address || "123 Town Central Dr"}</strong></p>
          </div>
        </div>

        {/* Right Card: Preferences */}
        <div className={styles.card}>
          <h3>Community Preferences</h3>
          <p className={styles.subtext}>Manage how you want to receive communication from the HOA Board.</p>
          
          <div className={styles.settingRow}>
            <div>
              <h4>Critical Email Alerts</h4>
              <p>Immediate notifications for maintenance closures or safety notices.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.emailAlerts} 
              onChange={() => handleToggle("emailAlerts")} 
            />
          </div>

          <div className={styles.settingRow}>
            <div>
              <h4>SMS Mobile Notices</h4>
              <p>Receive text alerts for urgent community updates.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.textAlerts} 
              onChange={() => handleToggle("textAlerts")} 
            />
          </div>

          <div className={styles.settingRow}>
            <div>
              <h4>Monthly Newsletter</h4>
              <p>Stay up to date on community events and meeting minutes.</p>
            </div>
            <input 
              type="checkbox" 
              checked={notifications.newsletter} 
              onChange={() => handleToggle("newsletter")} 
            />
          </div>

          <button className={styles.saveBtn} onClick={() => alert("Preferences saved successfully!")}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}