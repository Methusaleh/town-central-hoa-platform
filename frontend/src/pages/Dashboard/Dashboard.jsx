import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import DuesCard from "../../components/DuesCard/DuesCard";
import styles from "./Dashboard.module.css";

export default function Dashboard({ user, onLogout }) {
  return (
    <div className={styles.layout}>
      {/* Decorative Background Orbs */}
      <div className={styles.orb1}></div>
      <div className={styles.orb2}></div>
      {/* Sidebar Navigation */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>Town Central</div>
        <nav className={styles.nav}>
          <button className={styles.navItem}>Announcement Feed</button>
          <button className={styles.navItem}>Interactive Calendar</button>
          <button className={styles.navItem}>Maintenance & ARC</button>
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
        <header className={styles.header}>
          <h2>Welcome back, {user?.first_name || "Resident"}</h2>
        </header>

        <section style={{ marginBottom: "30px" }}>
          <NeighborhoodCalendar />
        </section>

        <div className={styles.contentGrid}>
          {/* We will build these as separate components next */}
          <div className={styles.feedCard}>
            <AnnouncementFeed />
          </div>

          <div className={styles.statusCard}>
            <DuesCard residentName={user?.first_name} />
          </div>
        </div>
      </main>
    </div>
  );
}
