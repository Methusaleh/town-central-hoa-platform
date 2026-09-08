import { useEffect, useState } from "react";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
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
import Amenities from "../../components/Amenities/Amenities";
import BoardMail from "../../components/BoardMail/BoardMail";
import HomeOverview from "./HomeOverview";
import { usePortal } from "../../layout/PortalContext";
import { PATHS } from "../../layout/navConfig";
import styles from "./Dashboard.module.css";
import { apiFetch } from "../../api";

export default function DashboardLayout() {
  const { user, isBoard } = usePortal();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("active");

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

  return (
    <Outlet
      context={{
        user,
        requests,
        loading,
        handleResolve,
        viewMode,
        setViewMode,
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

export function AmenitiesPage() {
  return (
    <Panel>
      <Amenities />
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
  const navigate = useNavigate();
  return (
    <Panel wide>
      <RosterDirectory onBack={() => navigate(PATHS.admin)} />
    </Panel>
  );
}

export function AdminFinancialsPage() {
  const navigate = useNavigate();
  const { user } = usePortal();
  return (
    <Panel wide>
      <FinancialLedger onBack={() => navigate(PATHS.admin)} user={user} />
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
