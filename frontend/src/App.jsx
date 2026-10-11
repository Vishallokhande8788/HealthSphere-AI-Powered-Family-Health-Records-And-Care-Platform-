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

import Sidebar from "./components/Sidebar";

function App() {
  const [loggedIn, setLoggedIn] = useState(
    () => Boolean(localStorage.getItem("access"))
  );

  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || ""
  );

  const [currentPage, setCurrentPage] = useState("dashboard");

  // Restore the authentication token when the app starts.
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

  // Display the login page when the user is logged out.
  if (!loggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  // Render the selected page.
  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            username={username}
            onNavigate={setCurrentPage}
          />
        );

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
        return (
          <div className="min-h-screen bg-slate-50 p-6 sm:p-8">
            <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="text-4xl">🤖</div>

              <h1 className="mt-4 text-2xl font-bold text-slate-900">
                AI Health Assistant
              </h1>

              <p className="mt-3 text-slate-600">
                Get help understanding general health information and
                medicines. This feature is not connected yet.
              </p>

              <button
                type="button"
                onClick={() => setCurrentPage("dashboard")}
                className="mt-6 rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white transition hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return (
          <Dashboard
            username={username}
            onNavigate={setCurrentPage}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      {/* Single shared Sidebar */}
      <aside className="shrink-0">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onLogout={handleLogout}
        />
      </aside>

      {/* Main page content */}
      <main className="min-w-0 flex-1">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;