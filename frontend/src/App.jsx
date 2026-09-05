import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";
import AcceptInvite from "./pages/AcceptInvite/AcceptInvite";
import Profile from "./pages/Profile/Profile";
import Claim from "./pages/Claim/Claim";
import Login from "./pages/Login/Login";
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

function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [sessionChecked, setSessionChecked] = useState(!getStoredUser());

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      setSessionChecked(true);
      return;
    }

    apiFetch("/api/residents/me")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        persistSession({ user: data.user });
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setSessionChecked(true));
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

  if (!sessionChecked) {
    return null;
  }

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
          element={
            user ? (
              <Dashboard
                user={user}
                onNavigateToProfile={() => navigate("/profile")}
                onLogout={handleLogout}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            user ? (
              <Profile
                user={user}
                onBack={() => navigate("/dashboard")}
                onUserUpdate={handleUserUpdate}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
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
