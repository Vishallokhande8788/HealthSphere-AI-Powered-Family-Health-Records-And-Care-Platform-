import { useEffect, useState } from "react";
import api from "../api";

function Dashboard({ username, onNavigate }) {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [claims, setClaims] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        familyResponse,
        medicinesResponse,
        schedulesResponse,
        logsResponse,
        claimsResponse,
      ] = await Promise.all([
        api.get("family/family-members/"),
        api.get("medicines/medicines/"),
        api.get("medicines/schedules/"),
        api.get("medicines/logs/"),
        api.get("family/medical-claims/"),
      ]);

      setFamilyMembers(getArray(familyResponse.data));
      setMedicines(getArray(medicinesResponse.data));
      setSchedules(getArray(schedulesResponse.data));
      setLogs(getArray(logsResponse.data));
      setClaims(getArray(claimsResponse.data));
    } catch (err) {
      console.error("Dashboard error:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log out and log in again.");
      } else if (err.response?.status === 403) {
        setError("You do not have permission to access this information.");
      } else {
        setError(
          "Unable to load dashboard data. Please check your connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Use the local date to avoid UTC date differences.
  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  // Today's active medicine schedules.
  const todaysSchedules = schedules.filter((schedule) => {
    const startsTodayOrEarlier =
      !schedule.start_date || schedule.start_date <= today;

    const hasNotEnded =
      !schedule.end_date || schedule.end_date >= today;

    return startsTodayOrEarlier && hasNotEnded;
  });

  // Today's medicine logs.
  const todaysLogs = logs.filter((log) => log.date === today);

  const getScheduleStatus = (scheduleId) => {
    const log = todaysLogs.find(
      (item) => String(item.schedule) === String(scheduleId)
    );

    return log?.status || "pending";
  };

  const takenCount = todaysSchedules.filter(
    (schedule) => getScheduleStatus(schedule.id) === "taken"
  ).length;

  const missedCount = todaysSchedules.filter(
    (schedule) => getScheduleStatus(schedule.id) === "missed"
  ).length;

  const pendingCount = todaysSchedules.filter(
    (schedule) => getScheduleStatus(schedule.id) === "pending"
  ).length;

  const getMedicine = (medicineId) => {
    return medicines.find(
      (medicine) => String(medicine.id) === String(medicineId)
    );
  };

  // Calculate the number of days until a claim renewal.
  const getClaimDaysRemaining = (renewalDate) => {
    if (!renewalDate) return null;

    const [year, month, day] = renewalDate.split("-").map(Number);

    if (!year || !month || !day) return null;

    const todayDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const renewal = new Date(year, month - 1, day);

    return Math.round(
      (renewal.getTime() - todayDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );
  };

  const upcomingClaim = claims
    .map((claim) => ({
      ...claim,
      daysRemaining: getClaimDaysRemaining(claim.renewal_date),
    }))
    .filter(
      (claim) =>
        claim.daysRemaining !== null && claim.daysRemaining >= 0
    )
    .sort((a, b) => a.daysRemaining - b.daysRemaining)[0];

  // Format a medicine schedule time.
  const formatTime = (time) => {
    if (!time) return "Time not set";

    const [hours, minutes] = time.split(":");

    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const quickActions = [
    {
      id: "family",
      icon: "👨‍👩‍👧",
      title: "Family Members",
      description: "Manage family profiles",
      color: "bg-blue-50",
    },
    {
      id: "doctors",
      icon: "👨‍⚕️",
      title: "Doctors",
      description: "Manage doctors and specialists",
      color: "bg-purple-50",
    },
    {
      id: "history",
      icon: "🩺",
      title: "Medical History",
      description: "View family medical history",
      color: "bg-rose-50",
    },
    {
      id: "medicines",
      icon: "💊",
      title: "Medicines",
      description: "Manage medicines and schedules",
      color: "bg-green-50",
    },
    {
      id: "health",
      icon: "❤️",
      title: "Health Records",
      description: "View health measurements",
      color: "bg-red-50",
    },
    {
      id: "documents",
      icon: "📄",
      title: "Documents",
      description: "Manage medical documents",
      color: "bg-indigo-50",
    },
    {
      id: "claims",
      icon: "🛡️",
      title: "Medical Claims",
      description: "Track insurance and renewal dates",
      color: "bg-yellow-50",
    },
    {
      id: "ai",
      icon: "🤖",
      title: "AI Assistant",
      description: "Get health information assistance",
      color: "bg-violet-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-500">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dashboard header */}
      <header className="border-b border-gray-200 bg-white px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              GOOD MORNING 👋
            </p>

            <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
              Welcome back{username ? `, ${username}` : ""}!
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Here's what's happening with your family's health today.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="text-xs text-gray-500">Today's date</p>
              <p className="text-sm font-semibold text-gray-800">
                {now.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-7 p-5 sm:p-8">
        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={loadDashboardData}
              className="w-fit rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Medical claim renewal alert */}
        {upcomingClaim && (
          <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                🛡️
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-gray-900">
                  Medical Claim Renewal Alert
                </h2>

                <p className="mt-2 text-sm leading-6 text-gray-600">
                  <strong>{upcomingClaim.claim_name}</strong> renewal is
                  due on{" "}
                  <strong>{upcomingClaim.renewal_date}</strong>.
                </p>

                <span className="mt-3 inline-flex rounded-lg bg-yellow-100 px-3 py-2 text-xs font-semibold text-yellow-800">
                  ⚠️{" "}
                  {upcomingClaim.daysRemaining === 0
                    ? "Renewal is due today"
                    : `Renewal in ${upcomingClaim.daysRemaining} day${
                        upcomingClaim.daysRemaining === 1 ? "" : "s"
                      }`}
                </span>

                <button
                  type="button"
                  onClick={() => onNavigate("claims")}
                  className="ml-3 mt-3 text-sm font-semibold text-blue-700 hover:underline"
                >
                  View claims →
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Statistics */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Health Overview
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              A quick look at your family's health information.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              onClick={() => onNavigate("family")}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Family Members</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {familyMembers.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                  👨‍👩‍👧
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("medicines")}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Today's Medicines
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {todaysSchedules.length}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-2xl">
                  💊
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("medicines")}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Medicines Taken</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {takenCount}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">
                  ✓
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate("medicines")}
              className="rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {pendingCount}
                  </p>
                  {missedCount > 0 && (
                    <p className="mt-1 text-xs text-red-600">
                      {missedCount} missed
                    </p>
                  )}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-2xl">
                  ⏰
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* Today's medicine schedule */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Today's Medicines
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Keep track of your family's medicine schedule.
            </p>
          </div>

          {todaysSchedules.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <div className="text-4xl">💊</div>
              <h3 className="mt-3 font-semibold text-gray-900">
                No medicines scheduled for today
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Add a medicine schedule to start tracking.
              </p>

              <button
                type="button"
                onClick={() => onNavigate("medicines")}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Manage Medicines
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysSchedules.map((schedule) => {
                const medicine = getMedicine(schedule.medicine);
                const status = getScheduleStatus(schedule.id);

                const statusStyles = {
                  taken: "bg-green-100 text-green-700",
                  missed: "bg-red-100 text-red-700",
                  pending: "bg-orange-100 text-orange-700",
                };

                return (
                  <div
                    key={schedule.id}
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                          💊
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {medicine?.name || "Medicine"}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {schedule.dosage || medicine?.dosage || ""}
                            {schedule.meal_relation
                              ? ` • ${schedule.meal_relation.replaceAll(
                                  "_",
                                  " "
                                )}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:justify-end">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {formatTime(schedule.time)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              statusStyles[status] ||
                              statusStyles.pending
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Quickly open a section of your health management system.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onNavigate(action.id)}
                className="group rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${action.color} text-2xl`}
                >
                  {action.icon}
                </div>

                <h3 className="mt-4 font-semibold text-gray-900 group-hover:text-blue-700">
                  {action.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {action.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-blue-600">
                  Open section →
                </p>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;