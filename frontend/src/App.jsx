// frontend/src/App.jsx
import { useState } from "react";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";
import AcceptInvite from "./pages/AcceptInvite/AcceptInvite";
import Profile from "./pages/Profile/Profile";
import Claim from "./pages/Claim/Claim";
import Login from "./pages/Login/Login"; // <-- 1. Import Login page

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get("invite") ? "accept-invite" : "landing";

  const [view, setView] = useState(initialView);
  const [user, setUser] = useState(null); // Starts null so users must authenticate!

  const goToLanding = () => setView("landing");
  const goToProfile = () => setView("profile");
  const goToLogin = () => setView("login"); // <-- 2. Handler to switch view to login
  
  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    setView("dashboard");
  };

  const handleLogout = () => {
    setUser(null);          // 3. Wipes active user session data completely
    setView("landing");     // Returns user safely back to the landing page
  };

  const goToContact = () => setView("contact");
  const goToClaim = () => setView("claim");

  return (
    <div className="app-container">
      {view === "landing" && (
        <Landing 
          onLogin={goToLogin} // <-- Clicking login takes them to the login view instead of hard-coding
          onRegisterClick={goToClaim} 
          onContactClick={goToContact} 
        />
      )}

      {view === "login" && (
        <Login 
          onBack={goToLanding} 
          onLoginSuccess={handleLoginSuccess} 
        />
      )}

      {view === "claim" && (
        <Claim onBack={goToLanding} onClaimSuccess={handleLoginSuccess} />
      )}

      {view === "accept-invite" && (
        <AcceptInvite 
          onBack={goToLanding} 
          onJoinSuccess={goToLanding} 
        />
      )}

      {view === "dashboard" && user && (
        <Dashboard 
          user={user} 
          onNavigateToProfile={() => setView("profile")} 
          onLogout={handleLogout} // <-- Connected to secure reset
        />
      )}

      {view === "contact" && <ContactPage onBack={goToLanding} />}

      {view === "profile" && user && (
        <Profile 
          user={user} 
          onBack={() => setView("dashboard")} 
          onUserUpdate={(updatedUser) => setUser(updatedUser)} 
        />
      )}
    </div>
  );
}