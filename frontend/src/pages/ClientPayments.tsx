import { useEffect, useMemo, useState } from "react";

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
  razorpay_signature?: string | null;
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

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
  modal?: {
    ondismiss?: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

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
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
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

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function ClientPayments() {
  const [data, setData] = useState<PaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const duePayments = useMemo(
    () =>
      (data?.payments || []).filter(
        (payment) => payment.status === "pending",
      ),
    [data],
  );

  const history = useMemo(
    () =>
      (data?.payments || []).filter(
        (payment) => payment.status !== "pending",
      ),
    [data],
  );

  const handlePay = async (payment: Payment) => {
    try {
      setPayingId(payment.id);
      setError("");
      setSuccess("");

      const loaded = await loadRazorpayScript();

      if (!loaded || !window.Razorpay) {
        throw new Error(
          "Razorpay Checkout could not be loaded. Please check your internet connection.",
        );
      }

      const order = await apiRequest<{
        payment_id: number;
        razorpay_order_id: string;
        amount: number | string;
        currency: string;
        razorpay_key_id: string;
      }>(`/payments/${payment.id}/create-order`, {
        method: "POST",
      });

      const options: RazorpayOptions = {
        key: order.razorpay_key_id,
        amount: Number(order.amount) * 100,
        currency: order.currency,
        name: "Vakilo",
        description: payment.description,
        order_id: order.razorpay_order_id,
        handler: async (response) => {
          try {
            await apiRequest("/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            setSuccess("Payment completed successfully.");
            await loadPayments();
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : "Payment verification failed.",
            );
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: () => setPayingId(null),
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.open();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start payment.",
      );
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="mb-6 h-8 w-48 rounded bg-gray-200" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
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
            View your payment dues and transaction history.
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

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Amount Due</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {money(data?.summary.total_due)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Total Paid</p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {money(data?.summary.total_paid)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm text-gray-500">Transactions</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {data?.summary.transaction_count || 0}
            </p>
          </div>
        </div>

        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Payments Due
            </h2>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              {duePayments.length} pending
            </span>
          </div>

          {duePayments.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="font-medium text-gray-700">
                No payments due
              </p>
              <p className="mt-1 text-sm text-gray-500">
                You are all caught up.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {duePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                          {payment.description}
                        </h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(payment.status)}`}>
                          {statusLabel(payment.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-gray-500">
                        Case #{payment.case_id}
                        {payment.due_date
                          ? ` • Due ${formatDate(payment.due_date)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-gray-900">
                        {money(payment.amount)}
                      </p>

                      <button
                        type="button"
                        onClick={() => handlePay(payment)}
                        disabled={payingId === payment.id}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {payingId === payment.id
                          ? "Opening..."
                          : "Pay Now"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Transaction History
          </h2>

          {history.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">
                No completed transactions yet.
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
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-5 py-4 font-medium text-gray-900">
                          {payment.description}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          #{payment.case_id}
                        </td>
                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {money(payment.amount)}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {formatDate(payment.paid_at || payment.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(payment.status)}`}>
                            {statusLabel(payment.status)}
                          </span>
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
