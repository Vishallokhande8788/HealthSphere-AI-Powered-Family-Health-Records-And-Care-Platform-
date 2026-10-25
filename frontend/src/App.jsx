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

const PAGE_TITLES = {
  dashboard: "Dashboard",
  family: "Family Members",
  doctors: "Doctors",
  history: "Medical History",
  medicines: "Medicines",
  health: "Health Records",
  documents: "Medical Documents",
  claims: "Medical Claims",
  ai: "AI Health Assistant",
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() =>
    Boolean(localStorage.getItem("access")),
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || "",
  );
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("username");
    delete api.defaults.headers.common.Authorization;
    setLoggedIn(false);
    setUsername("");
    setCurrentPage("dashboard");
    setMobileOpen(false);
  };

  useEffect(() => {
    window.addEventListener("auth:expired", handleLogout);
    return () => window.removeEventListener("auth:expired", handleLogout);
  }, []);

  const handleLogin = (name) => {
    const token = localStorage.getItem("access");
    if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
    if (name) {
      localStorage.setItem("username", name);
      setUsername(name);
    }
    setLoggedIn(true);
    setCurrentPage("dashboard");
  };

  const navigate = (page) => {
    setCurrentPage(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pages = {
    dashboard: <Dashboard username={username} onNavigate={navigate} />,
    family: <FamilyMembers />,
    doctors: <Doctors />,
    history: <MedicalHistory />,
    medicines: <Medicines />,
    health: <HealthRecords />,
    documents: <MedicalDocuments />,
    claims: <MedicalClaims />,
    ai: <AIAssistant />,
  };

  if (!loggedIn) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-800 lg:flex">
      <Sidebar
        currentPage={currentPage}
        onNavigate={navigate}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-700 lg:hidden"
            >
              ☰
            </button>
            <div>
              <p className="text-xs font-medium text-slate-400">
                HealthSphere / Workspace
              </p>
              <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                {PAGE_TITLES[currentPage]}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 sm:inline-flex">
              ● Your health workspace
            </span>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-teal-500 font-bold text-white"
              aria-label="User profile"
            >
              {(username || "U").charAt(0).toUpperCase()}
            </div>
            <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-700 md:block">
              {username || "My Account"}
            </span>
          </div>
        </header>
        <main id="main-content" className="min-w-0">
          {pages[currentPage] || pages.dashboard}
        </main>
      </div>
    </div>
  );
}
