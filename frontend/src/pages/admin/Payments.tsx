import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  DollarSign,
  Eye,
  Percent,
  Receipt,
  RefreshCcw,
  RefreshCw,
  RotateCcw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAdminPaymentById,
  getAdminPayments,
  getAdminPaymentStats,
  refundAdminPayment,
  type AdminPayment,
  type PaymentStats,
} from "../../services/adminApi";

export default function Payments() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [viewingPayment, setViewingPayment] = useState<AdminPayment | null>(null);

  // Refund Modal
  const [refundingPayment, setRefundingPayment] = useState<AdminPayment | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [refundLoading, setRefundLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [paymentsData, statsData] = await Promise.all([
        getAdminPayments({
          skip: (page - 1) * limit,
          limit,
          status: statusFilter || undefined,
        }),
        getAdminPaymentStats().catch(() => null),
      ]);

      setPayments(paymentsData.items || []);
      setTotal(paymentsData.total || 0);
      if (statsData) setStats(statsData);
    } catch (err: any) {
      console.error("Failed to load payments:", err);
      setError(err?.message || "Failed to load payment transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundingPayment) return;
    setRefundLoading(true);
    try {
      await refundAdminPayment(refundingPayment.id, {
        amount: refundAmount ? parseFloat(refundAmount) : undefined,
        reason: refundReason.trim() || undefined,
      });
      alert("Refund processed successfully!");
      setRefundingPayment(null);
      loadData();
    } catch (err: any) {
      alert("Failed to process refund: " + (err?.message || "Error"));
    } finally {
      setRefundLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val || 0);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "captured" || s === "paid" || s === "successful") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          <CheckCircle size={12} /> Captured
        </span>
      );
    }
    if (s === "refunded") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-800">
          <RotateCcw size={12} /> Refunded
        </span>
      );
    }
    if (s === "failed") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
          <XCircle size={12} /> Failed
        </span>
      );
    }
    return (
      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
        {status.toUpperCase()}
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
            Payments & Razorpay Transactions
          </h2>
          <p className="text-sm text-[#66615A]">
            Financial audit trail, settlement statuses, and refund controls ({total} transactions).
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

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Total Volume
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-[#171717]">
            {formatCurrency(stats?.total_revenue || 0)}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Successful
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-emerald-800">
            {stats?.successful_payments || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Pending
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-amber-700">
            {stats?.pending_payments || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Failed
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-red-700">
            {stats?.failed_payments || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Refunded
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-purple-800">
            {stats?.refunded_payments || 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#66615A]">
            Avg Ticket
          </p>
          <p className="mt-1 font-serif text-lg font-bold text-[#171717]">
            {formatCurrency(stats?.average_successful_payment || 0)}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
            Transaction Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by transaction status"
            className="rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
          >
            <option value="">All Statuses</option>
            <option value="captured">Captured / Paid</option>
            <option value="authorized">Authorized</option>
            <option value="created">Created (Pending)</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Payments Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Razorpay Order / Payment ID</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading transaction ledger...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#66615A]">
                    No transactions found matching the filter.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{p.id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{p.client_id}
                      {p.appointment_id && ` • Appt #${p.appointment_id}`}
                    </td>
                    <td className="px-4 py-3 font-semibold text-[#171717]">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#66615A]">
                      <div>{p.razorpay_payment_id || "—"}</div>
                      <div className="text-[10px] text-[#8A847B]">
                        {p.razorpay_order_id || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(p.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingPayment(p)}
                          title="Inspect Transaction"
                          className="rounded border border-[#D7CFBF] bg-white p-1.5 text-[#171717] hover:bg-[#F0EBE1]"
                        >
                          <Eye size={14} />
                        </button>
                        {p.status.toLowerCase() === "captured" && (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundingPayment(p);
                              setRefundAmount(p.amount.toString());
                              setRefundReason("");
                            }}
                            title="Issue Refund"
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Refund
                          </button>
                        )}
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
            Showing {payments.length} of {total} transactions
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

      {/* View Details Modal */}
      {viewingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D7CFBF] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#171717]">
                Transaction #{viewingPayment.id}
              </h3>
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="text-[#66615A] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between rounded bg-white p-3 border border-[#D7CFBF]">
                <span className="font-semibold text-[#66615A]">Amount:</span>
                <span className="font-serif text-base font-bold text-[#171717]">
                  {formatCurrency(viewingPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#EAE3D5] py-2">
                <span className="text-[#66615A]">Status:</span>
                <div>{getStatusBadge(viewingPayment.status)}</div>
              </div>
              <div className="flex justify-between border-b border-[#EAE3D5] py-2">
                <span className="text-[#66615A]">Client ID:</span>
                <span className="font-mono">User #{viewingPayment.client_id}</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE3D5] py-2">
                <span className="text-[#66615A]">Appointment ID:</span>
                <span className="font-mono">
                  {viewingPayment.appointment_id
                    ? `#${viewingPayment.appointment_id}`
                    : "None"}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#EAE3D5] py-2">
                <span className="text-[#66615A]">Razorpay Payment ID:</span>
                <span className="font-mono">{viewingPayment.razorpay_payment_id || "None"}</span>
              </div>
              <div className="flex justify-between border-b border-[#EAE3D5] py-2">
                <span className="text-[#66615A]">Razorpay Order ID:</span>
                <span className="font-mono">{viewingPayment.razorpay_order_id || "None"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#66615A]">Timestamp:</span>
                <span>{new Date(viewingPayment.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPayment(null)}
                className="rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Refund Modal */}
      {refundingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-red-200 bg-[#FBF9F4] p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-red-900">
              Issue Payment Refund
            </h3>
            <p className="mt-1 text-xs text-[#66615A]">
              Transaction #{refundingPayment.id} • Original Amount:{" "}
              {formatCurrency(refundingPayment.amount)}
            </p>
            <form onSubmit={handleProcessRefund} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Refund Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={refundingPayment.amount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                  placeholder={`Default: ${refundingPayment.amount}`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Reason for Refund
                </label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                  placeholder="e.g. Appointment cancelled by lawyer..."
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-[#D7CFBF] pt-4">
                <button
                  type="button"
                  onClick={() => setRefundingPayment(null)}
                  className="rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={refundLoading}
                  className="rounded bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-800 disabled:opacity-50"
                >
                  {refundLoading ? "Refunding..." : "Confirm Refund"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
