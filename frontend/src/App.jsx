import { useEffect, useState } from "react";
import api from "./api";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FamilyMembers from "./pages/FamilyMembers";
import MedicalClaims from "./pages/MedicalClaims";
import HealthRecords from "./pages/HealthRecords";
import Medicines from "./pages/Medicines";
import MedicalDocuments from "./pages/MedicalDocuments";
import Doctors from "./pages/Doctors";
import MedicalHistory from "./pages/MedicalHistory";
import AIAssistant from "./pages/AIAssistant";

import Sidebar from "./components/Sidebar";

function App() {
  const [loggedIn, setLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("access")),
  );

  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || "",
  );

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Restore authentication token when the app starts.
  useEffect(() => {
    const token = localStorage.getItem("access");

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  }, []);

  // Handle successful login.
  const handleLogin = (loggedInUsername) => {
    const token = localStorage.getItem("access");

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    if (loggedInUsername) {
      localStorage.setItem("username", loggedInUsername);
      setUsername(loggedInUsername);
    }

    setLoggedIn(true);
    setCurrentPage("dashboard");
  };

  // Handle logout.
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");

    delete api.defaults.headers.common["Authorization"];

    setLoggedIn(false);
    setUsername("");
    setCurrentPage("dashboard");
  };

  // Show login page if not authenticated.
  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Render selected page.
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard username={username} onNavigate={setCurrentPage} />;

      case "family":
        return <FamilyMembers />;

      case "doctors":
        return <Doctors />;

      case "history":
        return <MedicalHistory />;

      case "claims":
        return <MedicalClaims />;

      case "medicines":
        return <Medicines />;

      case "health":
        return <HealthRecords />;

      case "documents":
        return <MedicalDocuments />;

      case "ai":
        return <AIAssistant />;

      default:
        return <Dashboard username={username} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Shared Sidebar */}
      <aside className="shrink-0">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main Page Content */}
      <main className="min-w-0 flex-1">{renderPage()}</main>
    </div>
  );
}

export default App;
