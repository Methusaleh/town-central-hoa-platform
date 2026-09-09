import { useState } from "react";
import BrandMark from "../../components/ui/BrandMark";
import PasswordField from "../../components/ui/PasswordField";
import styles from "./Login.module.css";
import { apiFetch } from "../../api";

export default function ResetPassword({ token, onBack, onNavigateToLogin }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/residents/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
      } else {
        setErrorMsg(data.error || "Could not reset the password.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setErrorMsg("Network error connecting to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>Back to home</button>

      <div className={styles.card}>
        <div className={styles.brandRow}>
          <BrandMark size={28} />
          <span>Town Central</span>
        </div>
        <h2>Choose a new password</h2>
        <p>This link can only be used once and expires after one hour.</p>

        {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

        {done ? (
          <>
            <div className={styles.successBanner}>Password updated. You can sign in now.</div>
            <button type="button" className={styles.submitBtn} onClick={onNavigateToLogin}>
              Sign in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>New Password</label>
              <PasswordField
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Confirm Password</label>
              <PasswordField
                autoComplete="new-password"
                placeholder="Repeat new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading || !token}>
              {loading ? "Saving..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
