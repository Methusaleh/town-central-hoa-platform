import { useState, useEffect, useRef } from "react";
import MissionControl from "../../components/BoardPortal/subcomponents/MissionControl";
import RosterDirectory from "../../components/BoardPortal/subcomponents/RosterDirectory";
import FinancialLedger from "../../components/BoardPortal/subcomponents/FinancialLedger";
import VendorControls from "../../components/BoardPortal/subcomponents/VendorControls";
import OperationsDashboard from "../../components/BoardPortal/subcomponents/OperationsDashboard";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import CommunityAlerts from "../../components/CommunityAlerts/CommunityAlerts";
import WaterCooler from "../../components/WaterCooler/WaterCooler";
import ResidentLedger from "../../components/ResidentLedger/ResidentLedger";
import DuesCard from "../../components/DuesCard/DuesCard";
import NeighborhoodCalendar from "../../components/NeighborhoodCalendar/NeighborhoodCalendar";
import RequestForm from "../../components/RequestForm/RequestForm";
import VendorDirectory from "../../components/VendorDirectory/VendorDirectory";
import DocumentCenter from "../../components/DocumentCenter/DocumentCenter";
import DocumentManager from "../../components/BoardPortal/subcomponents/DocumentManager";
import GuidelinesModal from "../../components/GuidelinesModal/GuidelinesModal";
import styles from "./Dashboard.module.css";
import { apiFetch } from "../../api";

export default function Dashboard({ user, onLogout, onNavigateToProfile, onUserUpdate }) {
  const [activeTab, setActiveTab] = useState("feed");
  const [isFeedOpen, setIsFeedOpen] = useState(false); // Collapsed by default

  // --- GUIDELINES WALL STATE ---
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(!user?.agreed_to_guidelines);

  // Data States for Quick-Look Widgets
  const [requests, setRequests] = useState([]);
  const [masterRoster, setMasterRoster] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [viewMode, setViewMode] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  
  const [rosterForm, setRosterForm] = useState({ first_name: "", last_name: "", email: "", street_address: "" });
  const [financeForm, setFinanceForm] = useState({ street_address: "", balance: "", status: "Pending" });
  const [financeStatus, setFinanceStatus] = useState({ text: "", type: "" });
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });

  const settingsRef = useRef(null);
  const isBoard = user?.role === "board_member" || user?.role === "super_admin";

  useEffect(() => {
    if (isBoard) {
      apiFetch("/api/requests/admin/all")
        .then((res) => res.json())
        .then((data) => {
          setRequests(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Admin requests fetch error:", err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    apiFetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        setRecentAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      })
      .catch((err) => console.error("Alerts preview fetch error:", err));

    apiFetch("/api/watercooler")
      .then((res) => res.json())
      .then((data) => {
        setRecentPosts(Array.isArray(data.posts) ? data.posts : []);
      })
      .catch((err) => console.error("Watercooler preview fetch error:", err));

    apiFetch("/api/announcements")
      .then((res) => res.json())
      .then((data) => {
        setRecentAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
      })
      .catch((err) => console.error("Announcements preview fetch error:", err));
  }, [isBoard]);

  const fetchRosterData = async () => {
    try {
      const response = await apiFetch("/api/residents/master-list-placeholder");
      const data = await response.json();
      setMasterRoster(data || []);
    } catch (err) {
      console.error("Roster fetch error:", err);
    }
  };

  const fetchVendorsData = async () => {
    try {
      const response = await apiFetch("/api/vendors");
      const data = await response.json();
      setVendorsList(data || []);
    } catch (err) {
      console.error("Vendor fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "roster" || activeTab === "financials") fetchRosterData();
    if (activeTab === "vendors" || activeTab === "admin-vendors") fetchVendorsData();
  }, [activeTab]);

  const handleResolve = async (requestId) => {
    try {
      const response = await apiFetch(`/api/requests/${requestId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ adminName: user?.first_name || "Admin" }),
      });
      if (response.ok) {
        setRequests(
          requests.map((req) =>
            req.id === requestId ? { ...req, status: "Resolved" } : req,
          ),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const response = await apiFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          resident_id: user?.id || null,
          first_name: user?.first_name || "Resident",
          last_name: user?.last_name || "",
          type: "Board Message",
          subject: contactForm.subject,
          description: contactForm.message,
        }),
      });
      if (response.ok) {
        alert("Message delivered to the Board!");
        setContactForm({ subject: "", message: "" });
        setShowContactModal(false);
      } else {
        alert("Failed to send message.");
      }
    } catch (err) {
      console.error("Contact submission fault:", err);
      alert("Network error.");
    } finally {
      setSending(false);
    }
  };

  const handleOnboardResident = async (e, sendWelcomePacket) => {
    e.preventDefault();
    const generatedToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const response = await apiFetch("/api/residents", {
        method: "POST",
        body: JSON.stringify({
          ...rosterForm,
          onboarding_token: generatedToken,
          send_welcome: sendWelcomePacket
        })
      });

      if (response.ok) {
        alert(`Property added! Claim Code: ${generatedToken}`);
        fetchRosterData();
        setShowForm(false);
        setRosterForm({ first_name: "", last_name: "", email: "", street_address: "" });
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      alert("Failed to save property.");
    }
  };

  return (
    <div className={styles.layout}>
      {/* GUIDELINES ACCEPTANCE WALL OVERLAY */}
      {showGuidelinesModal && (
        <GuidelinesModal 
          user={user} 
          onAgree={() => {
            setShowGuidelinesModal(false);
            const updatedUser = { ...user, agreed_to_guidelines: true };
            if (onUserUpdate) onUserUpdate(updatedUser);
          }} 
        />
      )}
      
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>

      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          <div className={styles.profileHeader} ref={settingsRef}>
            {user?.photo ? (
              <img src={user.photo} alt="Avatar" className={styles.userAvatarMini} />
            ) : (
              <div className={styles.avatarPlaceholderMini}>
                {user?.first_name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.userInfoMini}>
              <h4>{user?.first_name}</h4>
            </div>
            <div className={styles.settingsTrigger} onClick={() => setShowSettings(!showSettings)}>
              ⚙️
            </div>
            {showSettings && (
              <div className={styles.settingsDropdown}>
                <button className={styles.dropdownBtn} onClick={onNavigateToProfile}>
                  Settings
                </button>
                <button className={`${styles.dropdownBtn} ${styles.logoutText}`} onClick={onLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            className={`${styles.navItem} ${activeTab === "feed" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("feed")}
          >
            🏠 Home Dashboard
          </button>

          {/* EXPANDABLE NEIGHBORHOOD FEED SECTION (Collapsed by default) */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <button
              className={styles.navItem}
              onClick={() => setIsFeedOpen(!isFeedOpen)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span>🌐 Neighborhood Feed</span>
              <span style={{ fontSize: "0.75rem" }}>{isFeedOpen ? "▲" : "▼"}</span>
            </button>

            {isFeedOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "15px", marginTop: "6px" }}>
                <button
                  className={`${styles.navItem} ${activeTab === "events" ? styles.activeNav : ""}`}
                  onClick={() => setActiveTab("events")}
                  style={{ padding: "10px 14px", fontSize: "0.85rem" }}
                >
                  🗓️ Events & Calendar
                </button>
                <button
                  className={`${styles.navItem} ${activeTab === "announcements" ? styles.activeNav : ""}`}
                  onClick={() => setActiveTab("announcements")}
                  style={{ padding: "10px 14px", fontSize: "0.85rem" }}
                >
                  📌 Announcements
                </button>
                <button
                  className={`${styles.navItem} ${activeTab === "alerts" ? styles.activeNav : ""}`}
                  onClick={() => setActiveTab("alerts")}
                  style={{ padding: "10px 14px", fontSize: "0.85rem" }}
                >
                  🚨 Community Alerts
                </button>
                <button
                  className={`${styles.navItem} ${activeTab === "watercooler" ? styles.activeNav : ""}`}
                  onClick={() => setActiveTab("watercooler")}
                  style={{ padding: "10px 14px", fontSize: "0.85rem" }}
                >
                  🌴 Water-Cooler
                </button>
              </div>
            )}
          </div>

          <button
            className={`${styles.navItem} ${activeTab === "maintenance" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            📋 Maintenance & ARC
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "dues" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("dues")}
          >
            💰 My Dues
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "vendors" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("vendors")}
          >
            🏢 Trusted Companies
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "documents" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("documents")}
          >
            📄 Community Documents
          </button>
          <button onClick={() => setShowContactModal(true)} className={styles.navItem}>
            ✉️ Contact the Board
          </button>

          {(user?.role === "board_member" || user?.role === "super_admin") && (
            <button
              className={`${styles.navItem} ${activeTab === "mission-control" ? styles.activeNav : ""}`}
              onClick={() => setActiveTab("mission-control")}
            >
              🛡️ Admin Tools
            </button>
          )}
        </nav>
      </aside>

      <main className={styles.main}>
        {activeTab === "feed" && (
          <div className={styles.socialStreamContainer}>
            <div className={styles.socialWelcomeCard}>
              <h2>Welcome back, {user?.first_name}! 👋</h2>
              <p>Catch up on the latest neighborhood updates, social alerts, and upcoming events.</p>
            </div>

            {/* Calendar Widget */}
            <NeighborhoodCalendar user={user} />

            {/* Larger Quick-Look Widgets Grid (Accommodating 4-5 items) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Recent Alerts Quick Widget (Lists up to 5) */}
              <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", minHeight: "220px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "1rem" }}>🚨 Recent Alerts</h4>
                  <button onClick={() => setActiveTab("alerts")} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>View All →</button>
                </div>
                {recentAlerts.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>No active alerts.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {recentAlerts.slice(0, 5).map(alert => (
                      <div key={alert.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>
                        <strong>{alert.category}:</strong> {(alert.content || "").substring(0, 45)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Water-Cooler Quick Widget (Lists up to 5) */}
              <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", minHeight: "220px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, fontSize: "1rem" }}>🌴 Water-Cooler Chat</h4>
                  <button onClick={() => setActiveTab("watercooler")} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>View All →</button>
                </div>
                {recentPosts.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>No posts yet.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {recentPosts.slice(0, 5).map(post => (
                      <div key={post.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.85rem" }}>
                        <strong>{post.author_name}:</strong> {(post.content || "").substring(0, 45)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Announcements Quick Preview Widget (Lists up to 5) */}
            <div style={{ background: "white", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontSize: "1rem" }}>📌 Recent Announcements</h4>
                <button onClick={() => setActiveTab("announcements")} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>View All →</button>
              </div>
              {recentAnnouncements.length === 0 ? (
                <p style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>No announcements posted yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {recentAnnouncements.slice(0, 5).map(ann => (
                    <div key={ann.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.9rem" }}>
                      <strong>{ann.title}</strong> — <span style={{ color: "#64748b" }}>{(ann.content || "").substring(0, 60)}...</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "events" && <div className={styles.fadeContent}><NeighborhoodCalendar user={user} /></div>}
        {activeTab === "announcements" && <div className={styles.fadeContent}><AnnouncementFeed user={user} /></div>}
        {activeTab === "alerts" && <div className={styles.fadeContent}><CommunityAlerts user={user} /></div>}
        {activeTab === "watercooler" && <div className={styles.fadeContent}><WaterCooler user={user} /></div>}
        {activeTab === "maintenance" && <div className={styles.fadeContent}><RequestForm user={user} /></div>}
        {activeTab === "dues" && (
          <div className={styles.fadeContent} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <DuesCard user={user} />
            <ResidentLedger user={user} />
          </div>
        )}
        {activeTab === "vendors" && <div className={styles.fadeContent}><VendorDirectory /></div>}
        {activeTab === "documents" && <div className={styles.fadeContent}><DocumentCenter user={user} /></div>}

        {/* --- ADMIN VIEWS --- */}
        {activeTab === "mission-control" && <div className={styles.fadeContent}><MissionControl onNavigate={setActiveTab} /></div>}
        {activeTab === "requests" && (
          <div className={styles.fadeContent}>
            <OperationsDashboard 
              onBack={() => setActiveTab("mission-control")} 
              requests={requests} 
              loading={loading} 
              handleResolve={handleResolve} 
              viewMode={viewMode} 
              onToggleView={() => setViewMode(viewMode === "active" ? "archived" : "active")}
            />
          </div>
        )}
        {activeTab === "roster" && (
          <div className={styles.fadeContent}>
            <RosterDirectory 
              onBack={() => setActiveTab("mission-control")} 
              masterRoster={masterRoster} 
              showRosterModal={showForm} 
              setShowRosterModal={setShowForm}
              rosterForm={rosterForm || {}} 
              setRosterForm={setRosterForm}
              rosterStatus={financeStatus}
              handleOnboardResident={handleOnboardResident}
            />
          </div>
        )}
        {activeTab === "financials" && <div className={styles.fadeContent}><FinancialLedger onBack={() => setActiveTab("mission-control")} masterRoster={masterRoster} user={user} /></div>}
        {activeTab === "admin-vendors" && <div className={styles.fadeContent}><VendorControls onBack={() => setActiveTab("mission-control")} /></div>}
        {activeTab === "admin-documents" && <div className={styles.fadeContent}><DocumentManager user={user} onBack={() => setActiveTab("mission-control")} /></div>}
      </main>

      {showContactModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowContactModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>Contact the Board</h3>
            <p>Send a message directly to the HOA Executive Board.</p>
            <form onSubmit={handleContactSubmit} className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>Subject</label>
                <input 
                  type="text" 
                  required 
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({...contactForm, subject: e.target.value})} 
                />
              </div>
              <div className={styles.modalInputGroup}>
                <label>Message</label>
                <textarea 
                  required 
                  value={contactForm.message}
                  onChange={(e) => setContactForm({...contactForm, message: e.target.value})} 
                />
              </div>
              <div className={styles.modalButtonGroup}>
                <button type="button" className={styles.modalCancelBtn} onClick={() => setShowContactModal(false)}>Cancel</button>
                <button type="submit" className={styles.modalSubmitBtn} disabled={sending}>
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}