import { useState } from "react";
import styles from "./InviteMember.module.css";

export default function InviteMember({ user }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const handleInvite = async (e) => {
    e.preventDefault();
    setStatus("Sending...");
    
    try {
      const res = await fetch(`${API_URL}/api/residents/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          primary_resident_id: user.id, // Linking back to the current user
          address: user.address 
        })
      });

      if (res.ok) {
        setStatus("✅ Invitation sent!");
        setEmail("");
      } else {
        setStatus("❌ Failed to send invite.");
      }
    } catch (err) {
      setStatus("❌ Network error.");
    }
  };

  return (
    <div className={styles.inviteContainer}>
      <h4>Invite Household Member</h4>
      <p>Send an invitation link to a roommate or family member to join your household account.</p>
      <form onSubmit={handleInvite} className={styles.form}>
        <input 
          type="email" 
          placeholder="member@email.com" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <button type="submit" className={styles.btn}>Send Invite</button>
      </form>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}