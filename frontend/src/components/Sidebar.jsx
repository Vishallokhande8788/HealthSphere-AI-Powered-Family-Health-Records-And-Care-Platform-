function Sidebar({ currentPage, onNavigate, onLogout }) {
 const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "family", label: "Family Members", icon: "👨‍👩‍👧" },
  { id: "doctors", label: "Doctors", icon: "👨‍⚕️" },
  { id: "history", label: "Medical History", icon: "🩺" },
  { id: "medicines", label: "Medicines", icon: "💊" },
  { id: "health", label: "Health Records", icon: "❤️" },
  { id: "documents", label: "Documents", icon: "📄" },
  { id: "ai", label: "AI Assistant", icon: "🤖" },
];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="border-b border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-blue-600">Family Medicine</h1>

        <p className="mt-1 text-xs text-gray-500">Tracker</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Menu
        </p>

        <div className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                currentPage === item.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
              }`}
            >
              <span className="text-lg">{item.icon}</span>

              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
        >
          <span className="text-lg">🚪</span>

          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
