import { useState } from "react";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";
import Profile from "./pages/Profile/Profile";
import Claim from "./pages/Claim/Claim"; // Import the new Claim component

export default function App() {
  // 'view' can now be "landing", "dashboard", "contact", or "claim"
  const [view, setView] = useState("landing");

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
  const goToClaim = () => setView("claim"); // Updated handler name

  return (
    <div className="app-container">
      {view === "landing" && (
        <Landing 
          onLogin={goToDashboard} 
          onRegisterClick={goToClaim} // Updated to call goToClaim
          onContactClick={goToContact} 
        />
      )}

      {/* Updated view from "register" to "claim" */}
      {view === "claim" && (
        <Claim onBack={goToLanding} onClaimSuccess={goToDashboard} />
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