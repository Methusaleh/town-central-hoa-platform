import { useState, useEffect, useRef } from "react";
import MissionControl from "../../components/BoardPortal/subcomponents/MissionControl";
import RosterDirectory from "../../components/BoardPortal/subcomponents/RosterDirectory";
import OperationsDashboard from "../../components/BoardPortal/subcomponents/OperationsDashboard";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import DuesCard from "../../components/DuesCard/DuesCard";
import NeighborhoodCalendar from "../../components/NeighborhoodCalendar/NeighborhoodCalendar";
import RequestForm from "../../components/RequestForm/RequestForm";
import VendorDirectory from "../../components/VendorDirectory/VendorDirectory";
import DocumentCenter from "../../components/DocumentCenter/DocumentCenter";
import styles from "./Dashboard.module.css";

export default function Dashboard({ user, onLogout, onNavigateToProfile }) {
  // Tabs: 'feed', 'maintenance', 'dues', 'board', 'vendors'
  const [activeTab, setActiveTab] = useState("feed");
  // Add these with your existing 'requests' state
  const [viewMode, setViewMode] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  // If you need these for the OperationsDashboard as well:
  const [announcement, setAnnouncement] = useState({ title: "", content: "", priority: "normal", channel_type: "general" });
  const [newEvent, setNewEvent] = useState({ title: "", event_date: "", event_time: "", location: "", description: "", attachment_url: "", attachment_name: "" });
  
  // New States for Contact Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = "https://town-central-hoa-platform-469564564131.us-central1.run.app";

  const settingsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      // Future infrastructure point: Hook this payload up to your /api/notifications or a mail server
      const response = await fetch("https://town-central-hoa-platform-469564564131.us-central1.run.app/api/requests", {
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
        alert("Your message has been securely delivered to the Executive Board!");
        setContactForm({ subject: "", message: "" });
        setShowContactModal(false);
      } else {
        alert("Failed to forward message container. Please try again.");
      }
    } catch (err) {
      console.error("Contact submission fault:", err);
      alert("Network error routing message to board.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/requests/admin/all`)
      .then((res) => res.json())
      .then((data) => { setRequests(data); setLoading(false); })
      .catch((err) => console.error("Admin fetch error:", err));
  }, []);

  // Define your handleResolve here too
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

  return (
    <div className={styles.layout}>
      {/* Decorative Background Orbs */}
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>

      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          {/* NEW TOP PROFILE & LOGOUT AREA */}
          <div className={styles.profileHeader} ref={settingsRef}>
            {user?.photo ? (
              <img src={user.photo} alt="Avatar" className={styles.userAvatarMini} />
            ) : (
              <div className={styles.avatarPlaceholderMini}>
                {user?.first_name ? user.first_name.charAt(0).toUpperCase() : "R"}
              </div>
            )}
            
            <div className={styles.userInfoMini}>
              <h4 style={{ margin: 0, fontSize: "0.9rem" }}>{user?.first_name}</h4>
            </div>

            {/* Cogwheel Trigger */}
            <div className={styles.settingsTrigger} onClick={() => setShowSettings(!showSettings)}>
              ⚙️
            </div>

            {/* Dropdown Menu */}
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
            className={`${styles.navItem} ${activeTab === 'documents' ? styles.activeNav : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Community Documents
          </button>

          <button
            onClick={() => setShowContactModal(true)}
            className={styles.navItem}
          >
            Contact the Board
          </button>

          {/* Executive Board View Toggle */}
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

      {/* Main Content Area */}
      <main className={styles.main}>
        {/* VIEW 1: HOME FEED */}
        {activeTab === "feed" && (
          <div className={styles.fadeContent}>
            <header className={styles.header}>
              {/* Updated Catchy Title */}
              <h2>Town Central Community Hub</h2>
              <p style={{ color: "#64748b", marginTop: "-20px" }}>
                Stay informed, stay connected.
              </p>
            </header>
            <section style={{ marginBottom: "30px" }}>
              <NeighborhoodCalendar />
            </section>
            <div className={styles.feedCard}>
              <AnnouncementFeed />
            </div>
          </div>
        )}

        {/* VIEW 2: MAINTENANCE & ARC */}
        {activeTab === "maintenance" && (
          <div className={styles.fadeContent}>
            <header className={styles.header}>
              <h2>Maintenance & ARC Requests</h2>
              <p>Submit a request for common area repairs or home changes.</p>
            </header>
            <RequestForm user={user} />
          </div>
        )}

        {/* VIEW 3: MY DUES */}
        {activeTab === "dues" && (
          <div className={styles.fadeContent}>
            <header className={styles.header}>
              <h2>Financial Account</h2>
              <p>View your balance, payment history, and pay annual assessments.</p>
            </header>
            <div className={styles.duesPageWrapper}>
              <DuesCard user={user} />
            </div>
          </div>
        )}

        {/* VIEW 4: TRUSTED VENDORS */}
        {activeTab === "vendors" && (
          <div className={styles.fadeContent}>
            <VendorDirectory />
          </div>
        )}

        {/* VIEW 5: MISSION CONTROL */}
        {activeTab === "mission-control" && (
          <div className={styles.fadeContent}>
            <MissionControl 
              onNavigate={(section) => setActiveTab(section)} 
            />
          </div>
        )}

        {/* VIEW: OPERATIONS & TICKETS (ADMIN ONLY) */}
        {activeTab === "requests" && (
          <div className={styles.fadeContent}>
            <OperationsDashboard 
              requests={requests} 
              loading={loading} 
              handleResolve={handleResolve}
              // Add these if you want to keep the UI state clean
              viewMode={viewMode} 
              setViewMode={setViewMode}
              showForm={showForm}
              setShowForm={setShowForm}
              showEventForm={showEventForm}
              setShowEventForm={setShowEventForm}
            />
          </div>
        )}

        {/* VIEW 6: COMMUNITY DOCUMENTS */}
        {activeTab === "documents" && (
          <div className={styles.fadeContent}>
            <header className={styles.header}>
              <h2>Community Document Repository</h2>
              <p>Access official files and governance covenants.</p>
            </header>
            <DocumentCenter user={user} />
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