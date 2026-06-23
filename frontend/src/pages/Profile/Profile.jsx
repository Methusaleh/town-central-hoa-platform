import { useState } from "react";
import styles from "./Profile.module.css";

export default function Profile({ user, onBack, onUserUpdate }) {
  // Local state to manage notification toggles
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    textAlerts: false,
    newsletter: true,
  });

  const [uploading, setUploading] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Convert selected image file to base64 string and ship it to PostgreSQL
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Safety validation check: Limit size to 2MB to keep DB payloads fast
    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select a profile image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadstart = () => setUploading(true);
    
    reader.onloadend = async () => {
      const base64String = reader.result;

      try {
        const response = await fetch(`${API_URL}/api/residents/avatar`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: user?.email,
            photoData: base64String
          })
        });

        const data = await response.json();

        if (response.ok) {
          alert("Profile avatar updated successfully!");
          
          // Trigger the state updater passed down from App.jsx so the 
          // new avatar instantly renders across the entire app workspace shell!
          if (onUserUpdate) {
            onUserUpdate({
              ...user,
              photo: base64String
            });
          }
        } else {
          alert(data.error || "Failed to update profile photo.");
        }
      } catch (err) {
        console.error("Avatar upload network fault:", err);
        alert("Network error updating avatar image profile.");
      } finally {
        setUploading(false);
      }
    };
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>
          ← Back to Dashboard
        </button>
        <h2>Account Settings</h2>
      </header>

      <div className={styles.grid}>
        {/* Left Card: Profile Overview */}
        <div className={styles.card}>
          <div className={styles.avatarSection}>
            <label className={styles.avatarLabel} title="Click to upload custom picture">
              {/* Hidden HTML file stream picker input anchor */}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: "none" }}
                disabled={uploading}
              />
              
              {/* If user has a photo, show it. Otherwise, show the text-avatar fallback */}
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt="Profile Avatar"
                  className={`${styles.avatar} ${uploading ? styles.avatarBlur : ""}`}
                />
              ) : (
                <div className={`${styles.avatarPlaceholderLarge} ${uploading ? styles.avatarBlur : ""}`}>
                  {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "R"}
                </div>
              )}
              
              <div className={styles.avatarHoverBadge}>
                {uploading ? "Saving..." : "📷 Upload"}
              </div>
            </label>

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
            <p>
              <strong>{user?.address || "123 Town Central Dr"}</strong>
            </p>
          </div>
        </div>

        {/* Right Card: Preferences */}
        <div className={styles.card}>
          <h3>Community Preferences</h3>
          <p className={styles.subtext}>
            Manage how you want to receive communication from the HOA Board.
          </p>

          <div className={styles.settingRow}>
            <div>
              <h4>Critical Email Alerts</h4>
              <p>
                Immediate notifications for maintenance closures or safety notices.
              </p>
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

          <button
            className={styles.saveBtn}
            onClick={() => alert("Preferences saved successfully!")}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}