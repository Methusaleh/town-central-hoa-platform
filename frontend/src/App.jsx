import { useState } from "react";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";
import ContactPage from "./pages/Contact/ContactPage";

export default function App() {
  // 'view' can be "landing", "dashboard", or "contact"
  const [view, setView] = useState("landing");

  // Test user for dashboard verification
  const [user, setUser] = useState({
    first_name: "Aaron",
    role: "super_admin",
  });

  const goToLanding = () => setView("landing");
  const goToDashboard = () => setView("dashboard");
  const goToContact = () => setView("contact");

  return (
    <div className="app-container">
      {view === "landing" && (
        <Landing onLogin={goToDashboard} onContactClick={goToContact} />
      )}

      {view === "dashboard" && <Dashboard user={user} onLogout={goToLanding} />}

      {view === "contact" && <ContactPage onBack={goToLanding} />}
    </div>
  );
}
