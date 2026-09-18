import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminAppointments,
  updateAdminAppointmentStatus,
  type AdminAppointment,
} from "../../services/adminApi";

const APPOINTMENT_STATUSES = [
  "pending",
  "scheduled",
  "completed",
  "cancelled",
];

export default function Appointments() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Status modal
  const [activeAppt, setActiveAppt] = useState<AdminAppointment | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminAppointments({
        skip: (page - 1) * limit,
        limit,
        status: statusFilter || undefined,
      });
      setAppointments(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load appointments:", err);
      setError(err?.message || "Failed to load consultations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [page, statusFilter]);

  const handleUpdateStatus = async () => {
    if (!activeAppt || !newStatus) return;
    setUpdating(true);
    try {
      await updateAdminAppointmentStatus(activeAppt.id, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a.id === activeAppt.id ? { ...a, status: newStatus } : a))
      );
      setActiveAppt(null);
    } catch (err: any) {
      alert("Failed to update status: " + (err?.message || "Error"));
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle size={12} /> Completed
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
          <XCircle size={12} /> Cancelled
        </span>
      );
    }
    if (s === "scheduled") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
          <Clock size={12} /> Scheduled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        <Clock size={12} /> Pending
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
            Consultation Appointments
          </h2>
          <p className="text-sm text-[#66615A]">
            Overview of client consultations and advocate schedules ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadAppointments()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D7CFBF] pb-2 text-xs font-semibold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("");
            setPage(1);
          }}
          className={`rounded-t px-3 py-2 transition ${
            statusFilter === ""
              ? "border-b-2 border-[#17352D] text-[#17352D]"
              : "text-[#66615A] hover:text-[#171717]"
          }`}
        >
          All Appointments
        </button>
        {APPOINTMENT_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              setStatusFilter(st);
              setPage(1);
            }}
            className={`rounded-t px-3 py-2 transition ${
              statusFilter === st
                ? "border-b-2 border-[#17352D] text-[#17352D]"
                : "text-[#66615A] hover:text-[#171717]"
            }`}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Appointments Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Matter Reference</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Advocate</th>
                <th className="px-4 py-3.5">Scheduled For</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading consultations...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    No appointments found matching this status.
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{appt.id}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-semibold text-[#171717]">
                        Case #{appt.case_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{appt.client_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#17352D] font-medium">
                      Lawyer #{appt.lawyer_id}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-[#171717]">
                      {new Date(appt.appointment_time).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(appt.status)}</td>
                    <td className="px-4 py-3 text-xs text-[#66615A] max-w-xs truncate">
                      {appt.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveAppt(appt);
                          setNewStatus(appt.status);
                        }}
                        className="rounded border border-[#D7CFBF] bg-white px-2.5 py-1 text-xs font-semibold text-[#171717] hover:bg-[#F0EBE1]"
                      >
                        Update
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
            Showing {appointments.length} of {total} appointments
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

      {/* Update Status Modal */}
      {activeAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-[#171717]">
              Update Consultation #{activeAppt.id}
            </h3>
            <p className="mt-1 text-xs text-[#66615A]">
              Scheduled for:{" "}
              {new Date(activeAppt.appointment_time).toLocaleString()}
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                Appointment Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
              >
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveAppt(null)}
                className="rounded border border-[#D7CFBF] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={handleUpdateStatus}
                className="rounded bg-[#17352D] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#F2C94C] hover:bg-[#244A40] disabled:opacity-50"
              >
                {updating ? "Updating..." : "Save Status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
