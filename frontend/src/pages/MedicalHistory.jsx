import { useEffect, useState } from "react";
import api from "../api";

function MedicalHistory() {
  const [histories, setHistories] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingHistory, setEditingHistory] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const emptyForm = {
    family_member: "",
    chronic_conditions: "",
    allergies: "",
    past_surgeries: "",
    family_history: "",
    notes: "",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [historyResponse, familyResponse] = await Promise.all([
        api.get("family/medical-history/"),
        api.get("family/family-members/"),
      ]);

      setHistories(
        Array.isArray(historyResponse.data)
          ? historyResponse.data
          : historyResponse.data.results || []
      );

      setFamilyMembers(
        Array.isArray(familyResponse.data)
          ? familyResponse.data
          : familyResponse.data.results || []
      );
    } catch (err) {
      console.error("Medical history loading error:", err);
      setError(
        err.response?.status === 401
          ? "Your session may have expired. Please log in again."
          : "Unable to load medical history. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingHistory(null);
    setShowForm(false);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAdd = () => {
    setForm(emptyForm);
    setEditingHistory(null);
    setMessage("");
    setError("");
    setShowForm(true);
  };

  const handleEdit = (history) => {
    setEditingHistory(history);

    setForm({
      family_member: String(history.family_member ?? ""),
      chronic_conditions: history.chronic_conditions || "",
      allergies: history.allergies || "",
      past_surgeries: history.past_surgeries || "",
      family_history: history.family_history || "",
      notes: history.notes || "",
    });

    setMessage("");
    setError("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!form.family_member) {
      setError("Please select a family member.");
      return;
    }

    const data = {
      family_member: Number(form.family_member),
      chronic_conditions: form.chronic_conditions.trim(),
      allergies: form.allergies.trim(),
      past_surgeries: form.past_surgeries.trim(),
      family_history: form.family_history.trim(),
      notes: form.notes.trim(),
    };

    try {
      setSaving(true);

      if (editingHistory) {
        await api.put(
          `family/medical-history/${editingHistory.id}/`,
          data
        );

        setMessage("Medical history updated successfully.");
      } else {
        await api.post("family/medical-history/", data);

        setMessage("Medical history added successfully.");
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error("Medical history save error:", err);

      const responseData = err.response?.data;

      if (err.response?.status === 401) {
        setError("Your session may have expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("You cannot modify this family member's records.");
      } else if (err.response?.status === 400) {
        const detail =
          responseData?.family_member?.[0] ||
          responseData?.detail ||
          responseData?.non_field_errors?.[0];

        setError(
          detail ||
            "Unable to save. This family member may already have a medical history record."
        );
      } else {
        setError("Unable to save medical history. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (history) => {
    const member = getFamilyMemberName(history.family_member);

    const confirmed = window.confirm(
      `Delete the medical history for ${member}? This action cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      await api.delete(`family/medical-history/${history.id}/`);

      setHistories((previous) =>
        previous.filter((item) => item.id !== history.id)
      );

      setMessage("Medical history deleted successfully.");
    } catch (err) {
      console.error("Medical history delete error:", err);

      setError(
        err.response?.status === 401
          ? "Your session may have expired. Please log in again."
          : "Unable to delete medical history. Please try again."
      );
    }
  };

  function getFamilyMemberName(memberId) {
    const member = familyMembers.find(
      (item) => item.id === Number(memberId)
    );

    return member
      ? `${member.name} (${member.relation})`
      : "Family member";
  }

  const historyFields = [
    {
      name: "chronic_conditions",
      label: "Chronic Conditions",
      placeholder: "e.g. Conditions recorded by the doctor",
      icon: "🩺",
      color: "orange",
    },
    {
      name: "allergies",
      label: "Allergies",
      placeholder: "e.g. Known medicine or food allergies",
      icon: "⚠️",
      color: "red",
    },
    {
      name: "past_surgeries",
      label: "Past Surgeries",
      placeholder: "Add surgery details and year, if known",
      icon: "🏥",
      color: "purple",
    },
    {
      name: "family_history",
      label: "Family Medical History",
      placeholder: "Add relevant family medical history",
      icon: "👨‍👩‍👧",
      color: "blue",
    },
    {
      name: "notes",
      label: "Additional Notes",
      placeholder: "Other important information",
      icon: "📝",
      color: "gray",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
              FAMILY MEDICINE TRACKER
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Medical History
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Keep important medical background information organized
              for your family.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={familyMembers.length === 0}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Medical History
          </button>
        </header>

        {/* Messages */}
        {message && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <span>✓</span>
            <p>{message}</p>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="ml-auto font-bold"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>⚠️</span>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="ml-auto font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* No family members */}
        {!loading && familyMembers.length === 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>No family members found.</strong> Add a family member
            before creating a medical history record.
          </div>
        )}

        {/* Add / Edit form */}
        {showForm && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-5 md:px-7">
              <h2 className="text-xl font-bold text-slate-900">
                {editingHistory
                  ? "Edit Medical History"
                  : "Add Medical History"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the information you want to keep on record.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 md:p-7">
              <div className="mb-6">
                <label
                  htmlFor="family_member"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Family Member <span className="text-red-500">*</span>
                </label>

                <select
                  id="family_member"
                  name="family_member"
                  value={form.family_member}
                  onChange={handleChange}
                  required
                  disabled={Boolean(editingHistory)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">Select a family member</option>

                  {familyMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.relation})
                    </option>
                  ))}
                </select>

                {editingHistory && (
                  <p className="mt-2 text-xs text-slate-500">
                    The family member cannot be changed while editing.
                  </p>
                )}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {historyFields.map((field) => (
                  <div
                    key={field.name}
                    className={
                      field.name === "notes" ? "md:col-span-2" : ""
                    }
                  >
                    <label
                      htmlFor={field.name}
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {field.label}
                    </label>

                    <textarea
                      id={field.name}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      rows={field.name === "notes" ? 3 : 4}
                      placeholder={field.placeholder}
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || familyMembers.length === 0}
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingHistory
                      ? "Update Medical History"
                      : "Save Medical History"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 text-sm text-slate-500">
              Loading medical history...
            </p>
          </div>
        ) : histories.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
              🩺
            </div>

            <h2 className="mt-5 text-xl font-bold text-slate-900">
              No medical history yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Add a medical history record to keep important health
              information in one place.
            </p>

            {familyMembers.length > 0 && (
              <button
                type="button"
                onClick={handleAdd}
                className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                + Add First Record
              </button>
            )}
          </div>
        ) : (
          /* Medical history cards */
          <div className="grid gap-5 lg:grid-cols-2">
            {histories.map((history) => {
              const details = historyFields.filter(
                (field) =>
                  String(history[field.name] || "").trim().length > 0
              );

              return (
                <article
                  key={history.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start gap-4 border-b border-slate-100 p-5 md:p-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl">
                      🩺
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-lg font-bold text-slate-900">
                        {getFamilyMemberName(history.family_member)}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        Medical background record
                      </p>
                    </div>

                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Saved
                    </span>
                  </div>

                  <div className="space-y-4 p-5 md:p-6">
                    {details.length === 0 ? (
                      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                        No additional medical information has been added.
                      </p>
                    ) : (
                      details.map((field) => (
                        <div
                          key={field.name}
                          className="rounded-xl bg-slate-50 p-4"
                        >
                          <div className="flex items-center gap-2">
                            <span>{field.icon}</span>

                            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              {field.label}
                            </h3>
                          </div>

                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                            {history[field.name]}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-3 border-t border-slate-100 p-5 md:px-6">
                    <button
                      type="button"
                      onClick={() => handleEdit(history)}
                      className="flex-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(history)}
                      className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs leading-5 text-blue-800">
            <strong>Important:</strong> This page stores medical
            information for reference. It does not diagnose medical
            conditions or replace advice from a qualified healthcare
            professional.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MedicalHistory;