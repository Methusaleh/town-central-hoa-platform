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
    email: "samplethis84@gmail.com",
    role: "super_admin",
  });

  const goToLanding = () => setView("landing");
  const goToProfile = () => setView("profile");
  const goToDashboard = (loggedInUser) => {
    // If no user is passed, or if the user is missing a first_name, 
    // provide a structured default to ensure the UI stays populated.
    const activeUser = (loggedInUser && loggedInUser.first_name) 
      ? loggedInUser 
      : {
          first_name: "Aaron",
          email: "samplethis84@gmail.com",
          role: "super_admin",
        };

    setUser(activeUser);
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