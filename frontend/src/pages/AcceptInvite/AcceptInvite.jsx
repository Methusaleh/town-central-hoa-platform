import { useState, useEffect } from "react";
import BrandMark from "../../components/ui/BrandMark";
import PasswordField from "../../components/ui/PasswordField";
import styles from "./AcceptInvite.module.css";
import { apiFetch } from "../../api";

export default function AcceptInvite({ onBack, onJoinSuccess, inviteToken }) {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("verifying");
  const [inviteData, setInviteData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    password: "",
  });

  const API_TOKEN = inviteToken || new URLSearchParams(window.location.search).get("invite");

  useEffect(() => {
    if (!API_TOKEN) {
      setStatus("invalid");
      return;
    }

    setToken(API_TOKEN);

    apiFetch(`/api/residents/invite/${API_TOKEN}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired token");
        return res.json();
      })
      .then((data) => {
        setInviteData(data);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [API_TOKEN]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const res = await apiFetch("/api/residents/invite/accept", {
        method: "POST",
        body: JSON.stringify({
          token,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onJoinSuccess(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to create account. Please try again.");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection.");
    }
  };

  if (status === "verifying") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brandRow}>
            <BrandMark size={28} />
            <span>Town Central</span>
          </div>
          <h2>Checking invitation…</h2>
          <p>One moment while we confirm this link.</p>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.brandRow}>
            <BrandMark size={28} />
            <span>Town Central</span>
          </div>
          <h2>Link expired or invalid</h2>
          <p>This invitation link has either already been used or does not exist.</p>
          <button className={styles.submitBtn} onClick={onBack}>Return to home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <BrandMark size={28} />
          <span>Town Central</span>
        </div>
        <h2>Join your household</h2>
        <p>You have been invited to join the resident portal for <strong>{inviteData?.address}</strong>.</p>

        {errorMsg && <div className={styles.errorBanner}>{errorMsg}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            <input type="email" value={inviteData?.email || ""} disabled className={styles.disabledInput} />
          </div>
          <div className={styles.inputGroup}>
            <label>First Name</label>
            <input type="text" required onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} />
          </div>
          <div className={styles.inputGroup}>
            <label>Last Name</label>
            <input type="text" required onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} />
          </div>
          <div className={styles.inputGroup}>
            <label>Create Password</label>
            <PasswordField
              autoComplete="new-password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <button type="submit" className={styles.submitBtn}>Activate profile</button>
        </form>
      </div>
    </div>
  );
}
