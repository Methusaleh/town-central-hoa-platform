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
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>

      <aside className={styles.sidebar}>
        <div className={styles.brand}>Town Central</div>
        <nav className={styles.nav}>
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

          {(user?.role === "board_member" || user?.role === "super_admin") && (
            <button className={styles.boardItem}>Board Executive Portal</button>
          )}
        </nav>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </aside>

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
            {/* We wrap the DuesCard in a larger container for the dedicated page */}
            <div className={styles.duesPageWrapper}>
              <DuesCard residentName={user?.first_name} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
