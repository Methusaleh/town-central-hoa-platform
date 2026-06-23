import { useState } from "react";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";
import Profile from "./pages/Profile/Profile";
import Register from "./pages/Register/Register"; // 1. Import the new page

export default function App() {
  // 'view' can be "landing", "dashboard", "contact", or "register"
  const [view, setView] = useState("landing");

  // Test user state
  const [user, setUser] = useState({
    first_name: "Aaron",
    role: "super_admin",
  });

  const goToLanding = () => setView("landing");
  const goToProfile = () => setView("profile");
  const goToDashboard = (loggedInUser) => {
    if (loggedInUser && loggedInUser.first_name) {
      setUser(loggedInUser); // Dynamically set the user details from Google Auth!
    }
    setView("dashboard");
  };
  const goToContact = () => setView("contact");
  const goToRegister = () => setView("register"); // 2. Add the navigation handler

  return (
    <div className="app-container">
      {view === "landing" && (
        <Landing 
          onLogin={goToDashboard} 
          onRegisterClick={goToRegister} // 3. Pass register handler to landing
          onContactClick={goToContact} 
        />
      )}

      {view === "register" && (
        <Register onBack={goToLanding} onRegisterSuccess={goToDashboard} />
      )}

      {view === "dashboard" && (
        <Dashboard 
          user={user} 
          onNavigateToProfile={() => setView("profile")} 
          onLogout={() => {
            // Optional: clear user state on logout
            setUser(null);
            setView("landing");
          }}
        />
      )}

      {view === "contact" && <ContactPage onBack={goToLanding} />}

      {view === "profile" && (
        <Profile 
          user={user} 
          onBack={() => setView("dashboard")} 
          onUserUpdate={(updatedUser) => setUser(updatedUser)} // Injected real-time state bridge link
        />
      )}
    </div>
  );
}