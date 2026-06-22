import { useState } from "react";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import DuesCard from "../../components/DuesCard/DuesCard";
import NeighborhoodCalendar from "../../components/NeighborhoodCalendar/NeighborhoodCalendar";
import RequestForm from "../../components/RequestForm/RequestForm";
import BoardPortal from "../../components/BoardPortal/BoardPortal";
import VendorDirectory from "../../components/VendorDirectory/VendorDirectory";
import styles from "./Dashboard.module.css";

// Added onNavigateToProfile to the destructured props
export default function Dashboard({ user, onLogout, onNavigateToProfile }) {
  // Tabs: 'feed', 'maintenance', 'dues', 'board', 'vendors'
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className={styles.layout}>
      {/* Decorative Background Orbs */}
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>

      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Town Central</div>
        <nav className={styles.nav}>
          <button onClick={onLogout} className={styles.navItem}>
            ← Public Home
          </button>

          <div
            style={{
              margin: "10px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
            }}
          ></div>

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

          {/* Account Settings Tab Link */}
          <button
            className={styles.navItem}
            onClick={onNavigateToProfile}
          >
            ⚙️ Account Settings
          </button>

          <button
            onClick={() =>
              (window.location.href = "mailto:board@towncentral.com")
            }
            className={styles.navItem}
          >
            Contact the Board
          </button>

          {/* Executive Board View Toggle */}
          {(user?.role === "board_member" || user?.role === "super_admin") && (
            <button
              className={`${styles.boardItem} ${activeTab === "board" ? styles.activeBoard : ""}`}
              onClick={() => setActiveTab("board")}
            >
              Board Executive Portal
            </button>
          )}
        </nav>

        {/* Dynamic Sidebar User Card Footer */}
        <div 
          className={styles.sidebarUserCard} 
          onClick={onNavigateToProfile}
          style={{ cursor: 'pointer', marginTop: 'auto', marginBottom: '15px' }}
        >
          <img 
            src={user?.photo || "https://via.placeholder.com/40"} 
            alt="User Avatar" 
            className={styles.userAvatarMini}
            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)' }}
          />
          <div className={styles.userInfoMini} style={{ marginLeft: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff' }}>{user?.first_name || "Resident"}</h4>
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>View Profile</span>
          </div>
        </div>

        <button className={styles.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        {/* VIEW 1: HOME FEED */}
        {activeTab === "feed" && (
          <div className={styles.fadeContent}>
            <header className={styles.header}>
              <h2>Welcome Back, {user?.first_name || "Resident"}</h2>
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
              <p>
                View your balance, payment history, and pay annual assessments.
              </p>
            </header>
            <div className={styles.duesPageWrapper}>
              <DuesCard residentName={user?.first_name} />
            </div>
          </div>
        )}

        {/* VIEW 4: BOARD EXECUTIVE PORTAL */}
        {activeTab === "board" && (
          <div className={styles.fadeContent}>
            <BoardPortal user={user} />
          </div>
        )}

        {/* VIEW 5: TRUSTED VENDORS */}
        {activeTab === "vendors" && (
          <div className={styles.fadeContent}>
            <VendorDirectory />
          </div>
        )}
      </main>
    </div>
  );
}