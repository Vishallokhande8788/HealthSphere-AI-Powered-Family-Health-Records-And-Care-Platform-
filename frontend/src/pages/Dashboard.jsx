import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api";

const endpoints = {
  family: "family/family-members/",
  medicines: "medicines/medicines/",
  schedules: "medicines/schedules/",
  logs: "medicines/logs/",
  claims: "family/medical-claims/",
};

const toArray = (value) =>
  Array.isArray(value)
    ? value
    : Array.isArray(value?.results)
      ? value.results
      : [];
const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const formatTime = (value) => {
  if (!value) return "Not set";
  const [hour, minute] = String(value).split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};
const dateDifference = (dateString) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || "")) return null;
  const [y, m, d] = dateString.split("-").map(Number);
  const today = new Date();
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86400000);
};

function StatCard({ label, value, icon, accent, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[22px] border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {value}
          </p>
        </div>
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${accent}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-slate-400">
        {detail}{" "}
        <span className="ml-1 text-blue-600 group-hover:translate-x-1">→</span>
      </p>
    </button>
  );
}

function SectionTitle({ title, description, action, onAction }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-bold text-blue-600 hover:text-blue-800"
        >
          {action} →
        </button>
      )}
    </div>
  );
}

export default function Dashboard({ username, onNavigate }) {
  const [data, setData] = useState({
    family: [],
    medicines: [],
    schedules: [],
    logs: [],
    claims: [],
  });
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const today = localDate();

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setErrors([]);
      const results = await Promise.allSettled(
        Object.entries(endpoints).map(async ([key, url]) => {
          const response = await api.get(url, { signal: controller.signal });
          return [key, toArray(response.data)];
        }),
      );
      if (!active) return;
      const next = {
        family: [],
        medicines: [],
        schedules: [],
        logs: [],
        claims: [],
      };
      const failures = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const [key, items] = result.value;
          next[key] = items;
        } else {
          const section = Object.keys(endpoints)[index];
          const status = result.reason?.response?.status;
          failures.push(
            status === 401
              ? "Your session expired. Please log in again."
              : `Could not load ${section}${status ? ` (HTTP ${status})` : ""}.`,
          );
        }
      });
      setData(next);
      setErrors(failures);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  const todaySchedules = useMemo(
    () =>
      data.schedules
        .filter(
          (item) =>
            (!item.start_date || item.start_date <= today) &&
            (!item.end_date || item.end_date >= today),
        )
        .sort((a, b) =>
          String(a.time || "").localeCompare(String(b.time || "")),
        ),
    [data.schedules, today],
  );

  const todayLogs = useMemo(
    () =>
      data.logs.filter(
        (item) => String(item.date || "").slice(0, 10) === today,
      ),
    [data.logs, today],
  );
  const statusOf = (id) => {
    const matching = todayLogs.filter(
      (log) => String(log.schedule) === String(id),
    );
    return String(
      matching[matching.length - 1]?.status || "pending",
    ).toLowerCase();
  };
  const taken = todaySchedules.filter(
    (item) => statusOf(item.id) === "taken",
  ).length;
  const missed = todaySchedules.filter(
    (item) => statusOf(item.id) === "missed",
  ).length;
  const pending = todaySchedules.length - taken - missed;
  const completion = todaySchedules.length
    ? Math.round((taken / todaySchedules.length) * 100)
    : 0;
  const medicineById = useMemo(
    () => new Map(data.medicines.map((item) => [String(item.id), item])),
    [data.medicines],
  );
  const nextRenewal = data.claims
    .map((claim) => ({ ...claim, days: dateDifference(claim.renewal_date) }))
    .filter((claim) => claim.days !== null && claim.days >= 0)
    .sort((a, b) => a.days - b.days)[0];
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  return (
    <div className="mx-auto max-w-[1550px] space-y-7 px-4 py-7 sm:px-7 lg:px-9">
      <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#1647b9] via-[#1566c8] to-[#12a7a8] px-6 py-8 text-white shadow-lg shadow-blue-100 sm:px-9 sm:py-10">
        <div
          className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[35px] border-white/10"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-[-110px] right-28 h-60 w-60 rounded-full bg-white/5"
          aria-hidden="true"
        />
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wide">
            ✦ YOUR HEALTH, SIMPLIFIED
          </span>
          <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-4xl">
            {greeting}
            {username ? `, ${username}` : ""} <span aria-hidden="true">👋</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50 sm:text-base">
            A clear view of your family's medicines, health records, and
            important care reminders—all in one place.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate("family")}
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
            >
              + Add Family Member
            </button>
            <button
              type="button"
              onClick={() => onNavigate("ai")}
              className="rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              ✦ Ask AI Assistant
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
            OVERVIEW
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">
            Your health at a glance
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
            📅{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          <p className="font-bold">Some dashboard data could not be loaded.</p>
          <p className="mt-1">{errors.join(" ")}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 font-bold text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <div
          role="status"
          className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm"
        >
          Loading your dashboard...
        </div>
      ) : (
        <>
          <section
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Health summary"
          >
            <StatCard
              label="Family Members"
              value={data.family.length}
              icon="♧"
              accent="bg-blue-50 text-blue-600"
              detail="View family profiles"
              onClick={() => onNavigate("family")}
            />
            <StatCard
              label="Today's Schedules"
              value={todaySchedules.length}
              icon="✚"
              accent="bg-cyan-50 text-cyan-700"
              detail="View medicine schedules"
              onClick={() => onNavigate("medicines")}
            />
            <StatCard
              label="Doses Taken"
              value={taken}
              icon="✓"
              accent="bg-emerald-50 text-emerald-700"
              detail="Recorded today"
              onClick={() => onNavigate("medicines")}
            />
            <StatCard
              label="Pending Doses"
              value={pending}
              icon="◷"
              accent="bg-amber-50 text-amber-700"
              detail={`${missed} marked missed`}
              onClick={() => onNavigate("medicines")}
            />
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]">
            <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
              <SectionTitle
                title="Today's medicine schedule"
                description="Your scheduled doses and recorded status"
                action="Manage medicines"
                onAction={() => onNavigate("medicines")}
              />
              {todaySchedules.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-5 py-12 text-center">
                  <div className="text-4xl">💊</div>
                  <p className="mt-3 font-bold text-slate-800">
                    No doses scheduled for today
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Add a medicine schedule to start tracking.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate("medicines")}
                    className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    Manage Medicines
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {todaySchedules.slice(0, 7).map((schedule) => {
                    const medicine = medicineById.get(
                      String(schedule.medicine),
                    );
                    const status = statusOf(schedule.id);
                    const style =
                      status === "taken"
                        ? "bg-emerald-50 text-emerald-700"
                        : status === "missed"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-amber-50 text-amber-700";
                    return (
                      <div
                        key={schedule.id}
                        className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0"
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-600">
                          ✚
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {medicine?.name || "Medicine"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {schedule.dosage ||
                              medicine?.dosage ||
                              "Dose not specified"}
                            {schedule.meal_relation
                              ? ` • ${String(schedule.meal_relation).replaceAll("_", " ")}`
                              : ""}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-slate-700">
                          {formatTime(schedule.time)}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1.5 text-[11px] font-bold capitalize ${style}`}
                        >
                          {status}
                        </span>
                      </div>
                    );
                  })}
                  {todaySchedules.length > 7 && (
                    <button
                      type="button"
                      onClick={() => onNavigate("medicines")}
                      className="pt-4 text-sm font-bold text-blue-600"
                    >
                      View all {todaySchedules.length} schedules →
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-5">
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
                <SectionTitle
                  title="Medicine adherence"
                  description="Today's recorded progress"
                />
                <div className="flex items-center gap-5">
                  <div
                    className="relative grid h-32 w-32 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#10b981 ${completion}%, #e9eff6 0)`,
                    }}
                  >
                    <div className="grid h-[100px] w-[100px] place-content-center rounded-full bg-white text-center">
                      <strong className="text-3xl font-extrabold text-slate-900">
                        {completion}%
                      </strong>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Taken today
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <p>
                      <span className="mr-2 text-emerald-500">●</span>
                      <strong>{taken}</strong> Taken
                    </p>
                    <p>
                      <span className="mr-2 text-amber-500">●</span>
                      <strong>{pending}</strong> Pending
                    </p>
                    <p>
                      <span className="mr-2 text-rose-500">●</span>
                      <strong>{missed}</strong> Missed
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  Based on saved medicine logs; not a medical assessment.
                </p>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
                <SectionTitle
                  title="Insurance reminders"
                  description="Upcoming policy renewal"
                  action="View claims"
                  onAction={() => onNavigate("claims")}
                />
                {nextRenewal ? (
                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-sm font-bold text-slate-900">
                      {nextRenewal.claim_name || "Medical claim"}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Renewal: {nextRenewal.renewal_date}
                    </p>
                    <p className="mt-3 text-sm font-bold text-amber-700">
                      {nextRenewal.days === 0
                        ? "Due today"
                        : `Due in ${nextRenewal.days} day${nextRenewal.days === 1 ? "" : "s"}`}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    No upcoming renewal found.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
            <SectionTitle
              title="Quick access"
              description="Open your healthcare tools"
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["family", "Family Members", "♧", "bg-blue-50 text-blue-700"],
                ["medicines", "Medicines", "✚", "bg-teal-50 text-teal-700"],
                ["health", "Health Records", "♡", "bg-rose-50 text-rose-700"],
                ["doctors", "Doctors", "⚕", "bg-violet-50 text-violet-700"],
                [
                  "history",
                  "Medical History",
                  "◷",
                  "bg-amber-50 text-amber-700",
                ],
                ["documents", "Documents", "▤", "bg-indigo-50 text-indigo-700"],
                ["claims", "Medical Claims", "◇", "bg-cyan-50 text-cyan-700"],
                ["ai", "AI Assistant", "✦", "bg-purple-50 text-purple-700"],
              ].map(([id, label, icon, color]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className="group flex flex-col items-start rounded-2xl border border-slate-100 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-2xl ${color}`}
                  >
                    {icon}
                  </span>
                  <span className="mt-3 text-sm font-bold text-slate-800 group-hover:text-blue-700">
                    {label}
                  </span>
                  <span className="mt-1 text-xs text-slate-400">Open →</span>
                </button>
              ))}
            </div>
          </section>
          <p className="pb-4 text-center text-xs text-slate-400">
            HealthSphere • Family health management • For information and record
            keeping
          </p>
        </>
      )}
    </div>
  );
}
