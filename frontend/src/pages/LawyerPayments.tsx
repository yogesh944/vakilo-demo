import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type Payment = {
  id: number;
  case_id: number;
  appointment_id?: number | null;
  client_id: number;
  lawyer_id: number;
  amount: number | string;
  currency: string;
  description: string;
  due_date?: string | null;
  platform_fee_percent: number | string;
  platform_fee_amount: number | string;
  lawyer_amount: number | string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_transfer_id?: string | null;
  transfer_status: string;
  status: string;
  paid_at?: string | null;
  settled_at?: string | null;
  created_at: string;
  updated_at: string;
};

type PaymentResponse = {
  payments: Payment[];
  summary: {
    total_due: number | string;
    total_paid: number | string;
    total_platform_fee: number | string;
    total_lawyer_amount: number | string;
    transaction_count: number;
  };
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? { Authorization: `Bearer ${token}` }
        : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "Something went wrong. Please try again.",
    );
  }

  return data as T;
}

function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusClass(status: string) {
  switch (status) {
    case "success":
      return "bg-green-100 text-green-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "refunded":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function LawyerPayments() {
  const [data, setData] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [caseId, setCaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const loadPayments = async () => {
    try {
      setError("");
      const result = await apiRequest<PaymentResponse>("/payments/mine");
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load payments.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const pending = useMemo(
    () =>
      (data?.payments || []).filter(
        (payment) => payment.status === "pending",
      ),
    [data],
  );

  const successful = useMemo(
    () =>
      (data?.payments || []).filter(
        (payment) => payment.status === "success",
      ),
    [data],
  );

  const handleCreateDue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!caseId || !Number.isInteger(Number(caseId))) {
      setError("Please enter a valid case ID.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a payment description.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      await apiRequest("/payments/due", {
        method: "POST",
        body: JSON.stringify({
          case_id: Number(caseId),
          amount: numericAmount,
          description: description.trim(),
          due_date: dueDate
            ? new Date(dueDate).toISOString()
            : null,
        }),
      });

      setSuccess("Payment due created and the client has been notified.");
      setCaseId("");
      setAmount("");
      setDescription("");
      setDueDate("");

      await loadPayments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create payment due.",
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-6 h-8 w-48 rounded bg-gray-200" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-28 rounded-xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Payments
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create payment dues and track your earnings.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Pending Dues</p>
            <p className="mt-2 text-2xl font-bold text-amber-600">
              {money(data?.summary.total_due)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Client Payments</p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {money(data?.summary.total_paid)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Your 97% Share</p>
            <p className="mt-2 text-2xl font-bold text-blue-600">
              {money(data?.summary.total_lawyer_amount)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {data?.summary.transaction_count || 0}
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Create Payment Due
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Request payment from a client for legal services. Payment is
            separate from consultation scheduling.
          </p>

          <form
            onSubmit={handleCreateDue}
            className="mt-5 grid gap-4 md:grid-cols-2"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Case ID
              </label>
              <input
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                type="number"
                min="1"
                placeholder="e.g. 101"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Amount (₹)
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                type="text"
                placeholder="e.g. Consultation fee"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Due Date (optional)
              </label>
              <input
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                type="datetime-local"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-4 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="font-medium">
                    3% of payment
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span className="text-gray-600">Your share</span>
                  <span className="font-semibold text-green-600">
                    97% of payment
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating..." : "Create Payment Due"}
              </button>
            </div>
          </form>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Payments
            </h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {pending.length} pending
            </span>
          </div>

          {pending.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">
                No pending payment dues.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {payment.description}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Case #{payment.case_id} • Client #{payment.client_id}
                      </p>
                    </div>

                    <div className="text-left md:text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {money(payment.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due {formatDate(payment.due_date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Received Payments
          </h2>

          {successful.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">
                No successful payments yet.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3">Case</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Vakilo Fee</th>
                      <th className="px-5 py-3">Your Share</th>
                      <th className="px-5 py-3">Transfer</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {successful.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {payment.description}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          #{payment.case_id}
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {money(payment.amount)}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {money(payment.platform_fee_amount)}
                        </td>
                        <td className="px-5 py-4 font-semibold text-green-600">
                          {money(payment.lawyer_amount)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(
                            payment.transfer_status,
                          )}`}>
                            {statusLabel(payment.transfer_status)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(payment.paid_at || payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
