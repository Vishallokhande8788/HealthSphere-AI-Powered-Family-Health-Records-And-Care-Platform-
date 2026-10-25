import { useEffect, useState } from "react";
import api from "../api";

const API_URL = "family/family-members/";

const EMPTY_FORM = {
  name: "",
  relation: "",
  date_of_birth: "",
  gender: "",
};

function FamilyMembers() {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState("");

  // Convert API response into an array.
  const getArray = (data) => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data?.results)) {
      return data.results;
    }

    return [];
  };

  // Display Django validation errors.
  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (err.response?.status === 401) {
      return "Your session has expired. Please log in again.";
    }

    if (err.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }

    if (err.response?.status === 404) {
      return "API endpoint not found. Check your Django URLs.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data && typeof data === "object") {
      return Object.entries(data)
        .map(([field, messages]) => {
          const text = Array.isArray(messages)
            ? messages.join(", ")
            : String(messages);

          return `${field}: ${text}`;
        })
        .join(" | ");
    }

    return "Something went wrong. Please try again.";
  };

  // Load family members.
  const loadFamilyMembers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(API_URL);

      setFamilyMembers(getArray(response.data));
    } catch (err) {
      console.error("Load Family Members Error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  // Open Add Member form.
  const openAddModal = () => {
    setEditingMember(null);
    setForm({ ...EMPTY_FORM });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // Open Edit Member form.
  const openEditModal = (member) => {
    setEditingMember(member);

    setForm({
      name: member.name || "",
      relation: member.relation || "",
      date_of_birth: member.date_of_birth || "",
      gender: member.gender || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  // Close form.
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingMember(null);
    setForm({ ...EMPTY_FORM });
    setError("");
  };

  // Handle input changes.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Add or update family member.
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter the family member's name.");
      return;
    }

    if (!form.relation.trim()) {
      setError("Please select a relationship.");
      return;
    }

    if (!form.gender) {
      setError("Please select gender.");
      return;
    }

    const today = new Date().toLocaleDateString("en-CA");

    if (form.date_of_birth && form.date_of_birth > today) {
      setError("Date of birth cannot be in the future.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      relation: form.relation,
      gender: form.gender,
      date_of_birth: form.date_of_birth || null,
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingMember) {
        // Update existing member.
        await api.patch(`${API_URL}${editingMember.id}/`, payload);

        setSuccess("Family member updated successfully.");
      } else {
        // Add new member.
        await api.post(API_URL, payload);

        setSuccess("Family member added successfully.");
      }

      setShowModal(false);
      setEditingMember(null);
      setForm({ ...EMPTY_FORM });

      await loadFamilyMembers();
    } catch (err) {
      console.error("Save Family Member Error:", err);

      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Delete family member.
  const handleDelete = async (member) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${member.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(`${API_URL}${member.id}/`);

      setFamilyMembers((previous) =>
        previous.filter((item) => item.id !== member.id),
      );

      setSuccess("Family member deleted successfully.");
    } catch (err) {
      console.error("Delete Family Member Error:", err);

      setError(getErrorMessage(err));
    }
  };

  // Search family members.
  const filteredMembers = familyMembers.filter((member) => {
    const searchText = `${member.name || ""} ${
      member.relation || ""
    }`.toLowerCase();

    return searchText.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              HealthSphere / Family
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Family Members
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage your family's health profiles in one place.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + Add New Member
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {success && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700"
          >
            ✓ {success}
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && !showModal && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}

            <button
              type="button"
              onClick={loadFamilyMembers}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* STATISTICS */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Total Family Members</p>

            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              {loading ? "..." : familyMembers.length}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Profiles Available</p>

            <h2 className="mt-3 text-3xl font-bold text-blue-600">
              {loading ? "..." : familyMembers.length}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-sm">
            <p className="text-sm text-blue-100">Family Health Management</p>

            <h2 className="mt-3 text-xl font-bold">HealthSphere</h2>

            <p className="mt-2 text-xs text-blue-100">
              Your family's health information, organized.
            </p>
          </div>
        </div>

        {/* SEARCH */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            type="search"
            placeholder="Search family members..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading family members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <div className="mb-4 text-5xl">👨‍👩‍👧</div>

            <h2 className="text-xl font-bold text-slate-900">
              {search ? "No matching family members" : "No family members yet"}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {search
                ? "Try another search."
                : "Add your first family member to get started."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add Family Member
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                    👤
                  </div>

                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-bold text-slate-900">
                      {member.name}
                    </h2>

                    <p className="text-sm font-medium text-blue-600">
                      {member.relation}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Date of Birth</span>

                    <span className="font-medium text-slate-800">
                      {member.date_of_birth || "Not added"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Gender</span>

                    <span className="font-medium capitalize text-slate-800">
                      {member.gender || "Not added"}
                    </span>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={() => openEditModal(member)}
                    className="flex-1 rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(member)}
                    className="flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ADD / EDIT MODAL */}
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                closeModal();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="member-modal-title"
              className="w-full max-w-lg rounded-3xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    HealthSphere
                  </p>

                  <h2
                    id="member-modal-title"
                    className="mt-2 text-2xl font-bold text-slate-900"
                  >
                    {editingMember ? "Edit Family Member" : "Add Family Member"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close"
                  className="rounded-lg px-3 py-1 text-2xl text-slate-400 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                {/* NAME */}
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Full Name *
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    maxLength={150}
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* RELATION */}
                <div>
                  <label
                    htmlFor="relation"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Relationship *
                  </label>

                  <select
                    id="relation"
                    name="relation"
                    required
                    value={form.relation}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select relationship</option>
                    <option value="self">Self</option>
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="brother">Brother</option>
                    <option value="sister">Sister</option>
                    <option value="spouse">Spouse</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* DATE OF BIRTH */}
                <div>
                  <label
                    htmlFor="date_of_birth"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Date of Birth
                  </label>

                  <input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    value={form.date_of_birth}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* GENDER */}
                <div>
                  <label
                    htmlFor="gender"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Gender *
                  </label>

                  <select
                    id="gender"
                    name="gender"
                    required
                    value={form.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* BUTTONS */}
                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingMember
                        ? "Update Member"
                        : "Add Member"}
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

export default FamilyMembers;
