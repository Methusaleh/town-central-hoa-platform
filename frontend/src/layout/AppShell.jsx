import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import GuidelinesModal from "../components/GuidelinesModal/GuidelinesModal";
import { apiFetch } from "../api";
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
  const { user, isBoard, onLogout, onUserUpdate, contactOpen, setContactOpen } = usePortal();
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [contactForm, setContactForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);
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
        setContactForm({ subject: "", message: "" });
        setContactOpen(false);
      } else {
        window.alert("Failed to send message.");
      }
    } catch {
      window.alert("Network error.");
    } finally {
      setSending(false);
    }
  };

  const onMoreItem = (item) => {
    if (item.action === "contact") {
      setContactOpen(true);
      setMoreOpen(false);
      setMobileMore(false);
      return;
    }
    navigate(item.to);
  };

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
                {overflow.map((item) =>
                  item.to ? (
                    <NavLink key={item.to} to={item.to} className={styles.dropItem} onClick={() => setMoreOpen(false)}>
                      <item.icon size={16} />
                      {item.label}
                    </NavLink>
                  ) : (
                    <button key={item.label} type="button" className={styles.dropItem} onClick={() => onMoreItem(item)}>
                      <item.icon size={16} />
                      {item.label}
                    </button>
                  ),
                )}
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
            {overflow.map((item) =>
              item.to ? (
                <NavLink key={item.to} to={item.to} className={styles.sheetItem} onClick={() => setMobileMore(false)}>
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ) : (
                <button key={item.label} type="button" className={styles.sheetItem} onClick={() => onMoreItem(item)}>
                  <item.icon size={18} />
                  {item.label}
                </button>
              ),
            )}
          </div>
        </div>
      )}

      {contactOpen && (
        <Modal
          title="Contact the Board"
          description="Send a message directly to the HOA executive board."
          onClose={() => setContactOpen(false)}
        >
          <form onSubmit={handleContactSubmit} className={styles.contactForm}>
            <label>
              Subject
              <input
                type="text"
                required
                value={contactForm.subject}
                onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
              />
            </label>
            <label>
              Message
              <textarea
                required
                value={contactForm.message}
                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
              />
            </label>
            <div className={styles.contactActions}>
              <Button variant="secondary" onClick={() => setContactOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Sending..." : "Send message"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
