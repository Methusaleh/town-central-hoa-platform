import { useState, useEffect, useRef } from "react";
import MissionControl from "../../components/BoardPortal/subcomponents/MissionControl";
import RosterDirectory from "../../components/BoardPortal/subcomponents/RosterDirectory";
import FinancialLedger from "../../components/BoardPortal/subcomponents/FinancialLedger";
import VendorControls from "../../components/BoardPortal/subcomponents/VendorControls";
import OperationsDashboard from "../../components/BoardPortal/subcomponents/OperationsDashboard";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import DuesCard from "../../components/DuesCard/DuesCard";
import NeighborhoodCalendar from "../../components/NeighborhoodCalendar/NeighborhoodCalendar";
import RequestForm from "../../components/RequestForm/RequestForm";
import VendorDirectory from "../../components/VendorDirectory/VendorDirectory";
import DocumentCenter from "../../components/DocumentCenter/DocumentCenter";
import DocumentManager from "../../components/BoardPortal/subcomponents/DocumentManager"; // Admin view
import styles from "./Dashboard.module.css";

export default function Dashboard({ user, onLogout, onNavigateToProfile }) {
  const [activeTab, setActiveTab] = useState("feed");
  
  // Admin UI & Data States
  const [viewMode, setViewMode] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [requests, setRequests] = useState([]);
  const [masterRoster, setMasterRoster] = useState([]);
  const [vendorsList, setVendorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [announcement, setAnnouncement] = useState({ title: "", content: "", priority: "normal", channel_type: "general" });
  const [newEvent, setNewEvent] = useState({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });
  
  // Contact Modal States
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const API_BASE = "https://town-central-hoa-platform-469564564131.us-central1.run.app";
  const settingsRef = useRef(null);

  // Data Fetching Logic
  useEffect(() => {
    fetch(`${API_BASE}/api/requests/admin/all`)
      .then((res) => res.json())
      .then((data) => { setRequests(data); setLoading(false); })
      .catch((err) => console.error("Admin requests fetch error:", err));
  }, []);

  const fetchRosterData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/residents/master-list-placeholder`);
      const data = await response.json();
      setMasterRoster(data);
    } catch (err) { console.error("Roster fetch error:", err); }
  };

  const fetchVendorsData = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/vendors`);
      const data = await response.json();
      setVendorsList(data);
    } catch (err) { console.error("Vendor fetch error:", err); }
  };

  useEffect(() => {
    if (activeTab === "roster" || activeTab === "financials") fetchRosterData();
    if (activeTab === "vendors") fetchVendorsData();
  }, [activeTab]);

  const handleResolve = async (requestId) => {
    try {
      const response = await fetch(`${API_BASE}/api/requests/${requestId}/resolve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminName: user?.first_name || "Admin" }),
      });
      if (response.ok) {
        setRequests(requests.map((req) => req.id === requestId ? { ...req, status: "Resolved" } : req));
      }
    } catch (err) { console.error(err); }
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
          description: contactForm.message
        })
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.layout}>
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>

      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          <div className={styles.profileHeader} ref={settingsRef}>
            {user?.photo ? <img src={user.photo} alt="Avatar" className={styles.userAvatarMini} /> : <div className={styles.avatarPlaceholderMini}>{user?.first_name ? user.first_name.charAt(0).toUpperCase() : "R"}</div>}
            <div className={styles.userInfoMini}>
              <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{user?.first_name}</h4>
            </div>
            <div className={styles.settingsTrigger} onClick={() => setShowSettings(!showSettings)}>⚙️</div>
            {showSettings && (
              <div className={styles.settingsDropdown}>
                <button className={styles.dropdownBtn} onClick={onNavigateToProfile}>Settings</button>
                <button className={`${styles.dropdownBtn} ${styles.logoutText}`} onClick={onLogout}>Logout</button>
              </div>
            )}
          </div>

          <div className={styles.brandContainer} style={{ marginTop: "20px" }}>
            <div className={styles.brand}>Town Central</div>
            <span className={styles.brandSubtitle}>Resident Portal</span>
          </div>

          <button className={`${styles.navItem} ${activeTab === "feed" ? styles.activeNav : ""}`} onClick={() => setActiveTab("feed")}>Home Dashboard</button>
          <button className={`${styles.navItem} ${activeTab === "maintenance" ? styles.activeNav : ""}`} onClick={() => setActiveTab("maintenance")}>Maintenance & ARC</button>
          <button className={`${styles.navItem} ${activeTab === "dues" ? styles.activeNav : ""}`} onClick={() => setActiveTab("dues")}>My Dues</button>
          <button className={`${styles.navItem} ${activeTab === "vendors" ? styles.activeNav : ""}`} onClick={() => setActiveTab("vendors")}>Trusted Companies</button>
          <button className={`${styles.navItem} ${activeTab === 'documents' ? styles.activeNav : ''}`} onClick={() => setActiveTab('documents')}>Community Documents</button>
          <button onClick={() => setShowContactModal(true)} className={styles.navItem}>Contact the Board</button>

          {(user?.role === "board_member" || user?.role === "super_admin") && (
            <button className={`${styles.navItem} ${activeTab === "mission-control" ? styles.activeNav : ""}`} onClick={() => setActiveTab("mission-control")}>Admin Tools</button>
          )}
        </nav>
      </aside>

      <main className={styles.main}>
        {/* --- RESIDENT-FACING VIEWS --- */}
        {activeTab === "feed" && (
          <div className={styles.fadeContent}>
            <header className={styles.header}><h2>Town Central Community Hub</h2></header>
            <section style={{ marginBottom: "30px" }}><NeighborhoodCalendar /></section>
            <div className={styles.feedCard}><AnnouncementFeed /></div>
          </div>
        )}
        {activeTab === "maintenance" && <div className={styles.fadeContent}><RequestForm user={user} /></div>}
        {activeTab === "dues" && <div className={styles.fadeContent}><DuesCard user={user} /></div>}
        {activeTab === "vendors" && <div className={styles.fadeContent}><VendorDirectory /></div>}
        {activeTab === "documents" && <div className={styles.fadeContent}><DocumentCenter user={user} /></div>}

        {/* --- ADMINISTRATIVE VIEWS --- */}
        {activeTab === "mission-control" && (
          <div className={styles.fadeContent}>
            <MissionControl onNavigate={setActiveTab} />
          </div>
        )}
        {activeTab === "requests" && (
          <div className={styles.fadeContent}>
            <OperationsDashboard 
              onBack={() => setActiveTab("mission-control")} 
              requests={requests} loading={loading} handleResolve={handleResolve}
              // ... pass other necessary props
            />
          </div>
        )}
        {activeTab === "roster" && (
          <div className={styles.fadeContent}>
            <RosterDirectory onBack={() => setActiveTab("mission-control")} masterRoster={masterRoster} />
          </div>
        )}
        {activeTab === "financials" && (
          <div className={styles.fadeContent}>
            <FinancialLedger onBack={() => setActiveTab("mission-control")} masterRoster={masterRoster} />
          </div>
        )}
        {/* Use specific ID to avoid conflict with resident 'vendors' */}
        {activeTab === "admin-vendors" && (
          <div className={styles.fadeContent}>
            <VendorControls onBack={() => setActiveTab("mission-control")} vendorsList={vendorsList} />
          </div>
        )}
        {/* Use specific ID to avoid conflict with resident 'documents' */}
        {activeTab === "admin-documents" && (
          <div className={styles.fadeContent}>
            <DocumentManager user={user} onBack={() => setActiveTab("mission-control")} />
          </div>
        )}
      </main>

      {/* --- INLINE CONTACT BOARD OVERLAY MODAL LAYER --- */}
      {showContactModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowContactModal(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h3>Message the Executive Board</h3>
            <p>Have a question regarding community events, rules, or amenities? Send a secure message directly to board management here. This transmits instantly to the board email inbox in the background without opening any external apps.</p>
            
            <form onSubmit={handleContactSubmit} className={styles.modalForm}>
              <div className={styles.modalInputGroup}>
                <label>Message Subject *</label>
                <input 
                  type="text" 
                  placeholder="e.g., Amenity Keycard Request, General Inquiry" 
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  required 
                />
              </div>
              
              <div className={styles.modalInputGroup}>
                <label>Correspondence Body *</label>
                <textarea 
                  placeholder="Type your details here for board review..." 
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required 
                />
              </div>

              <div className={styles.modalButtonGroup}>
                <button type="button" className={styles.modalCancelBtn} onClick={() => setShowContactModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.modalSubmitBtn} disabled={sending}>
                  {sending ? "Transmitting..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}