import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import GuidelinesModal from "../components/GuidelinesModal/GuidelinesModal";
import { markFeedSeen } from "../utils/feedCursors";
import { usePortal } from "./PortalContext";
import {
  FEED_PATHS,
  PATHS,
  adminItem,
  desktopPrimary,
  mobileTabs,
  moreItems,
} from "./navConfig";
import styles from "./AppShell.module.css";

function linkClass({ isActive }) {
  return `${styles.link} ${isActive ? styles.linkActive : ""}`;
}

export default function AppShell() {
  const { user, isBoard, onLogout, onUserUpdate } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(!user?.agreed_to_guidelines);
  const moreRef = useRef(null);
  const accountRef = useRef(null);

  const fullBleed = location.pathname.startsWith("/dashboard/admin/documents");

  useEffect(() => {
    const feed =
      FEED_PATHS[location.pathname] ||
      (location.pathname.startsWith(`${PATHS.porch}/`) ? "porch" : null);
    if (feed) markFeedSeen(user?.id, feed);
  }, [location.pathname, user?.id]);

  useEffect(() => {
    setMoreOpen(false);
    setAccountOpen(false);
    setMobileMore(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDoc = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setMoreOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const overflow = isBoard ? [...moreItems, adminItem] : moreItems;
  const moreActive = overflow.some((item) => item.to && location.pathname.startsWith(item.to));

  return (
    <div className={styles.shell}>
      {showGuidelines && (
        <GuidelinesModal
          user={user}
          onAgree={() => {
            setShowGuidelines(false);
            const updatedUser = { ...user, agreed_to_guidelines: true };
            if (onUserUpdate) onUserUpdate(updatedUser);
          }}
        />
      )}

      <header className={styles.topbar}>
        <NavLink to={PATHS.home} className={styles.brand} end>
          <span className={styles.mark} aria-hidden="true" />
          <span>Town Central</span>
        </NavLink>

        <nav className={styles.desktopNav} aria-label="Primary">
          {desktopPrimary.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon size={16} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}

          <div className={styles.menuWrap} ref={moreRef}>
            <button
              type="button"
              className={`${styles.link} ${styles.menuBtn} ${moreOpen || moreActive ? styles.linkActive : ""}`}
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <ChevronDown size={14} />
            </button>
            {moreOpen && (
              <div className={styles.dropdown}>
                {overflow.map((item) => (
                  <NavLink key={item.to} to={item.to} className={styles.dropItem} onClick={() => setMoreOpen(false)}>
                    <item.icon size={16} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className={styles.account} ref={accountRef}>
          <button
            type="button"
            className={styles.accountBtn}
            onClick={() => setAccountOpen((v) => !v)}
            aria-label="Account menu"
          >
            <Avatar name={user?.first_name} photo={user?.photo} />
            <span className={styles.accountName}>{user?.first_name}</span>
            <ChevronDown size={14} className={styles.chevron} />
          </button>
          {accountOpen && (
            <div className={`${styles.dropdown} ${styles.accountMenu}`}>
              <button
                type="button"
                className={styles.dropItem}
                onClick={() => {
                  setAccountOpen(false);
                  navigate(PATHS.profile);
                }}
              >
                <Settings size={16} />
                Settings
              </button>
              <button type="button" className={`${styles.dropItem} ${styles.dangerItem}`} onClick={onLogout}>
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className={`${styles.main} ${fullBleed ? styles.mainBleed : ""}`}>
        <Outlet />
      </main>

      <nav className={styles.tabbar} aria-label="Mobile">
        {mobileTabs.map((item) =>
          item.action === "more" ? (
            <button
              key="more"
              type="button"
              className={`${styles.tab} ${mobileMore || moreActive ? styles.tabActive : ""}`}
              onClick={() => setMobileMore(true)}
            >
              <item.icon size={20} />
              More
            </button>
          ) : (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `${styles.tab} ${isActive ? styles.tabActive : ""}`}>
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      {mobileMore && (
        <div className={styles.sheetBackdrop} onClick={() => setMobileMore(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <p className={styles.sheetTitle}>More</p>
            {overflow.map((item) => (
              <NavLink key={item.to} to={item.to} className={styles.sheetItem} onClick={() => setMobileMore(false)}>
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
