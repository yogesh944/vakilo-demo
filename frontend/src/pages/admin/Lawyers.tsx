import {
  AlertCircle,
  Award,
  CheckCircle2,
  Edit2,
  Eye,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  deleteAdminLawyer,
  getAdminLawyerById,
  getAdminLawyers,
  updateAdminLawyer,
  verifyAdminLawyer,
  type AdminUser,
} from "../../services/adminApi";

export default function Lawyers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const verifiedParam = searchParams.get("verified");

  const [lawyers, setLawyers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState<string>(
    verifiedParam || ""
  );
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Detail / Edit modal
  const [selectedLawyer, setSelectedLawyer] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AdminUser>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete modal
  const [deletingLawyer, setDeletingLawyer] = useState<AdminUser | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const loadLawyers = async () => {
    setLoading(true);
    setError(null);
    try {
      const vParam =
        verifiedFilter === "true"
          ? true
          : verifiedFilter === "false"
          ? false
          : undefined;
      const aParam =
        activeFilter === "true"
          ? true
          : activeFilter === "false"
          ? false
          : undefined;

      const data = await getAdminLawyers({
        skip: (page - 1) * limit,
        limit,
        search: search.trim() || undefined,
        verified: vParam,
        active: aParam,
      });

      setLawyers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load lawyers:", err);
      setError(err?.message || "Failed to load lawyer directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLawyers();
  }, [page, verifiedFilter, activeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadLawyers();
  };

  const handleToggleVerification = async (lawyer: AdminUser) => {
    try {
      const newStatus = !lawyer.is_verified;
      await verifyAdminLawyer(lawyer.id, newStatus);
      setLawyers((prev) =>
        prev.map((l) => (l.id === lawyer.id ? { ...l, is_verified: newStatus } : l))
      );
      if (selectedLawyer && selectedLawyer.id === lawyer.id) {
        setSelectedLawyer({ ...selectedLawyer, is_verified: newStatus });
      }
    } catch (err: any) {
      alert("Failed to change verification: " + (err?.message || "Unknown error"));
    }
  };

  const openLawyerModal = async (lawyerId: number, editMode = false) => {
    setDetailLoading(true);
    setIsEditing(editMode);
    try {
      const details = await getAdminLawyerById(lawyerId);
      setSelectedLawyer(details);
      setEditForm({
        full_name: details.full_name,
        phone: details.phone || "",
        specialization: details.specialization || "",
        experience_years: details.experience_years || 0,
        consultation_fee: details.consultation_fee || 0,
        city: details.city || "",
        state: details.state || "",
        bio: details.bio || "",
      });
    } catch (err: any) {
      alert("Failed to load lawyer details: " + (err?.message || "Error"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveLawyerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLawyer) return;
    setSavingEdit(true);
    try {
      const updated = await updateAdminLawyer(selectedLawyer.id, editForm);
      setSelectedLawyer({ ...selectedLawyer, ...updated });
      setLawyers((prev) =>
        prev.map((l) => (l.id === selectedLawyer.id ? { ...l, ...updated } : l))
      );
      setIsEditing(false);
    } catch (err: any) {
      alert("Failed to save changes: " + (err?.message || "Error"));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingLawyer) return;
    setDeletingLoading(true);
    try {
      await deleteAdminLawyer(deletingLawyer.id);
      setLawyers((prev) => prev.filter((l) => l.id !== deletingLawyer.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeletingLawyer(null);
    } catch (err: any) {
      alert("Failed to delete lawyer: " + (err?.message || "Error"));
    } finally {
      setDeletingLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            Lawyer Verification & Directory
          </h2>
          <p className="text-sm text-[#66615A]">
            Review advocate credentials, practice profiles, and manage verification status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadLawyers()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#D7CFBF] pb-2 text-xs font-semibold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => {
            setVerifiedFilter("");
            setPage(1);
          }}
          className={`rounded-t px-4 py-2 transition ${
            verifiedFilter === ""
              ? "border-b-2 border-[#17352D] text-[#17352D]"
              : "text-[#66615A] hover:text-[#171717]"
          }`}
        >
          All Lawyers
        </button>
        <button
          type="button"
          onClick={() => {
            setVerifiedFilter("false");
            setPage(1);
          }}
          className={`rounded-t px-4 py-2 transition ${
            verifiedFilter === "false"
              ? "border-b-2 border-amber-600 text-amber-700"
              : "text-[#66615A] hover:text-[#171717]"
          }`}
        >
          Pending Verification
        </button>
        <button
          type="button"
          onClick={() => {
            setVerifiedFilter("true");
            setPage(1);
          }}
          className={`rounded-t px-4 py-2 transition ${
            verifiedFilter === "true"
              ? "border-b-2 border-emerald-600 text-emerald-700"
              : "text-[#66615A] hover:text-[#171717]"
          }`}
        >
          Verified Advocates
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A847B]"
            size={16}
          />
          <input
            type="text"
            placeholder="Search lawyer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-[#D7CFBF] bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C9A227]"
          />
        </form>

        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by account status"
          className="rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
        >
          <option value="">All Account Statuses</option>
          <option value="true">Active Accounts</option>
          <option value="false">Suspended Accounts</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Lawyers Grid / List */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">Advocate</th>
                <th className="px-4 py-3.5">Contact</th>
                <th className="px-4 py-3.5">Verification</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading lawyer profiles...
                  </td>
                </tr>
              ) : lawyers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#66615A]">
                    No lawyer profiles found for this selection.
                  </td>
                </tr>
              ) : (
                lawyers.map((lawyer) => (
                  <tr key={lawyer.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#171717]">
                        {lawyer.full_name}
                      </div>
                      <div className="text-xs text-[#66615A]">
                        ID: #{lawyer.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div>{lawyer.email}</div>
                      <div className="text-[#66615A]">
                        {lawyer.phone || "No phone registered"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleVerification(lawyer)}
                        title="Click to toggle verification status"
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                          lawyer.is_verified
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                      >
                        {lawyer.is_verified ? (
                          <>
                            <ShieldCheck size={14} />
                            Verified
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={14} />
                            Verify Now
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-medium ${
                          lawyer.is_active
                            ? "bg-[#17352D]/10 text-[#17352D]"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {lawyer.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(lawyer.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openLawyerModal(lawyer.id, false)}
                          title="View Profile Details"
                          className="rounded border border-[#D7CFBF] bg-white p-1.5 text-[#171717] hover:bg-[#F0EBE1]"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openLawyerModal(lawyer.id, true)}
                          title="Edit Lawyer Info"
                          className="rounded border border-[#D7CFBF] bg-white p-1.5 text-[#171717] hover:bg-[#F0EBE1]"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingLawyer(lawyer)}
                          title="Remove Lawyer"
                          className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-[#D7CFBF] bg-[#FBF9F4] px-4 py-3 text-xs text-[#66615A]">
          <div>
            Showing {lawyers.length} of {total} lawyers
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded border border-[#D7CFBF] bg-white px-3 py-1 font-medium text-[#171717] hover:bg-[#F0EBE1] disabled:opacity-40"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded border border-[#D7CFBF] bg-white px-3 py-1 font-medium text-[#171717] hover:bg-[#F0EBE1] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* View / Edit Modal */}
      {selectedLawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D7CFBF] pb-3">
              <div className="flex items-center gap-2">
                <Award className="text-[#C9A227]" size={20} />
                <h3 className="font-serif text-lg font-bold text-[#171717]">
                  {isEditing ? "Edit Lawyer Profile" : "Lawyer Profile Dossier"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLawyer(null)}
                className="text-[#66615A] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-[#66615A]">
                Loading profile details...
              </div>
            ) : isEditing ? (
              <form onSubmit={handleSaveLawyerEdit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, full_name: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={editForm.specialization || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          specialization: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      value={editForm.experience_years ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          experience_years: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                      Consultation Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.consultation_fee ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          consultation_fee: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                      City
                    </label>
                    <input
                      type="text"
                      value={editForm.city || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                      className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                    Bio / Summary
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.bio || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bio: e.target.value })
                    }
                    className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                  />
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-[#D7CFBF] pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="rounded bg-[#17352D] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#F2C94C] hover:bg-[#234F43]"
                  >
                    {savingEdit ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <div className="rounded bg-white p-4 border border-[#D7CFBF]">
                  <h4 className="font-serif text-base font-bold text-[#171717]">
                    {selectedLawyer.full_name}
                  </h4>
                  <p className="text-xs text-[#66615A]">{selectedLawyer.email}</p>
                  <p className="mt-2 text-xs">
                    <strong>Phone:</strong> {selectedLawyer.phone || "None registered"}
                  </p>
                  <p className="text-xs">
                    <strong>City:</strong> {selectedLawyer.city || "Not specified"},{" "}
                    {selectedLawyer.state || ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded border border-[#D7CFBF] bg-white p-3">
                    <span className="block text-[#66615A] font-semibold uppercase">
                      Specialization
                    </span>
                    <span className="font-serif text-sm font-medium">
                      {selectedLawyer.specialization || "General Practice"}
                    </span>
                  </div>
                  <div className="rounded border border-[#D7CFBF] bg-white p-3">
                    <span className="block text-[#66615A] font-semibold uppercase">
                      Experience
                    </span>
                    <span className="font-serif text-sm font-medium">
                      {selectedLawyer.experience_years || 0} Years
                    </span>
                  </div>
                  <div className="rounded border border-[#D7CFBF] bg-white p-3">
                    <span className="block text-[#66615A] font-semibold uppercase">
                      Bar Council No.
                    </span>
                    <span className="font-serif text-sm font-medium">
                      {selectedLawyer.bar_registration_number || "Not provided"}
                    </span>
                  </div>
                  <div className="rounded border border-[#D7CFBF] bg-white p-3">
                    <span className="block text-[#66615A] font-semibold uppercase">
                      Consultation Fee
                    </span>
                    <span className="font-serif text-sm font-medium text-emerald-800">
                      ₹{selectedLawyer.consultation_fee || 0}
                    </span>
                  </div>
                  <div className="rounded border border-[#D7CFBF] bg-white p-3">
                    <span className="block text-[#66615A] font-semibold uppercase">
                      Verification
                    </span>
                    <span
                      className={`font-semibold ${
                        selectedLawyer.is_verified
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {selectedLawyer.is_verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                </div>

                {selectedLawyer.bio && (
                  <div className="rounded border border-[#D7CFBF] bg-white p-3 text-xs">
                    <span className="block font-semibold uppercase text-[#66615A]">
                      Biography
                    </span>
                    <p className="mt-1 leading-relaxed text-[#171717]">
                      {selectedLawyer.bio}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-between border-t border-[#D7CFBF] pt-4">
                  <button
                    type="button"
                    onClick={() => handleToggleVerification(selectedLawyer)}
                    className={`rounded px-4 py-2 text-xs font-semibold uppercase tracking-wider ${
                      selectedLawyer.is_verified
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-emerald-800 text-white hover:bg-emerald-900"
                    }`}
                  >
                    {selectedLawyer.is_verified
                      ? "Revoke Verification"
                      : "Grant Verification"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#F0EBE1]"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingLawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-red-900">
              Remove Lawyer Profile?
            </h3>
            <p className="mt-2 text-sm text-[#66615A]">
              Are you sure you want to remove advocate{" "}
              <strong>{deletingLawyer.full_name}</strong>? All association records
              will be permanently unlinked.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLawyer(null)}
                className="rounded border border-[#D7CFBF] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={confirmDelete}
                className="rounded bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deletingLoading ? "Removing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
