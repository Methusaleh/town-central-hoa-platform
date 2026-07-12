import { useState, useEffect } from "react";
import styles from "./AcceptInvite.module.css";

export default function AcceptInvite({ onBack, onJoinSuccess }) {
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("verifying"); // "verifying", "valid", "invalid"
  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    password: ""
  });

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  useEffect(() => {
    // Extract the token from the URL parameters
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get("invite");

    if (!inviteToken) {
      setStatus("invalid");
      return;
    }

    setToken(inviteToken);

    // Verify the token has not been used yet
    fetch(`${API_URL}/api/residents/invite/${inviteToken}`)
      .then((res) => {
        if (!res.ok) throw new Error("Invalid or expired token");
        return res.json();
      })
      .then((data) => {
        setInviteData(data);
        setStatus("valid");
      })
      .catch(() => setStatus("invalid"));
  }, [API_URL]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const res = await fetch(`${API_URL}/api/residents/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          first_name: formData.first_name,
          last_name: formData.last_name,
          password: formData.password
        })
      });

      if (res.ok) {
        // Clear the URL parameter so it doesn't persist on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        onJoinSuccess();
      } else {
        alert("Failed to create account. Please try again.");
      }
    } catch (err) {
      alert("Network error. Please check your connection.");
    }
  };

  if (status === "verifying") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Validating Invitation...</h2>
        </div>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h2>Link Expired or Invalid</h2>
          <p>This invitation link has either already been used or does not exist.</p>
          <button className={styles.submitBtn} onClick={onBack}>Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>Join Your Household</h2>
        <p>You have been invited to join the resident portal for <strong>{inviteData?.address}</strong>.</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Email Address</label>
            {/* Disabled because the token is permanently locked to the invited email */}
            <input type="email" value={inviteData?.email || ""} disabled className={styles.disabledInput} />
          </div>
          <div className={styles.inputGroup}>
            <label>First Name</label>
            <input type="text" required onChange={(e) => setFormData({...formData, first_name: e.target.value})} />
          </div>
          <div className={styles.inputGroup}>
            <label>Last Name</label>
            <input type="text" required onChange={(e) => setFormData({...formData, last_name: e.target.value})} />
          </div>
          <div className={styles.inputGroup}>
            <label>Create Password</label>
            <input type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} />
          </div>
          <button type="submit" className={styles.submitBtn}>Activate Profile</button>
        </form>
      </div>
    </div>
  );
}