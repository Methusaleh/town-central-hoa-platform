import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import MissionControl from "../../components/BoardPortal/subcomponents/MissionControl";
import RosterDirectory from "../../components/BoardPortal/subcomponents/RosterDirectory";
import FinancialLedger from "../../components/BoardPortal/subcomponents/FinancialLedger";
import VendorControls from "../../components/BoardPortal/subcomponents/VendorControls";
import OperationsDashboard from "../../components/BoardPortal/subcomponents/OperationsDashboard";
import AnnouncementFeed from "../../components/AnnouncementFeed/AnnouncementFeed";
import CommunityAlerts from "../../components/CommunityAlerts/CommunityAlerts";
import Porch from "../../components/Porch/Porch";
import ResidentLedger from "../../components/ResidentLedger/ResidentLedger";
import DuesCard from "../../components/DuesCard/DuesCard";
import Events from "../../components/Events/Events";
import RequestForm from "../../components/RequestForm/RequestForm";
import VendorDirectory from "../../components/VendorDirectory/VendorDirectory";
import DocumentCenter from "../../components/DocumentCenter/DocumentCenter";
import DocumentManager from "../../components/BoardPortal/subcomponents/DocumentManager";
import BoardMail from "../../components/BoardMail/BoardMail";
import HomeOverview from "./HomeOverview";
import { usePortal } from "../../layout/PortalContext";
import { PATHS } from "../../layout/navConfig";
import styles from "./Dashboard.module.css";
import { apiFetch } from "../../api";

export default function DashboardLayout() {
  const { user, isBoard } = usePortal();
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [masterRoster, setMasterRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("active");
  const [showForm, setShowForm] = useState(false);
  const [rosterForm, setRosterForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    street_address: "",
  });
  const [financeStatus, setFinanceStatus] = useState({ text: "", type: "" });

  const fetchRosterData = async () => {
    try {
      const response = await apiFetch("/api/residents/master-list-placeholder");
      const data = await response.json();
      setMasterRoster(data || []);
    } catch (err) {
      console.error("Roster fetch error:", err);
    }
  };

  useEffect(() => {
    if (!isBoard) {
      setLoading(false);
      return;
    }
    apiFetch("/api/requests/admin/all")
      .then((res) => res.json())
      .then((data) => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Admin requests fetch error:", err);
        setLoading(false);
      });
  }, [isBoard]);

  useEffect(() => {
    if (location.pathname.includes("/admin/roster") || location.pathname.includes("/admin/financials")) {
      fetchRosterData();
    }
  }, [location.pathname]);

  const handleResolve = async (requestId) => {
    try {
      const response = await apiFetch(`/api/requests/${requestId}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ adminName: user?.first_name || "Admin" }),
      });
      if (response.ok) {
        setRequests((current) =>
          current.map((req) => (req.id === requestId ? { ...req, status: "Resolved" } : req)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOnboardResident = async (e, sendWelcomePacket) => {
    e.preventDefault();
    const generatedToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
      const response = await apiFetch("/api/residents", {
        method: "POST",
        body: JSON.stringify({
          ...rosterForm,
          onboarding_token: generatedToken,
          send_welcome: sendWelcomePacket,
        }),
      });
      if (response.ok) {
        window.alert(`Property added! Claim Code: ${generatedToken}`);
        fetchRosterData();
        setShowForm(false);
        setRosterForm({ first_name: "", last_name: "", email: "", street_address: "" });
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      window.alert("Failed to save property.");
    }
  };

  return (
    <Outlet
      context={{
        user,
        requests,
        loading,
        handleResolve,
        viewMode,
        setViewMode,
        masterRoster,
        showForm,
        setShowForm,
        rosterForm,
        setRosterForm,
        financeStatus,
        handleOnboardResident,
      }}
    />
  );
}

function Panel({ children, wide, bleed }) {
  return (
    <div className={`${styles.fadeContent} ${wide ? styles.widePanel : ""} ${bleed ? styles.explorerWrap : ""}`}>
      {children}
    </div>
  );
}

export function HomePage() {
  return <HomeOverview />;
}

export function FeedPage() {
  const { user } = usePortal();
  return (
    <Panel>
      <Porch user={user} />
    </Panel>
  );
}

export function EventsPage() {
  const { user } = usePortal();
  return (
    <Panel wide>
      <Events user={user} />
    </Panel>
  );
}

export function AnnouncementsPage() {
  const { user } = usePortal();
  return (
    <Panel>
      <AnnouncementFeed user={user} />
    </Panel>
  );
}

export function AlertsPage() {
  const { user } = usePortal();
  return (
    <Panel>
      <CommunityAlerts user={user} />
    </Panel>
  );
}

export function ContactBoardPage() {
  return (
    <Panel>
      <BoardMail />
    </Panel>
  );
}

export function MaintenancePage() {
  const { user } = usePortal();
  return (
    <Panel>
      <RequestForm user={user} />
    </Panel>
  );
}

export function DuesPage() {
  const { user } = usePortal();
  return (
    <div className={`${styles.fadeContent} ${styles.duesGrid}`}>
      <DuesCard user={user} />
      <ResidentLedger user={user} />
    </div>
  );
}

export function VendorsPage() {
  return (
    <Panel>
      <VendorDirectory />
    </Panel>
  );
}

export function DocumentsPage() {
  const { user } = usePortal();
  return (
    <Panel>
      <DocumentCenter user={user} />
    </Panel>
  );
}

export function AdminHomePage() {
  return (
    <Panel wide>
      <MissionControl />
    </Panel>
  );
}

export function AdminRequestsPage() {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  return (
    <Panel wide>
      <OperationsDashboard
        onBack={() => navigate(PATHS.admin)}
        requests={ctx.requests}
        loading={ctx.loading}
        handleResolve={ctx.handleResolve}
        viewMode={ctx.viewMode}
        onToggleView={() => ctx.setViewMode(ctx.viewMode === "active" ? "archived" : "active")}
      />
    </Panel>
  );
}

export function AdminRosterPage() {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  return (
    <Panel wide>
      <RosterDirectory
        onBack={() => navigate(PATHS.admin)}
        masterRoster={ctx.masterRoster}
        showRosterModal={ctx.showForm}
        setShowRosterModal={ctx.setShowForm}
        rosterForm={ctx.rosterForm || {}}
        setRosterForm={ctx.setRosterForm}
        rosterStatus={ctx.financeStatus}
        handleOnboardResident={ctx.handleOnboardResident}
      />
    </Panel>
  );
}

export function AdminFinancialsPage() {
  const ctx = useOutletContext();
  const navigate = useNavigate();
  const { user } = usePortal();
  return (
    <Panel wide>
      <FinancialLedger onBack={() => navigate(PATHS.admin)} masterRoster={ctx.masterRoster} user={user} />
    </Panel>
  );
}

export function AdminVendorsPage() {
  const navigate = useNavigate();
  return (
    <Panel wide>
      <VendorControls onBack={() => navigate(PATHS.admin)} />
    </Panel>
  );
}

export function AdminDocumentsPage() {
  const { user } = usePortal();
  const navigate = useNavigate();
  return (
    <Panel bleed>
      <DocumentManager user={user} onBack={() => navigate(PATHS.admin)} />
    </Panel>
  );
}
