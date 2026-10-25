import { useEffect, useMemo, useState } from "react";
import api from "../api";

const EMPTY_FORM = {
  claim_name: "",
  renewal_date: "",
  notes: "",
};

function MedicalClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");

  const getArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const loadClaims = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("family/medical-claims/");

      setClaims(getArray(response.data));
    } catch (err) {
      console.error("Medical Claims Error:", err);

      setError(
        err.response?.status === 401
          ? "Your session has expired. Please log in again."
          : "Unable to load medical policies. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const getDaysRemaining = (renewalDate) => {
    if (!renewalDate) return null;

    const [year, month, day] = renewalDate.split("-").map(Number);

    if (!year || !month || !day) return null;

    const today = new Date();
    const renewal = new Date(year, month - 1, day);

    const todayUTC = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const renewalUTC = Date.UTC(
      renewal.getFullYear(),
      renewal.getMonth(),
      renewal.getDate(),
    );

    return Math.round((renewalUTC - todayUTC) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Not set";

    const [year, month, day] = dateString.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatus = (renewalDate) => {
    const days = getDaysRemaining(renewalDate);

    if (days === null) {
      return {
        label: "Date not set",
        color: "bg-slate-100 text-slate-600",
      };
    }

    if (days < 0) {
      return {
        label: `Expired ${Math.abs(days)} days ago`,
        color: "bg-red-50 text-red-700",
      };
    }

    if (days === 0) {
      return {
        label: "Renewal due today",
        color: "bg-orange-50 text-orange-700",
      };
    }

    if (days <= 30) {
      return {
        label: `Renewal in ${days} days`,
        color: "bg-amber-50 text-amber-700",
      };
    }

    return {
      label: `${days} days remaining`,
      color: "bg-emerald-50 text-emerald-700",
    };
  };

  const stats = useMemo(() => {
    let expired = 0;
    let upcoming = 0;
    let active = 0;

    claims.forEach((claim) => {
      const days = getDaysRemaining(claim.renewal_date);

      if (days === null) return;

      if (days < 0) {
        expired++;
      } else if (days <= 30) {
        upcoming++;
      } else {
        active++;
      }
    });

    return {
      total: claims.length,
      active,
      upcoming,
      expired,
    };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const text = `${claim.claim_name || ""} ${
        claim.notes || ""
      }`.toLowerCase();

      return text.includes(search.toLowerCase());
    });
  }, [claims, search]);

  const openAddModal = () => {
    setEditingClaim(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (claim) => {
    setEditingClaim(claim);

    setForm({
      claim_name: claim.claim_name || "",
      renewal_date: claim.renewal_date || "",
      notes: claim.notes || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingClaim(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.claim_name.trim()) {
      setError("Please enter a policy name.");
      return;
    }

    if (!form.renewal_date) {
      setError("Please select a renewal date.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        claim_name: form.claim_name.trim(),
        renewal_date: form.renewal_date,
        notes: form.notes.trim(),
      };

      if (editingClaim) {
        await api.patch(`family/medical-claims/${editingClaim.id}/`, payload);

        setSuccess("Medical policy updated successfully.");
      } else {
        await api.post("family/medical-claims/", payload);

        setSuccess("New medical policy added successfully.");
      }

      setShowModal(false);
      setEditingClaim(null);
      setForm({ ...EMPTY_FORM });

      await loadClaims();
    } catch (err) {
      console.error("Save Policy Error:", err.response?.data || err);

      const serverMessage = err.response?.data;

      if (serverMessage && typeof serverMessage === "object") {
        const details = Object.entries(serverMessage)
          .map(([key, value]) => {
            const message = Array.isArray(value)
              ? value.join(", ")
              : String(value);

            return `${key}: ${message}`;
          })
          .join(" | ");

        setError(details || "Unable to save policy.");
      } else {
        setError("Unable to save policy. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (claim) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${claim.claim_name}"?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(claim.id);
      setError("");
      setSuccess("");

      await api.delete(`family/medical-claims/${claim.id}/`);

      setClaims((previous) => previous.filter((item) => item.id !== claim.id));

      setSuccess("Medical policy deleted successfully.");
    } catch (err) {
      console.error("Delete Policy Error:", err);

      setError("Unable to delete policy. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleRenewal = (claim) => {
    openEditModal(claim);
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <h3 className="mt-3 text-3xl font-bold text-slate-900">{value}</h3>
        </div>

        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${color}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              HealthSphere / Insurance
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Medical Policies
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage health insurance policies, renewal dates, and important
              reminders.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <span className="text-xl">+</span>
            Add New Policy
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-700"
          >
            ✓ {success}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && !showModal && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Policies"
            value={stats.total}
            icon="🛡️"
            color="bg-blue-50"
          />

          <StatCard
            title="Renewal After 30 Days"
            value={stats.active}
            icon="✓"
            color="bg-emerald-50 text-emerald-600"
          />

          <StatCard
            title="Renewal Within 30 Days"
            value={stats.upcoming}
            icon="⏰"
            color="bg-amber-50"
          />

          <StatCard
            title="Past Renewal Date"
            value={stats.expired}
            icon="⚠️"
            color="bg-red-50"
          />
        </div>

        {/* SEARCH */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Your Medical Policies
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              View and manage your saved insurance policies.
            </p>
          </div>

          <input
            type="search"
            placeholder="Search policies..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
          />
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
            Loading medical policies...
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mb-4 text-5xl">🛡️</div>

            <h3 className="text-xl font-bold text-slate-900">
              {search
                ? "No matching policies found"
                : "No medical policies added yet"}
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try another search term."
                : "Add your first medical policy to track renewal dates."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add Your First Policy
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredClaims.map((claim) => {
              const status = getStatus(claim.renewal_date);

              return (
                <article
                  key={claim.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                        🛡️
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-bold text-slate-900">
                          {claim.claim_name}
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          Health Insurance Policy
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Next Renewal Date
                      </p>

                      <p className="mt-2 text-lg font-bold text-slate-900">
                        {formatDate(claim.renewal_date)}
                      </p>
                    </div>

                    <div
                      className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${status.color}`}
                    >
                      {status.label}
                    </div>

                    {claim.notes && (
                      <div className="mt-5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Notes
                        </p>

                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                          {claim.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-100 bg-slate-50 p-4">
                    <button
                      type="button"
                      onClick={() => openEditModal(claim)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRenewal(claim)}
                      className="rounded-lg bg-blue-600 px-2 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      🔄 Renew
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(claim)}
                      disabled={deletingId === claim.id}
                      className="rounded-lg border border-red-200 bg-white px-2 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === claim.id ? "Deleting..." : "🗑️ Delete"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ADD / EDIT POLICY MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="policy-dialog-title"
              className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    HealthSphere Insurance
                  </p>

                  <h2
                    id="policy-dialog-title"
                    className="mt-2 text-2xl font-bold text-slate-900"
                  >
                    {editingClaim
                      ? "Update Medical Policy"
                      : "Add New Medical Policy"}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {editingClaim
                      ? "Edit policy information or update its renewal date."
                      : "Enter the details of your medical insurance policy."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close dialog"
                  className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5 p-6">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="claim_name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Policy Name *
                  </label>

                  <input
                    id="claim_name"
                    name="claim_name"
                    type="text"
                    required
                    maxLength={200}
                    value={form.claim_name}
                    onChange={handleChange}
                    placeholder="Example: Family Health Insurance"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="renewal_date"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Renewal Date *
                  </label>

                  <input
                    id="renewal_date"
                    name="renewal_date"
                    type="date"
                    required
                    value={form.renewal_date}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="notes"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Notes
                  </label>

                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Add important policy information..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingClaim
                        ? "Save Changes"
                        : "Add Policy"}
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

export default MedicalClaims;
