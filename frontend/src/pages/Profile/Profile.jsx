import { useState } from "react";
import InviteMember from "../../components/InviteMember/InviteMember";
import styles from "./Profile.module.css";
import { apiFetch } from "../../api";

export default function Profile({ user, onBack, onUserUpdate }) {
  // Local state to manage notification toggles
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    textAlerts: false,
    newsletter: true,
  });

  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
        const response = await apiFetch("/api/residents/avatar", {
          method: "PUT",
          body: JSON.stringify({
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
              photo: data.user?.photo || base64String
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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await apiFetch("/api/residents/password", {
        method: "PUT",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setPasswordMsg("Password updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(data.error || "Could not update the password.");
      }
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError("Network error updating password.");
    } finally {
      setPasswordSaving(false);
    }
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
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: "none" }}
                disabled={uploading}
              />
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

        {/* Right Column: Preferences & Management */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Preferences Card */}
          <div className={styles.card}>
            <h3>Community Preferences</h3>
            <p className={styles.subtext}>
              Manage how you want to receive communication from the HOA Board.
            </p>

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

            <button
              className={styles.saveBtn}
              onClick={() => alert("Preferences saved successfully!")}
            >
              Save Preferences
            </button>
          </div>

          <div className={styles.card}>
            <h3>Password</h3>
            <p className={styles.subtext}>
              Change the password for this login. If you forgot your current password, sign out and use Forgot password on the sign-in page.
            </p>

            <form onSubmit={handlePasswordChange}>
              <div className={styles.field}>
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="confirm-password">Confirm new password</label>
                <input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {passwordError && <p className={styles.statusErr}>{passwordError}</p>}
              {passwordMsg && <p className={styles.statusOk}>{passwordMsg}</p>}

              <button
                type="submit"
                className={styles.saveBtn}
                disabled={passwordSaving}
              >
                {passwordSaving ? "Updating..." : "Update password"}
              </button>
            </form>
          </div>

          {/* Household Management Card */}
          <div className={styles.card}>
            <h3>Household Management</h3>
            <InviteMember user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}