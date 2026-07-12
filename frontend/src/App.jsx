import { useState } from "react";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";
import AcceptInvite from "./pages/AcceptInvite/AcceptInvite";
import Profile from "./pages/Profile/Profile";
import Claim from "./pages/Claim/Claim";

export default function App() {
  // Check the URL for the token BEFORE setting the initial state
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get("invite") ? "accept-invite" : "landing";

  // 'view' can now be "landing", "dashboard", "contact", "claim", "profile", or "accept-invite"
  const [view, setView] = useState(initialView);

  const [user, setUser] = useState({
    first_name: "Aaron",
    email: "samplethis84@gmail.com",
    role: "super_admin",
  });

  const goToLanding = () => setView("landing");
  const goToProfile = () => setView("profile");
  const goToDashboard = (loggedInUser) => {
    const activeUser = (loggedInUser && loggedInUser.first_name) 
      ? loggedInUser 
      : { first_name: "Aaron", email: "samplethis84@gmail.com", role: "super_admin" };
    setUser(activeUser);
    setView("dashboard");
  };
  const goToContact = () => setView("contact");
  const goToClaim = () => setView("claim");

  return (
    <div className="app-container">
      {view === "landing" && (
        <Landing 
          onLogin={goToDashboard} 
          onRegisterClick={goToClaim} 
          onContactClick={goToContact} 
        />
      )}

      {view === "claim" && (
        <Claim onBack={goToLanding} onClaimSuccess={goToDashboard} />
      )}

      {/* New Invitation Flow Routing */}
      {view === "accept-invite" && (
        <AcceptInvite 
          onBack={goToLanding} 
          onJoinSuccess={goToLanding} 
        />
      )}

      {view === "dashboard" && (
        <Dashboard 
          user={user} 
          onNavigateToProfile={() => setView("profile")} 
          onLogout={() => { setUser(null); setView("landing"); }}
        />
      )}

      {view === "contact" && <ContactPage onBack={goToLanding} />}

      {view === "profile" && (
        <Profile 
          user={user} 
          onBack={() => setView("dashboard")} 
          onUserUpdate={(updatedUser) => setUser(updatedUser)} 
        />
      )}
    </div>
  );
}