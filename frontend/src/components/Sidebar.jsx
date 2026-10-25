const groups = [
  {
    title: "OVERVIEW",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "▦" },
      { id: "family", label: "Family Members", icon: "♧" },
    ],
  },
  {
    title: "HEALTH MANAGEMENT",
    items: [
      { id: "medicines", label: "Medicines", icon: "✚" },
      { id: "health", label: "Health Records", icon: "♡" },
      { id: "history", label: "Medical History", icon: "◷" },
      { id: "doctors", label: "Doctors", icon: "⚕" },
      { id: "documents", label: "Documents", icon: "▤" },
      { id: "claims", label: "Medical Claims", icon: "◇" },
    ],
  },
  {
    title: "SMART TOOLS",
    items: [{ id: "ai", label: "AI Assistant", icon: "✦" }],
  },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  onLogout,
  mobileOpen,
  onClose,
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-[92px] items-center justify-between border-b border-slate-100 px-6">
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-2xl font-black text-white shadow-md">
              ✚
            </span>
            <span>
              <span className="block text-xl font-extrabold tracking-tight text-slate-900">
                Health<span className="text-blue-600">Sphere</span>
              </span>
              <span className="block text-[11px] font-semibold tracking-widest text-slate-400">
                FAMILY HEALTH PLATFORM
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="p-2 text-slate-500 lg:hidden"
          >
            ✕
          </button>
        </div>
        <nav
          aria-label="Main navigation"
          className="flex-1 space-y-6 overflow-y-auto px-3 py-6"
        >
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-4 text-[10px] font-bold tracking-[0.16em] text-slate-400">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    aria-current={currentPage === item.id ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${currentPage === item.id ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
                  >
                    <span
                      className="w-6 text-center text-xl leading-none"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </span>
                    {item.label}
                    {item.id === "ai" && (
                      <span
                        className={`ml-auto rounded-md px-1.5 py-0.5 text-[9px] font-bold ${currentPage === "ai" ? "bg-white/20 text-white" : "bg-teal-100 text-teal-700"}`}
                      >
                        AI
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 rounded-xl bg-gradient-to-r from-blue-50 to-teal-50 p-3">
            <p className="text-xs font-bold text-blue-900">
              Your family's care, organized.
            </p>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Keep your health information in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            <span aria-hidden="true">↪</span> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
