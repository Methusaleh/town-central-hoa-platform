import { useState } from "react";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import DuesCard from "../../components/DuesCard/DuesCard";
import NeighborhoodCalendar from "../../components/NeighborhoodCalendar/NeighborhoodCalendar";
import RequestForm from "../../components/RequestForm/RequestForm";
import styles from "./Dashboard.module.css";

export default function Dashboard({ user, onLogout }) {
  // 'feed' is the home view, 'maintenance' is the form view
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
          {/* We connect the buttons to the setActiveTab state */}
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

          <button className={styles.navItem}>My Dues</button>

          {/* Executive Board View Toggle */}
          {(user?.role === "board_member" || user?.role === "super_admin") && (
            <button className={styles.boardItem}>Board Executive Portal</button>
          )}
        </nav>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        {activeTab === "feed" ? (
          <>
            <header className={styles.header}>
              <h2>Welcome back, {user?.first_name || "Resident"}</h2>
            </header>

            <section style={{ marginBottom: "30px" }}>
              <NeighborhoodCalendar />
            </section>

            <div className={styles.contentGrid}>
              <div className={styles.feedCard}>
                <AnnouncementFeed />
              </div>

              <div className={styles.statusCard}>
                <DuesCard residentName={user?.first_name} />
              </div>
            </div>
          </>
        ) : (
          <div className={styles.fadeContent}>
            <header className={styles.header}>
              <h2>Maintenance & ARC Requests</h2>
              <p>
                Submit a request for common area repairs or architectural
                changes to your home.
              </p>
            </header>
            <RequestForm user={user} />
          </div>
        )}
      </main>
    </div>
  );
}
