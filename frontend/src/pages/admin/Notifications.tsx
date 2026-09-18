import {
  AlertCircle,
  Bell,
  CheckCircle,
  MessageSquare,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteAdminNotification,
  getAdminNotifications,
  getAdminNotificationStats,
  type AdminNotification,
  type NotificationStats,
} from "../../services/adminApi";

export default function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifsData, statsData] = await Promise.all([
        getAdminNotifications({
          skip: (page - 1) * limit,
          limit,
          notification_type: typeFilter || undefined,
        }),
        getAdminNotificationStats().catch(() => null),
      ]);

      setNotifications(notifsData.items || []);
      setTotal(notifsData.total || 0);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, typeFilter]);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      alert("Failed to delete notification: " + (err?.message || "Error"));
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            System Notifications & Alerts
          </h2>
          <p className="text-sm text-[#66615A]">
            Review all in-app notifications generated for clients and advocates ({total} total).
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
            Total Broadcasts
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-[#171717]">
            {stats?.total_notifications || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Unread Notifications
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-amber-700">
            {stats?.unread_notifications || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Appointment Alerts
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-blue-800">
            {stats?.appointment_notifications || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Payment Alerts
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-800">
            {stats?.payment_notifications || 0}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
            Notification Type:
          </span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by notification type"
            className="rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
          >
            <option value="">All Notification Types</option>
            <option value="chat">Chat Messages</option>
            <option value="appointment">Appointments</option>
            <option value="payment">Payments</option>
            <option value="document">Documents</option>
            <option value="video_call">Video Calls</option>
            <option value="system">System Announcements</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Recipient</th>
                <th className="px-4 py-3.5">Title & Message</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Delivered</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading notifications...
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    No notifications found.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{n.id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{n.user_id}
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <div className="font-semibold text-[#171717]">{n.title}</div>
                      <div className="truncate text-xs text-[#66615A]">
                        {n.message}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#F4F0E8] px-2 py-0.5 text-xs font-medium text-[#55504A]">
                        {n.notification_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {n.is_read ? (
                        <span className="text-emerald-700 font-medium">Read</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">Unread</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(n.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(n.id)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
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
            Showing {notifications.length} of {total} notifications
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
