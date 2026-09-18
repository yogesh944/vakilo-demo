import {
  AlertCircle,
  Clock,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOff,
  RefreshCw,
  Video,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminVideoCalls,
  getAdminVideoCallStats,
  type AdminVideoCall,
  type VideoCallStats,
} from "../../services/adminApi";

export default function VideoCalls() {
  const [calls, setCalls] = useState<AdminVideoCall[]>([]);
  const [stats, setStats] = useState<VideoCallStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [callsData, statsData] = await Promise.all([
        getAdminVideoCalls({
          skip: (page - 1) * limit,
          limit,
          status: statusFilter || undefined,
        }),
        getAdminVideoCallStats().catch(() => null),
      ]);

      setCalls(callsData.items || []);
      setTotal(callsData.total || 0);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load video calls:", err);
      setError(err?.message || "Failed to load video call sessions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const calculateDuration = (
    started?: string | null,
    ended?: string | null
  ) => {
    if (!started) return "Not connected";
    const start = new Date(started).getTime();
    const end = ended ? new Date(ended).getTime() : Date.now();
    const diffSec = Math.floor((end - start) / 1000);
    if (diffSec < 0) return "0s";
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "ongoing") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 animate-pulse">
          <PhoneCall size={12} /> Ongoing
        </span>
      );
    }
    if (s === "ended") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
          <PhoneOff size={12} /> Ended
        </span>
      );
    }
    if (s === "missed") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
          <PhoneMissed size={12} /> Missed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
        <Clock size={12} /> Created
      </span>
    );
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            Video Consultation Sessions
          </h2>
          <p className="text-sm text-[#66615A]">
            Monitor active WebRTC video sessions, durations, and call records ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Total Video Sessions
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-[#171717]">
            {stats?.total_video_calls || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Ongoing Live
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-800">
            {stats?.ongoing_calls || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Successfully Ended
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-blue-800">
            {stats?.ended_calls || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Missed / Unanswered
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-red-700">
            {stats?.missed_calls || 0}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
            Session Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by session status"
            className="rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
          >
            <option value="">All Sessions</option>
            <option value="ongoing">Ongoing Live</option>
            <option value="created">Created (Waiting)</option>
            <option value="ended">Ended</option>
            <option value="missed">Missed</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Calls Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Room Key</th>
                <th className="px-4 py-3.5">Case Reference</th>
                <th className="px-4 py-3.5">Caller</th>
                <th className="px-4 py-3.5">Receiver</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Duration</th>
                <th className="px-4 py-3.5">Initiated At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading video consultation records...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    No video consultation sessions found.
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{call.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#17352D] font-medium">
                      {call.room_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      Case #{call.case_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{call.caller_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{call.receiver_id}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(call.status)}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#171717]">
                      {calculateDuration(call.started_at, call.ended_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(call.created_at).toLocaleString("en-IN", {
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
            Showing {calls.length} of {total} sessions
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
