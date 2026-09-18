import {
  Activity as ActivityIcon,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminActivity,
  type AdminActivity,
} from "../../services/adminApi";

export default function Activity() {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminActivity({
        skip: (page - 1) * limit,
        limit,
        activity_type: typeFilter || undefined,
      });
      setActivities(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load activities:", err);
      setError(err?.message || "Failed to load activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [page, typeFilter]);

  const totalPages = Math.ceil(total / limit) || 1;

  const getActivityTypeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("user") || t.includes("login") || t.includes("register"))
      return "bg-blue-100 text-blue-800";
    if (t.includes("lawyer") || t.includes("verify"))
      return "bg-amber-100 text-amber-800";
    if (t.includes("case")) return "bg-emerald-100 text-emerald-800";
    if (t.includes("payment")) return "bg-purple-100 text-purple-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            Platform Audit Trail
          </h2>
          <p className="text-sm text-[#66615A]">
            Complete chronological record of all administrative and system events ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadActivities()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
            Event Type:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by activity event type"
            className="rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
          >
            <option value="">All Events</option>
            <option value="user_registered">User Registered</option>
            <option value="lawyer_verified">Lawyer Verified</option>
            <option value="case_created">Case Created</option>
            <option value="case_assigned">Case Assigned</option>
            <option value="payment_captured">Payment Captured</option>
            <option value="appointment_booked">Appointment Booked</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Activities Timeline / Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Event Type</th>
                <th className="px-4 py-3.5">Title</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Reference</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading activity trail...
                  </td>
                </tr>
              ) : activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    No activity records found.
                  </td>
                </tr>
              ) : (
                activities.map((act) => (
                  <tr key={act.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{act.id}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${getActivityTypeColor(
                          act.activity_type
                        )}`}
                      >
                        {act.activity_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#171717]">
                      {act.title}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A] max-w-md">
                      {act.description}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#17352D]">
                      #{act.reference_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {act.user_id ? `User #${act.user_id}` : "System"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(act.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
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
            Showing {activities.length} of {total} events
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
    </div>
  );
}
