import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Gavel,
  RefreshCw,
  TrendingUp,
  Users as UsersIcon,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getAdminActivity,
  getAdminDashboard,
  getAdminLawyers,
  verifyAdminLawyer,
  type AdminActivity,
  type AdminUser,
  type DashboardStats,
} from "../../services/adminApi";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [pendingLawyers, setPendingLawyers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [dashData, actData, lawyersData] = await Promise.all([
        getAdminDashboard(),
        getAdminActivity({ limit: 6 }).catch(() => ({ items: [] })),
        getAdminLawyers({ verified: false, limit: 5 }).catch(() => ({ items: [] })),
      ]);

      setStats(dashData);
      setActivities(actData.items || []);
      setPendingLawyers(lawyersData.items || []);
    } catch (err: any) {
      console.error("Failed to load admin dashboard:", err);
      setError(err?.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickVerify = async (lawyerId: number) => {
    try {
      await verifyAdminLawyer(lawyerId, true);
      // Remove from pending list
      setPendingLawyers((prev) => prev.filter((l) => l.id !== lawyerId));
      // Refresh dashboard
      loadData(true);
    } catch (err: any) {
      alert("Verification failed: " + (err?.message || "Unknown error"));
    }
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded bg-[#E4DCCE]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-600" size={32} />
        <h3 className="font-serif text-lg font-semibold text-red-900">
          Unable to Load Admin Data
        </h3>
        <p className="mt-1 text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => loadData()}
          className="mt-4 inline-flex items-center gap-2 rounded bg-red-800 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-900"
        >
          <RefreshCw size={14} /> Retry Connection
        </button>
      </div>
    );
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            {today}
          </p>
          <h2 className="mt-1 font-serif text-3xl font-bold text-[#171717]">
            Platform Overview
          </h2>
          <p className="text-sm text-[#66615A]">
            Real-time telemetry and management metrics across Vakilo services.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 self-start rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717] shadow-sm transition hover:border-[#C9A227] hover:bg-[#FBF9F4] disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Syncing..." : "Sync Live Data"}
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              Platform Users
            </span>
            <div className="rounded-full bg-[#17352D]/10 p-2 text-[#17352D]">
              <UsersIcon size={18} />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-bold text-[#171717]">
            {stats?.total_users || 0}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[#EAE3D5] pt-3 text-xs text-[#66615A]">
            <span>{stats?.total_clients || 0} Clients</span>
            <span>•</span>
            <span>{stats?.total_lawyers || 0} Lawyers</span>
          </div>
        </div>

        {/* Total Cases */}
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              Active Matters
            </span>
            <div className="rounded-full bg-[#8A6D1D]/15 p-2 text-[#8A6D1D]">
              <Gavel size={18} />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-bold text-[#171717]">
            {stats?.active_cases || 0}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[#EAE3D5] pt-3 text-xs text-[#66615A]">
            <span>{stats?.total_cases || 0} Total</span>
            <span>•</span>
            <span className="font-semibold text-amber-700">
              {stats?.pending_cases || 0} Pending
            </span>
          </div>
        </div>

        {/* Revenue */}
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              Total Volume
            </span>
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-800">
              <CreditCard size={18} />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-bold text-[#171717]">
            {formatCurrency(stats?.total_revenue || 0)}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[#EAE3D5] pt-3 text-xs text-[#66615A]">
            <span className="font-medium text-emerald-700">
              {stats?.successful_payments || 0} Paid
            </span>
            <span>•</span>
            <span className="text-red-600">
              {stats?.failed_payments || 0} Failed
            </span>
          </div>
        </div>

        {/* Appointments */}
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              Consultations
            </span>
            <div className="rounded-full bg-blue-100 p-2 text-blue-800">
              <CalendarDays size={18} />
            </div>
          </div>
          <p className="mt-4 font-serif text-3xl font-bold text-[#171717]">
            {stats?.total_appointments || 0}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-[#EAE3D5] pt-3 text-xs text-[#66615A]">
            <span className="text-blue-700">
              {stats?.pending_appointments || 0} Pending
            </span>
            <span>•</span>
            <span className="text-emerald-700">
              {stats?.completed_appointments || 0} Done
            </span>
          </div>
        </div>
      </div>

      {/* Action shortcuts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            title: "Users Management",
            desc: "View, filter & toggle active status",
            path: "/admin/users",
            color: "border-l-blue-600",
          },
          {
            title: "Lawyer Verifications",
            desc: "Review credentials & approve profiles",
            path: "/admin/lawyers",
            color: "border-l-amber-600",
          },
          {
            title: "Cases Oversight",
            desc: "Assign lawyers & track status",
            path: "/admin/cases",
            color: "border-l-emerald-600",
          },
          {
            title: "Transactions Ledger",
            desc: "Razorpay logs & refund operations",
            path: "/admin/payments",
            color: "border-l-purple-600",
          },
        ].map((item) => (
          <Link
            key={item.title}
            to={item.path}
            className={`group rounded-lg border border-[#D7CFBF] border-l-4 ${item.color} bg-white p-4 shadow-sm transition hover:shadow-md hover:bg-[#FBF9F4]`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-serif text-sm font-bold text-[#171717] group-hover:text-[#8A6D1D]">
                {item.title}
              </h4>
              <ArrowUpRight
                size={14}
                className="text-[#66615A] transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </div>
            <p className="mt-1 text-xs text-[#66615A]">{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Main Grid: Pending Approvals & Live Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Lawyers Awaiting Verification */}
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="text-[#C9A227]" size={20} />
              <h3 className="font-serif text-lg font-bold text-[#171717]">
                Pending Lawyer Verifications
              </h3>
            </div>
            <Link
              to="/admin/lawyers?verified=false"
              className="text-xs font-semibold uppercase tracking-wider text-[#8A6D1D] hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="mt-4 divide-y divide-[#EAE3D5]">
            {pendingLawyers.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#66615A]">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={24} />
                All lawyers are verified and up to date.
              </div>
            ) : (
              pendingLawyers.map((lawyer) => (
                <div
                  key={lawyer.id}
                  className="flex items-center justify-between py-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-[#171717]">
                      {lawyer.full_name}
                    </p>
                    <p className="text-xs text-[#66615A]">
                      {lawyer.email} • {lawyer.phone || "No phone"}
                    </p>
                    <span className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      Unverified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickVerify(lawyer.id)}
                      className="rounded bg-[#17352D] px-3 py-1.5 text-xs font-semibold text-[#F2C94C] transition hover:bg-[#234F43]"
                    >
                      Verify
                    </button>
                    <Link
                      to={`/admin/lawyers`}
                      className="rounded border border-[#D7CFBF] bg-white px-2.5 py-1.5 text-xs text-[#171717] hover:bg-[#F0EBE1]"
                    >
                      Inspect
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform Activity Feed */}
        <div className="rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-[#17352D]" size={20} />
              <h3 className="font-serif text-lg font-bold text-[#171717]">
                Recent Platform Activities
              </h3>
            </div>
            <Link
              to="/admin/activity"
              className="text-xs font-semibold uppercase tracking-wider text-[#8A6D1D] hover:underline"
            >
              Full Log
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#66615A]">
                No recent activity recorded yet.
              </div>
            ) : (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 rounded border border-[#EAE3D5] bg-white p-3 shadow-xs"
                >
                  <div className="mt-0.5 rounded bg-[#17352D]/10 p-1.5 text-[#17352D]">
                    <Clock size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-[#171717]">
                      {act.title}
                    </p>
                    <p className="line-clamp-2 text-xs text-[#66615A]">
                      {act.description}
                    </p>
                    <span className="text-[10px] text-[#8A847B]">
                      {new Date(act.created_at).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                  <span className="rounded bg-[#F4F0E8] px-2 py-0.5 text-[10px] font-medium text-[#55504A]">
                    {act.activity_type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
