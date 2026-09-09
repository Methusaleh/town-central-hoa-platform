import { useRef, useState } from "react";
import InviteMember from "../../components/InviteMember/InviteMember";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import PasswordField from "../../components/ui/PasswordField";
import { applyTheme, getStoredTheme } from "../../layout/theme";
import styles from "./Profile.module.css";
import { apiFetch } from "../../api";

function roleLabel(role) {
  if (role === "super_admin") return "Site admin";
  if (role === "board_member") return "Board member";
  return "Resident";
}

export default function Profile({ user, onUserUpdate }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [theme, setTheme] = useState(getStoredTheme);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleTheme = (next) => {
    applyTheme(next);
    setTheme(next);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Choose a photo under 2MB.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setPhotoError("");
    try {
      const body = new FormData();
      body.append("photo", file);
      const response = await apiFetch("/api/residents/avatar", {
        method: "PUT",
        body,
      });
      const data = await response.json();

      if (response.ok) {
        onUserUpdate?.({ ...user, photo: data.user?.photo });
      } else {
        setPhotoError(data.error || "Could not update the photo.");
      }
    } catch (err) {
      console.error("Avatar upload network fault:", err);
      setPhotoError("Network error updating the photo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
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
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Account</p>
        <h2>Settings</h2>
        <p>Your login, photo, and household. This is you on the site — not a shared board inbox.</p>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.avatarSection}>
            <Avatar name={user?.first_name} photo={user?.photo} size="xl" />
            <h3>{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Resident"}</h3>
            <span className={styles.badge}>{roleLabel(user?.role)}</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              hidden
              disabled={uploading}
            />
            <Button
              variant="secondary"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Saving…" : user?.photo ? "Change photo" : "Add a photo"}
            </Button>
            {photoError && <p className={styles.statusErr}>{photoError}</p>}
          </div>

          <div className={styles.infoGroup}>
            <label>Email</label>
            <p>{user?.email || "Not linked"}</p>
          </div>
          <div className={styles.infoGroup}>
            <label>Property</label>
            <p>{user?.address || "—"}</p>
          </div>
        </div>

        <div className={styles.stack}>
          <div className={styles.card}>
            <h3>Appearance</h3>
            <p className={styles.subtext}>
              Paper is the default. Dark is there if you prefer it — try it and we can keep or drop it.
            </p>
            <div className={styles.themeRow}>
              <button
                type="button"
                className={`${styles.themeBtn} ${theme === "light" ? styles.themeOn : ""}`}
                onClick={() => handleTheme("light")}
              >
                Paper
              </button>
              <button
                type="button"
                className={`${styles.themeBtn} ${theme === "dark" ? styles.themeOn : ""}`}
                onClick={() => handleTheme("dark")}
              >
                Dark
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <h3>How we reach you</h3>
            <p className={styles.subtext}>
              Announcements, alerts, and Home live in the app. Email is used for password resets, claim letters, and replies to messages you send the board. Text messages are not sending yet — there is no toggle to flip until they are.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Password</h3>
            <p className={styles.subtext}>
              If you forgot the current one, sign out and use Forgot password on the sign-in page.
            </p>
            <form onSubmit={handlePasswordChange}>
              <div className={styles.field}>
                <label htmlFor="current-password">Current password</label>
                <PasswordField
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="new-password">New password</label>
                <PasswordField
                  id="new-password"
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
                <PasswordField
                  id="confirm-password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {passwordError && <p className={styles.statusErr}>{passwordError}</p>}
              {passwordMsg && <p className={styles.statusOk}>{passwordMsg}</p>}
              <Button type="submit" disabled={passwordSaving}>
                {passwordSaving ? "Updating…" : "Update password"}
              </Button>
            </form>
          </div>

          <div className={styles.card}>
            <h3>Anyone else at this address?</h3>
            <InviteMember user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
