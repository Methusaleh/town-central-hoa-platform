import { useState, useEffect, useRef } from "react";
import MissionControl from "../../components/BoardPortal/subcomponents/MissionControl";
import RosterDirectory from "../../components/BoardPortal/subcomponents/RosterDirectory";
import FinancialLedger from "../../components/BoardPortal/subcomponents/FinancialLedger";
import VendorControls from "../../components/BoardPortal/subcomponents/VendorControls";
import OperationsDashboard from "../../components/BoardPortal/subcomponents/OperationsDashboard";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import ResidentLedger from "../../components/ResidentLedger/ResidentLedger";
import DuesCard from "../../components/DuesCard/DuesCard";
import NeighborhoodCalendar from "../../components/NeighborhoodCalendar/NeighborhoodCalendar";
import RequestForm from "../../components/RequestForm/RequestForm";
import VendorDirectory from "../../components/VendorDirectory/VendorDirectory";
import DocumentCenter from "../../components/DocumentCenter/DocumentCenter";
import DocumentManager from "../../components/BoardPortal/subcomponents/DocumentManager";
import CommunityAlerts from "../../components/CommunityAlerts/CommunityAlerts";
import styles from "./Dashboard.module.css";

export default function Dashboard({ user, onLogout, onNavigateToProfile }) {
  const [activeTab, setActiveTab] = useState("feed");

  // Data States
  const [requests, setRequests] = useState([]);
  const [masterRoster, setMasterRoster] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI States
  const [viewMode, setViewMode] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sending, setSending] = useState(false);
  // Add this with your other UI/Form states
  const [rosterForm, setRosterForm] = useState({ first_name: "", last_name: "", email: "", street_address: "" });
  const [rosterStatus, setRosterStatus] = useState({ text: "", type: "" });

  // Form States
  const [announcement, setAnnouncement] = useState({
    title: "",
    content: "",
    priority: "normal",
    channel_type: "general",
  });
  const [newEvent, setNewEvent] = useState({
    title: "",
    event_date: "",
    event_time: "",
    location: "",
    description: "",
    attachment_url: "",
    attachment_name: "",
  });
  const [financeForm, setFinanceForm] = useState({
    street_address: "",
    balance: "",
    status: "Pending",
  });
  const [financeStatus, setFinanceStatus] = useState({ text: "", type: "" });
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });

  const API_BASE =
    "https://town-central-hoa-platform-469564564131.us-central1.run.app";
  const settingsRef = useRef(null);

  // Data Fetching Logic
  useEffect(() => {
    fetch(`${API_BASE}/api/requests/admin/all`)
      .then((res) => res.json())
      .then((data) => {
        setRequests(data);
        setLoading(false);
      })
      .catch((err) => console.error("Admin requests fetch error:", err));
  }, []);

  const fetchRosterData = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/residents/master-list-placeholder`,
      );
      const data = await response.json();
      setMasterRoster(data);
    } catch (err) {
      console.error("Roster fetch error:", err);
    }
  };

  const fetchVendorsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      setVendorsList(data);
    } catch (err) {
      console.error("Vendor fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "roster" || activeTab === "financials") fetchRosterData();
    if (activeTab === "vendors" || activeTab === "admin-vendors")
      fetchVendorsData();
  }, [activeTab]);

  const handleResolve = async (requestId) => {
    try {
      const response = await fetch(
        `${API_BASE}/api/requests/${requestId}/resolve`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminName: user?.first_name || "Admin" }),
        },
      );
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
      const response = await fetch(`${API_BASE}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: user?.id || null,
          first_name: user?.first_name || "Resident",
          last_name: "ContactForm",
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
    
    // 1. Generate a 6-character random token
    const generatedToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      const response = await fetch(`${API_BASE}/api/residents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...rosterForm,
          onboarding_token: generatedToken,
          send_welcome: sendWelcomePacket
        })
      });

      if (response.ok) {
        alert(`Property added! Claim Code: ${generatedToken}`);
        fetchRosterData(); // Refresh the list
        setShowForm(false); // Close the modal
        setRosterForm({ first_name: "", last_name: "", email: "", street_address: "" });
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      alert("Failed to save property.");
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcement),
      });
      if (response.ok) {
        alert("Announcement posted!");
        setAnnouncement({ title: "", content: "", priority: "normal", channel_type: "general" });
        setShowForm(false);
      }
    } catch (err) {
      console.error("Announcement error:", err);
    }
  };

  const handlePostEvent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEvent),
      });
      if (response.ok) {
        alert("Event added to calendar!");
        setNewEvent({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });
        setShowEventForm(false);
      }
    } catch (err) {
      console.error("Event error:", err);
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>

      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          <div className={styles.profileHeader} ref={settingsRef}>
            {user?.photo ? (
              <img
                src={user.photo}
                alt="Avatar"
                className={styles.userAvatarMini}
              />
            ) : (
              <div className={styles.avatarPlaceholderMini}>
                {user?.first_name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.userInfoMini}>
              <h4>{user?.first_name}</h4>
            </div>
            <div
              className={styles.settingsTrigger}
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️
            </div>
            {showSettings && (
              <div className={styles.settingsDropdown}>
                <button
                  className={styles.dropdownBtn}
                  onClick={onNavigateToProfile}
                >
                  Settings
                </button>
                <button
                  className={`${styles.dropdownBtn} ${styles.logoutText}`}
                  onClick={onLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            className={`${styles.navItem} ${activeTab === "feed" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("feed")}
          >
            Home Dashboard
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "maintenance" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("maintenance")}
          >
            Maintenance & ARC
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "dues" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("dues")}
          >
            My Dues
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "vendors" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("vendors")}
          >
            Trusted Companies
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "documents" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("documents")}
          >
            Community Documents
          </button>
          <button
            className={`${styles.navItem} ${activeTab === "alerts" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            Community Alerts
          </button>
          <button
            onClick={() => setShowContactModal(true)}
            className={styles.navItem}
          >
            Contact the Board
          </button>

          {(user?.role === "board_member" || user?.role === "super_admin") && (
            <button
              className={`${styles.navItem} ${activeTab === "mission-control" ? styles.activeNav : ""}`}
              onClick={() => setActiveTab("mission-control")}
            >
              Admin Tools
            </button>
          )}
        </nav>
      </aside>

      <main className={styles.main}>
        {/* --- RESIDENT VIEWS (Standard IDs) --- */}
        {activeTab === "feed" && (
          <div className={styles.socialStreamContainer}>
            {/* Social Welcome Banner */}
            <div className={styles.socialWelcomeCard}>
              <h2>Welcome back, {user?.first_name}! 👋</h2>
              <p>Catch up on the latest neighborhood updates, social alerts, and upcoming events.</p>
            </div>

            {/* Unified Social Stream Timeline */}
            <NeighborhoodCalendar />
            <AnnouncementFeed />
          </div>
        )}
        {activeTab === "maintenance" && <div className={styles.fadeContent}><RequestForm user={user} /></div>}
        {activeTab === "dues" && (
          <div className={styles.fadeContent} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <DuesCard user={user} />
            <ResidentLedger user={user} />
          </div>
        )}
        {activeTab === "vendors" && <div className={styles.fadeContent}><VendorDirectory /></div>}
        {activeTab === "documents" && <div className={styles.fadeContent}><DocumentCenter user={user} /></div>}

        {/* --- ADMIN VIEWS (Unique Admin IDs) --- */}
        {activeTab === "mission-control" && <div className={styles.fadeContent}><MissionControl onNavigate={setActiveTab} /></div>}
        {activeTab === "requests" && (
          <div className={styles.fadeContent}>
            <OperationsDashboard 
              onBack={() => setActiveTab("mission-control")} 
              requests={requests} 
              loading={loading} 
              handleResolve={handleResolve} 
              
              // Pass the value and the toggle function explicitly
              viewMode={viewMode} 
              onToggleView={() => setViewMode(viewMode === "active" ? "archived" : "active")}
              
              formProps={{
                showForm, setShowForm,
                showEventForm, setShowEventForm,
                announcement, setAnnouncement,
                newEvent, setNewEvent
              }}
              handlePostAnnouncement={handlePostAnnouncement}
              handlePostEvent={handlePostEvent}
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
              rosterStatus={financeStatus} // Or your specific rosterStatus state
              handleOnboardResident={handleOnboardResident}
            />
          </div>
        )}
        {activeTab === "financials" && <div className={styles.fadeContent}><FinancialLedger onBack={() => setActiveTab("mission-control")} masterRoster={masterRoster} financeForm={financeForm} setFinanceForm={setFinanceForm} financeStatus={financeStatus} /></div>}
        
        {/* These specific IDs now ensure you don't route to the resident versions */}
        {activeTab === "admin-vendors" && <div className={styles.fadeContent}><VendorControls onBack={() => setActiveTab("mission-control")} vendorsList={vendorsList} /></div>}
        {activeTab === "admin-documents" && <div className={styles.fadeContent}><DocumentManager user={user} onBack={() => setActiveTab("mission-control")} /></div>}
        {activeTab === "alerts" && <div className={styles.fadeContent}><CommunityAlerts user={user} /></div>}
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
