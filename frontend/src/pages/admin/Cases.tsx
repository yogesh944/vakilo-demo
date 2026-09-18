import {
  AlertCircle,
  Clock,
  Eye,
  Gavel,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  assignAdminCaseLawyer,
  getAdminCaseById,
  getAdminCases,
  getAdminLawyers,
  updateAdminCaseStatus,
  type AdminCase,
  type AdminUser,
} from "../../services/adminApi";

const CASE_STATUSES = [
  "draft",
  "intake",
  "lawyer_matching",
  "lawyer_assigned",
  "active",
  "closed",
];

export default function Cases() {
  const [cases, setCases] = useState<AdminCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [viewingCase, setViewingCase] = useState<AdminCase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status Change Modal
  const [statusCase, setStatusCase] = useState<AdminCase | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Assign Lawyer Modal
  const [assigningCase, setAssigningCase] = useState<AdminCase | null>(null);
  const [availableLawyers, setAvailableLawyers] = useState<AdminUser[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<number | "">("");
  const [lawyersLoading, setLawyersLoading] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);

  const loadCases = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminCases({
        skip: (page - 1) * limit,
        limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setCases(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load cases:", err);
      setError(err?.message || "Failed to load cases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadCases();
  };

  const openViewModal = async (caseId: number) => {
    setDetailLoading(true);
    try {
      const details = await getAdminCaseById(caseId);
      setViewingCase(details);
    } catch (err: any) {
      alert("Failed to load case details: " + (err?.message || "Error"));
    } finally {
      setDetailLoading(false);
    }
  };

  const openStatusModal = (item: AdminCase) => {
    setStatusCase(item);
    setNewStatus(item.status);
  };

  const handleSaveStatus = async () => {
    if (!statusCase || !newStatus) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateAdminCaseStatus(statusCase.id, newStatus);
      setCases((prev) =>
        prev.map((c) => (c.id === statusCase.id ? { ...c, status: newStatus } : c))
      );
      if (viewingCase && viewingCase.id === statusCase.id) {
        setViewingCase({ ...viewingCase, status: newStatus });
      }
      setStatusCase(null);
    } catch (err: any) {
      alert("Failed to update status: " + (err?.message || "Error"));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openAssignModal = async (item: AdminCase) => {
    setAssigningCase(item);
    setSelectedLawyerId(item.lawyer_id || "");
    setLawyersLoading(true);
    try {
      const data = await getAdminLawyers({ limit: 50 });
      setAvailableLawyers(data.items || []);
    } catch (err: any) {
      console.error("Failed to load lawyers:", err);
    } finally {
      setLawyersLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assigningCase || !selectedLawyerId) return;
    setAssigningLoading(true);
    try {
      await assignAdminCaseLawyer(assigningCase.id, Number(selectedLawyerId));
      setCases((prev) =>
        prev.map((c) =>
          c.id === assigningCase.id
            ? { ...c, lawyer_id: Number(selectedLawyerId), status: "lawyer_assigned" }
            : c
        )
      );
      setAssigningCase(null);
    } catch (err: any) {
      alert("Failed to assign lawyer: " + (err?.message || "Error"));
    } finally {
      setAssigningLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    let colorClass = "bg-gray-100 text-gray-800";
    if (s === "active") colorClass = "bg-emerald-100 text-emerald-800";
    else if (s === "closed") colorClass = "bg-slate-100 text-slate-800";
    else if (s === "lawyer_assigned") colorClass = "bg-blue-100 text-blue-800";
    else if (s === "lawyer_matching") colorClass = "bg-purple-100 text-purple-800";
    else if (s === "intake" || s === "draft") colorClass = "bg-amber-100 text-amber-800";

    return (
      <span
        className={`inline-block rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${colorClass}`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            Cases Oversight
          </h2>
          <p className="text-sm text-[#66615A]">
            Monitor active, assigned, and pending client matters ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadCases()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A847B]"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by case title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-[#D7CFBF] bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C9A227]"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by case status"
          className="rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
        >
          <option value="">All Statuses</option>
          {CASE_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st.replace(/_/g, " ").toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Cases Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Case Title</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Assigned Advocate</th>
                <th className="px-4 py-3.5">Urgency</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    No cases match the specified filters.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{c.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#171717]">{c.title}</div>
                      <div className="text-xs text-[#66615A]">{c.case_type}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{c.client_id}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {c.lawyer_id ? (
                        <span className="font-medium text-[#17352D]">
                          Advocate #{c.lawyer_id}
                        </span>
                      ) : (
                        <span className="text-[#8A847B] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
                          c.urgency?.toLowerCase() === "high" ||
                          c.urgency?.toLowerCase() === "critical"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {c.urgency || "Normal"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openViewModal(c.id)}
                          title="Inspect Case"
                          className="rounded border border-[#D7CFBF] bg-white p-1.5 text-[#171717] hover:bg-[#F0EBE1]"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(c)}
                          title="Update Status"
                          className="rounded border border-[#D7CFBF] bg-white px-2 py-1 text-xs font-semibold text-[#171717] hover:bg-[#F0EBE1]"
                        >
                          Status
                        </button>
                        <button
                          type="button"
                          onClick={() => openAssignModal(c)}
                          title="Assign Advocate"
                          className="rounded bg-[#17352D] px-2 py-1 text-xs font-semibold text-[#F2C94C] hover:bg-[#244A40]"
                        >
                          Assign
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
            Showing {cases.length} of {total} cases
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

      {/* Case Details Modal */}
      {viewingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D7CFBF] pb-3">
              <div className="flex items-center gap-2">
                <Gavel className="text-[#C9A227]" size={20} />
                <h3 className="font-serif text-lg font-bold text-[#171717]">
                  Case #{viewingCase.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingCase(null)}
                className="text-[#66615A] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="rounded border border-[#D7CFBF] bg-white p-4">
                <h4 className="font-serif text-base font-bold text-[#171717]">
                  {viewingCase.title}
                </h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded bg-[#F4F0E8] px-2 py-0.5 text-xs text-[#55504A]">
                    Type: {viewingCase.case_type}
                  </span>
                  {getStatusBadge(viewingCase.status)}
                </div>
              </div>

              <div className="rounded border border-[#D7CFBF] bg-white p-4 text-xs">
                <span className="font-semibold uppercase text-[#66615A]">
                  Matter Description
                </span>
                <p className="mt-1 leading-relaxed text-[#171717] whitespace-pre-wrap">
                  {viewingCase.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded border border-[#D7CFBF] bg-white p-3">
                  <span className="block font-semibold uppercase text-[#66615A]">
                    Client Reference
                  </span>
                  <span className="font-mono text-sm">
                    User #{viewingCase.client_id}
                  </span>
                </div>
                <div className="rounded border border-[#D7CFBF] bg-white p-3">
                  <span className="block font-semibold uppercase text-[#66615A]">
                    Assigned Advocate
                  </span>
                  <span className="font-mono text-sm">
                    {viewingCase.lawyer_id
                      ? `Lawyer #${viewingCase.lawyer_id}`
                      : "Unassigned"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#D7CFBF] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    openStatusModal(viewingCase);
                  }}
                  className="rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#F0EBE1]"
                >
                  Change Status
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openAssignModal(viewingCase);
                  }}
                  className="rounded bg-[#17352D] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#F2C94C] hover:bg-[#244A40]"
                >
                  Assign Advocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-[#171717]">
              Update Status for Case #{statusCase.id}
            </h3>
            <p className="mt-1 text-xs text-[#66615A]">{statusCase.title}</p>
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                Select Case Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
              >
                {CASE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStatusCase(null)}
                className="rounded border border-[#D7CFBF] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStatus}
                onClick={handleSaveStatus}
                className="rounded bg-[#17352D] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#F2C94C] hover:bg-[#244A40] disabled:opacity-50"
              >
                {updatingStatus ? "Saving..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Advocate Modal */}
      {assigningCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-[#171717]">
              Assign Advocate to Case #{assigningCase.id}
            </h3>
            <p className="mt-1 text-xs text-[#66615A]">{assigningCase.title}</p>
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                Select Verified Advocate
              </label>
              {lawyersLoading ? (
                <div className="py-4 text-center text-xs text-[#66615A]">
                  Loading advocates...
                </div>
              ) : (
                <select
                  value={selectedLawyerId}
                  onChange={(e) =>
                    setSelectedLawyerId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                  className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                >
                  <option value="">-- Choose an Advocate --</option>
                  {availableLawyers.map((lawyer) => (
                    <option key={lawyer.id} value={lawyer.id}>
                      {lawyer.full_name} ({lawyer.specialization || "General"}
                      {lawyer.city ? ` • ${lawyer.city}` : ""})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssigningCase(null)}
                className="rounded border border-[#D7CFBF] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigningLoading || !selectedLawyerId}
                onClick={handleSaveAssignment}
                className="rounded bg-[#17352D] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#F2C94C] hover:bg-[#244A40] disabled:opacity-50"
              >
                {assigningLoading ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
