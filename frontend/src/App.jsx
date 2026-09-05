import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Landing from "./pages/Landing/Landing";
import DashboardLayout, {
  AdminDocumentsPage,
  AdminFinancialsPage,
  AdminHomePage,
  AdminRequestsPage,
  AdminRosterPage,
  AdminVendorsPage,
  AlertsPage,
  AnnouncementsPage,
  DocumentsPage,
  DuesPage,
  EventsPage,
  FeedPage,
  HomePage,
  MaintenancePage,
  VendorsPage,
} from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";
import AcceptInvite from "./pages/AcceptInvite/AcceptInvite";
import Profile from "./pages/Profile/Profile";
import Claim from "./pages/Claim/Claim";
import Login from "./pages/Login/Login";
import AppShell from "./layout/AppShell";
import { PortalProvider } from "./layout/PortalContext";
import { apiFetch, clearSession, getStoredUser, persistSession } from "./api";

function InviteRedirect() {
  const [params] = useSearchParams();
  const invite = params.get("invite");
  if (invite) return <Navigate to={`/invite/${invite}`} replace />;
  return <LandingPage />;
}

function LandingPage() {
  const navigate = useNavigate();
  return (
    <Landing
      onLogin={() => navigate("/login")}
      onRegisterClick={() => navigate("/claim")}
      onContactClick={() => navigate("/contact")}
    />
  );
}

function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  return (
    <Login
      onBack={() => navigate("/")}
      onLoginSuccess={onLoginSuccess}
      onNavigateToClaim={() => navigate("/claim")}
    />
  );
}

function ClaimPage({ onClaimSuccess }) {
  const navigate = useNavigate();
  return <Claim onBack={() => navigate("/")} onClaimSuccess={onClaimSuccess} />;
}

function AcceptInvitePage({ onJoinSuccess }) {
  const navigate = useNavigate();
  const { token } = useParams();
  return (
    <AcceptInvite
      inviteToken={token}
      onBack={() => navigate("/")}
      onJoinSuccess={onJoinSuccess}
    />
  );
}

function ProtectedShell({ user, onLogout, onUserUpdate }) {
  if (!user) return <Navigate to="/login" replace />;
  return (
    <PortalProvider user={user} onLogout={onLogout} onUserUpdate={onUserUpdate}>
      <AppShell />
    </PortalProvider>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) return;

    apiFetch("/api/residents/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        persistSession({ user: data.user });
      })
      .catch(() => {
        clearSession();
        setUser(null);
      });
  }, []);

  const handleAuthSuccess = (payload) => {
    const nextUser = payload?.user || payload;
    const token = payload?.token;
    persistSession({ token, user: nextUser });
    setUser(nextUser);
    navigate("/dashboard");
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    navigate("/");
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    persistSession({ user: updatedUser });
  };

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<InviteRedirect />} />
        <Route path="/login" element={<LoginPage onLoginSuccess={handleAuthSuccess} />} />
        <Route path="/claim" element={<ClaimPage onClaimSuccess={handleAuthSuccess} />} />
        <Route
          path="/invite/:token"
          element={<AcceptInvitePage onJoinSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/contact"
          element={<ContactPage onBack={() => navigate("/")} />}
        />
        <Route
          path="/dashboard"
          element={<ProtectedShell user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}
        >
          <Route element={<DashboardLayout />}>
            <Route index element={<HomePage />} />
            <Route path="porch" element={<FeedPage />} />
            <Route path="porch/:postId" element={<FeedPage />} />
            <Route path="feed" element={<Navigate to="/dashboard/porch" replace />} />
            <Route path="events" element={<EventsPage />} />
            <Route path="events/:eventId" element={<EventsPage />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="maintenance" element={<MaintenancePage />} />
            <Route path="dues" element={<DuesPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="admin" element={<AdminHomePage />} />
            <Route path="admin/requests" element={<AdminRequestsPage />} />
            <Route path="admin/roster" element={<AdminRosterPage />} />
            <Route path="admin/financials" element={<AdminFinancialsPage />} />
            <Route path="admin/vendors" element={<AdminVendorsPage />} />
            <Route path="admin/documents" element={<AdminDocumentsPage />} />
          </Route>
        </Route>
        <Route
          path="/profile"
          element={<ProtectedShell user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />}
        >
          <Route
            index
            element={
              <Profile
                user={user}
                onBack={() => navigate("/dashboard")}
                onUserUpdate={handleUserUpdate}
              />
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
