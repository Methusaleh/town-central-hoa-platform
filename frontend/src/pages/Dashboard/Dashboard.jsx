import styles from "./Dashboard.module.css";

export default function Dashboard({ user, onLogout }) {
  return (
    <div className={styles.layout}>
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

        <div className={styles.contentGrid}>
          {/* We will build these as separate components next */}
          <div className={styles.feedCard}>
            <h3>Latest Announcements</h3>
            <p>Meeting scheduled for next Tuesday at 7:00 PM.</p>
          </div>

          <div className={styles.statusCard}>
            <h3>My Property Status</h3>
            <p>
              Dues: <strong>Paid</strong>
            </p>
            <p>
              Open Requests: <strong>0</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
