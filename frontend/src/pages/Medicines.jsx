import { useEffect, useMemo, useState } from "react";
import api from "../api";

const MEDICINES_URL = "medicines/medicines/";
const SCHEDULES_URL = "medicines/schedules/";
const FAMILY_URL = "family/family-members/";
const emptyMedicine = {
  family_member: "",
  name: "",
  dosage: "",
  quantity: "",
  instructions: "",
  start_date: "",
  end_date: "",
};
const emptySchedule = {
  time: "",
  dosage: "",
  meal_relation: "anytime",
  start_date: "",
  end_date: "",
};
const toArray = (data) =>
  Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
const idOf = (value) => (value && typeof value === "object" ? value.id : value);
const sameId = (a, b) => String(idOf(a)) === String(idOf(b));
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const friendlyError = (err) => {
  const data = err.response?.data;
  if (err.response?.status === 401)
    return "Session expired. Please log in again.";
  if (err.response?.status === 403)
    return "You do not have permission to do this.";
  if (typeof data === "string") return data;
  if (data && typeof data === "object")
    return Object.entries(data)
      .map(
        ([field, value]) =>
          `${field}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : value}`,
      )
      .join(" | ");
  return err.message || "Something went wrong. Please try again.";
};
const dateLabel = (date) => date || "Ongoing";
const mealLabel = (value) =>
  ({
    before_food: "Before food",
    after_food: "After food",
    with_food: "With food",
    anytime: "Anytime",
  })[value] ||
  value ||
  "Anytime";
const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-semibold text-slate-700">
      {label}
    </span>
    {children}
  </label>
);
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [medicineModal, setMedicineModal] = useState(false);
  const [scheduleModal, setScheduleModal] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [medicineForm, setMedicineForm] = useState({ ...emptyMedicine });
  const [scheduleForm, setScheduleForm] = useState({ ...emptySchedule });
  const [busy, setBusy] = useState(false);
  const [deletingKey, setDeletingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("");

  const notify = (text) => {
    setError("");
    setMessage(text);
  };
  const clearNotice = () => {
    setError("");
    setMessage("");
  };

  const loadData = async () => {
    setLoading(true);
    setLoadFailed(false);
    setError("");
    try {
      const [m, f, s] = await Promise.all([
        api.get(MEDICINES_URL),
        api.get(FAMILY_URL),
        api.get(SCHEDULES_URL),
      ]);
      setMedicines(toArray(m.data));
      setFamilyMembers(toArray(f.data));
      setSchedules(toArray(s.data));
    } catch (err) {
      setLoadFailed(true);
      setError(`Could not load medicines: ${friendlyError(err)}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
  }, []);

  const familyName = (id) => {
    const member = familyMembers.find((item) => sameId(item.id, id));
    return member
      ? `${member.name} (${member.relation || "Family"})`
      : "Family member";
  };
  const filtered = useMemo(
    () =>
      medicines.filter((m) => {
        const matchesSearch =
          `${m.name || ""} ${m.dosage || ""} ${familyName(m.family_member)}`
            .toLowerCase()
            .includes(search.toLowerCase());
        return (
          matchesSearch &&
          (!familyFilter || sameId(m.family_member, familyFilter))
        );
      }),
    [medicines, familyMembers, search, familyFilter],
  );
  const today = todayLocal();
  const stats = useMemo(
    () => ({
      total: medicines.length,
      active: medicines.filter(
        (m) =>
          (!m.start_date || m.start_date <= today) &&
          (!m.end_date || m.end_date >= today),
      ).length,
      lowStock: medicines.filter(
        (m) =>
          m.quantity !== null &&
          m.quantity !== undefined &&
          m.quantity !== "" &&
          Number(m.quantity) <= 5,
      ).length,
      schedules: schedules.length,
    }),
    [medicines, schedules, today],
  );

  const openAddMedicine = () => {
    clearNotice();
    setEditingMedicine(null);
    setMedicineForm({
      ...emptyMedicine,
      family_member:
        familyMembers.length === 1 ? String(familyMembers[0].id) : "",
      start_date: todayLocal(),
    });
    setMedicineModal(true);
  };
  const openEditMedicine = (m) => {
    clearNotice();
    setEditingMedicine(m);
    setMedicineForm({
      family_member: String(idOf(m.family_member) ?? ""),
      name: m.name || "",
      dosage: m.dosage || "",
      quantity: m.quantity ?? "",
      instructions: m.instructions || "",
      start_date: m.start_date || "",
      end_date: m.end_date || "",
    });
    setMedicineModal(true);
  };
  const closeMedicine = () => {
    if (!busy) {
      setMedicineModal(false);
      setEditingMedicine(null);
      setError("");
    }
  };
  const submitMedicine = async (event) => {
    event.preventDefault();
    clearNotice();
    if (
      !medicineForm.family_member ||
      !medicineForm.name.trim() ||
      !medicineForm.dosage.trim() ||
      !medicineForm.start_date
    ) {
      setError(
        "Family member, medicine name, dosage and start date are required.",
      );
      return;
    }
    if (
      medicineForm.end_date &&
      medicineForm.end_date < medicineForm.start_date
    ) {
      setError("End date cannot be before start date.");
      return;
    }
    if (
      medicineForm.quantity !== "" &&
      (!Number.isInteger(Number(medicineForm.quantity)) ||
        Number(medicineForm.quantity) < 0)
    ) {
      setError("Quantity must be a non-negative whole number.");
      return;
    }
    const payload = {
      family_member: Number(medicineForm.family_member),
      name: medicineForm.name.trim(),
      dosage: medicineForm.dosage.trim(),
      quantity:
        medicineForm.quantity === "" ? 0 : Number(medicineForm.quantity),
      instructions: medicineForm.instructions.trim(),
      start_date: medicineForm.start_date,
      end_date: medicineForm.end_date || null,
    };
    setBusy(true);
    try {
      if (editingMedicine) {
        const res = await api.put(
          `${MEDICINES_URL}${editingMedicine.id}/`,
          payload,
        );
        setMedicines((old) =>
          old.map((m) => (sameId(m.id, editingMedicine.id) ? res.data : m)),
        );
        notify("Medicine updated successfully.");
      } else {
        const res = await api.post(MEDICINES_URL, payload);
        setMedicines((old) => [...old, res.data]);
        notify("Medicine added successfully.");
      }
      setMedicineModal(false);
      setEditingMedicine(null);
    } catch (err) {
      setError(`Could not save medicine: ${friendlyError(err)}`);
    } finally {
      setBusy(false);
    }
  };
  const deleteMedicine = async (m) => {
    if (
      !window.confirm(
        `Delete ${m.name}? This may also delete its schedules and related records.`,
      )
    )
      return;
    clearNotice();
    setDeletingKey(`m-${m.id}`);
    try {
      await api.delete(`${MEDICINES_URL}${m.id}/`);
      setMedicines((old) => old.filter((item) => !sameId(item.id, m.id)));
      setSchedules((old) => old.filter((s) => !sameId(s.medicine, m.id)));
      notify("Medicine deleted.");
    } catch (err) {
      setError(`Could not delete medicine: ${friendlyError(err)}`);
    } finally {
      setDeletingKey("");
    }
  };
  const openAddSchedule = (medicine) => {
    clearNotice();
    setEditingSchedule(null);
    setScheduleForm({
      ...emptySchedule,
      dosage: medicine.dosage || "",
      start_date: medicine.start_date || todayLocal(),
      end_date: medicine.end_date || "",
    });
    setScheduleModal(medicine.id);
  };
  const openEditSchedule = (s) => {
    clearNotice();
    setEditingSchedule(s);
    setScheduleForm({
      time: (s.time || "").slice(0, 5),
      dosage: s.dosage || "",
      meal_relation: s.meal_relation || "anytime",
      start_date: s.start_date || "",
      end_date: s.end_date || "",
    });
    setScheduleModal(idOf(s.medicine));
  };
  const closeSchedule = () => {
    if (!busy) {
      setScheduleModal(null);
      setEditingSchedule(null);
      setError("");
    }
  };
  const submitSchedule = async (event) => {
    event.preventDefault();
    clearNotice();
    if (
      !scheduleForm.time ||
      !scheduleForm.dosage.trim() ||
      !scheduleForm.start_date
    ) {
      setError("Time, dosage and start date are required.");
      return;
    }
    if (
      scheduleForm.end_date &&
      scheduleForm.end_date < scheduleForm.start_date
    ) {
      setError("End date cannot be before start date.");
      return;
    }
    const payload = {
      medicine: Number(scheduleModal),
      time: scheduleForm.time,
      dosage: scheduleForm.dosage.trim(),
      meal_relation: scheduleForm.meal_relation,
      start_date: scheduleForm.start_date,
      end_date: scheduleForm.end_date || null,
    };
    setBusy(true);
    try {
      if (editingSchedule) {
        const res = await api.put(
          `${SCHEDULES_URL}${editingSchedule.id}/`,
          payload,
        );
        setSchedules((old) =>
          old.map((s) => (sameId(s.id, editingSchedule.id) ? res.data : s)),
        );
        notify("Schedule updated successfully.");
      } else {
        const res = await api.post(SCHEDULES_URL, payload);
        setSchedules((old) => [...old, res.data]);
        notify("Schedule added successfully.");
      }
      setScheduleModal(null);
      setEditingSchedule(null);
    } catch (err) {
      setError(`Could not save schedule: ${friendlyError(err)}`);
    } finally {
      setBusy(false);
    }
  };
  const deleteSchedule = async (s) => {
    if (!window.confirm("Delete this medicine schedule?")) return;
    clearNotice();
    setDeletingKey(`s-${s.id}`);
    try {
      await api.delete(`${SCHEDULES_URL}${s.id}/`);
      setSchedules((old) => old.filter((item) => !sameId(item.id, s.id)));
      notify("Schedule deleted.");
    } catch (err) {
      setError(`Could not delete schedule: ${friendlyError(err)}`);
    } finally {
      setDeletingKey("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              HealthSphere / Treatment
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Medicine Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Organize medicines, stock and daily schedules for your family.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddMedicine}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            + Add Medicine
          </button>
        </div>
        {message && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800"
          >
            ✓ {message}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700"
          >
            ⚠ {error}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Total medicines", stats.total, "💊"],
            ["Currently in date range", stats.active, "✓"],
            ["Stock 5 or less", stats.lowStock, "⚠"],
            ["Saved schedules", stats.schedules, "🕒"],
          ].map(([label, count, icon]) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                  {label}
                </span>
                <span className="text-xl">{icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">
                {loading ? "—" : count}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search medicine or family member..."
            className={`${inputClass} flex-1`}
          />
          <select
            value={familyFilter}
            onChange={(e) => setFamilyFilter(e.target.value)}
            className={`${inputClass} sm:w-64`}
          >
            <option value="">All family members</option>
            {familyMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.relation})
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
            Loading medicines...
          </div>
        ) : loadFailed ? (
          <div className="rounded-2xl bg-white p-12 text-center">
            <p className="font-semibold text-slate-700">
              Could not load your data.
            </p>
            <button
              onClick={loadData}
              className="mt-4 rounded-xl bg-blue-600 px-5 py-2 text-white"
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <p className="text-4xl">💊</p>
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              {medicines.length
                ? "No matching medicines"
                : "No medicines added yet"}
            </h2>
            <p className="mt-2 text-slate-500">
              {medicines.length
                ? "Try another search or filter."
                : "Add your first medicine to get started."}
            </p>
            {!medicines.length && (
              <button
                onClick={openAddMedicine}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                + Add Medicine
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filtered.map((m) => {
              const ms = schedules
                .filter((s) => sameId(s.medicine, m.id))
                .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
              const isPast = Boolean(m.end_date && m.end_date < today);
              const isFuture = Boolean(m.start_date && m.start_date > today);
              const stockKnown =
                m.quantity !== null &&
                m.quantity !== undefined &&
                m.quantity !== "";
              const low = stockKnown && Number(m.quantity) <= 5;
              return (
                <article
                  key={m.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                        💊
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-xl font-bold text-slate-900">
                          {m.name}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {familyName(m.family_member)}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${isPast ? "bg-slate-100 text-slate-600" : isFuture ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}
                      >
                        {isPast
                          ? "Date ended"
                          : isFuture
                            ? "Upcoming"
                            : "In date range"}
                      </span>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ["Dosage", m.dosage || "—"],
                        ["Quantity", stockKnown ? String(m.quantity) : "—"],
                        ["Start", dateLabel(m.start_date)],
                        ["End", dateLabel(m.end_date)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-3">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                    {low && (
                      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                        ⚠{" "}
                        {Number(m.quantity) === 0
                          ? "Stock is empty"
                          : "Low stock (5 or fewer units)"}
                      </p>
                    )}
                    {m.instructions && (
                      <div className="mt-4 rounded-xl bg-blue-50 p-4">
                        <p className="text-xs font-bold uppercase text-blue-700">
                          Instructions
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                          {m.instructions}
                        </p>
                      </div>
                    )}
                    <div className="mt-5 flex gap-2">
                      <button
                        onClick={() => openEditMedicine(m)}
                        className="rounded-lg bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteMedicine(m)}
                        disabled={Boolean(deletingKey)}
                        className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingKey === `m-${m.id}`
                          ? "Deleting..."
                          : "🗑️ Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 bg-slate-50 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">
                          Daily schedules
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {ms.length} saved schedule{ms.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        onClick={() => openAddSchedule(m)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Schedule
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {ms.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
                          No schedules yet. Add a dose time.
                        </div>
                      ) : (
                        ms.map((s) => (
                          <div
                            key={s.id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-bold text-slate-900">
                                  🕒 {(s.time || "").slice(0, 5)}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {s.dosage} · {mealLabel(s.meal_relation)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {s.start_date || "—"} →{" "}
                                  {dateLabel(s.end_date)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditSchedule(s)}
                                  className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteSchedule(s)}
                                  disabled={Boolean(deletingKey)}
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                                >
                                  {deletingKey === `s-${s.id}`
                                    ? "Deleting..."
                                    : "Delete"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {medicineModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeMedicine();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="medicine-title"
              className="my-6 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-600">
                    Medicine details
                  </p>
                  <h2
                    id="medicine-title"
                    className="mt-1 text-2xl font-bold text-slate-900"
                  >
                    {editingMedicine ? "Edit Medicine" : "Add New Medicine"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeMedicine}
                  aria-label="Close"
                  className="rounded-lg p-2 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={submitMedicine} className="space-y-5 p-6">
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <Field label="Family member *">
                  <select
                    required
                    name="family_member"
                    value={medicineForm.family_member}
                    onChange={(e) =>
                      setMedicineForm((f) => ({
                        ...f,
                        family_member: e.target.value,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="">Select family member</option>
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.relation})
                      </option>
                    ))}
                  </select>
                  {familyMembers.length === 0 && (
                    <p className="mt-2 text-sm text-red-600">
                      Add a family member first on the Family Members page.
                    </p>
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Medicine name *">
                    <input
                      required
                      name="name"
                      value={medicineForm.name}
                      onChange={(e) =>
                        setMedicineForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Example: Amlodipine"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Dosage *">
                    <input
                      required
                      name="dosage"
                      value={medicineForm.dosage}
                      onChange={(e) =>
                        setMedicineForm((f) => ({
                          ...f,
                          dosage: e.target.value,
                        }))
                      }
                      placeholder="Example: 1 tablet"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Quantity">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="quantity"
                      value={medicineForm.quantity}
                      onChange={(e) =>
                        setMedicineForm((f) => ({
                          ...f,
                          quantity: e.target.value,
                        }))
                      }
                      placeholder="Example: 30"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Start date *">
                    <input
                      type="date"
                      required
                      value={medicineForm.start_date}
                      onChange={(e) =>
                        setMedicineForm((f) => ({
                          ...f,
                          start_date: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="End date">
                    <input
                      type="date"
                      min={medicineForm.start_date || undefined}
                      value={medicineForm.end_date}
                      onChange={(e) =>
                        setMedicineForm((f) => ({
                          ...f,
                          end_date: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="Instructions">
                  <textarea
                    rows="3"
                    value={medicineForm.instructions}
                    onChange={(e) =>
                      setMedicineForm((f) => ({
                        ...f,
                        instructions: e.target.value,
                      }))
                    }
                    placeholder="Example: Take after food, as directed by the doctor"
                    className={inputClass}
                  />
                </Field>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeMedicine}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy || familyMembers.length === 0}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy
                      ? "Saving..."
                      : editingMedicine
                        ? "Update Medicine"
                        : "Save Medicine"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {scheduleModal !== null && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeSchedule();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-title"
              className="my-6 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs font-bold uppercase text-blue-600">
                    Daily dose
                  </p>
                  <h2
                    id="schedule-title"
                    className="mt-1 text-2xl font-bold text-slate-900"
                  >
                    {editingSchedule ? "Edit Schedule" : "Add Schedule"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeSchedule}
                  aria-label="Close"
                  className="rounded-lg p-2 text-xl text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={submitSchedule} className="space-y-5 p-6">
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Time *">
                    <input
                      type="time"
                      required
                      value={scheduleForm.time}
                      onChange={(e) =>
                        setScheduleForm((f) => ({ ...f, time: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Dosage *">
                    <input
                      required
                      value={scheduleForm.dosage}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          dosage: e.target.value,
                        }))
                      }
                      placeholder="Example: 1 tablet"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Meal relation">
                    <select
                      value={scheduleForm.meal_relation}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          meal_relation: e.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="anytime">Anytime</option>
                      <option value="before_food">Before food</option>
                      <option value="after_food">After food</option>
                      <option value="with_food">With food</option>
                    </select>
                  </Field>
                  <Field label="Start date *">
                    <input
                      type="date"
                      required
                      value={scheduleForm.start_date}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          start_date: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </Field>
                  <Field label="End date">
                    <input
                      type="date"
                      min={scheduleForm.start_date || undefined}
                      value={scheduleForm.end_date}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          end_date: e.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeSchedule}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-slate-100 px-4 py-3 font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busy
                      ? "Saving..."
                      : editingSchedule
                        ? "Update Schedule"
                        : "Save Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
