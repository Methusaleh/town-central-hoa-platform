import { useState } from "react";
import Landing from "./pages/Landing/Landing";
import Dashboard from "./pages/Dashboard/Dashboard";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Hardcoded test user with 'super_admin' role to test the Board Portal access
  const [user, setUser] = useState({
    first_name: "Aaron",
    role: "super_admin",
  });

  const handleLogin = () => setIsLoggedIn(true);
  const handleLogout = () => setIsLoggedIn(false);

  return (
    <div className="app-container">
      {isLoggedIn ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <Landing onLogin={handleLogin} />
      )}
    </div>
  );
}
