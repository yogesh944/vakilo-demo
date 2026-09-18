import {
  Activity,
  Award,
  Bell,
  CalendarDays,
  CreditCard,
  ExternalLink,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  Users as UsersIcon,
  Video,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

const adminNavItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Users", path: "/admin/users", icon: UsersIcon },
  { label: "Lawyers", path: "/admin/lawyers", icon: Award },
  { label: "Cases", path: "/admin/cases", icon: Gavel },
  { label: "Appointments", path: "/admin/appointments", icon: CalendarDays },
  { label: "Payments", path: "/admin/payments", icon: CreditCard },
  { label: "Documents", path: "/admin/documents", icon: FileText },
  { label: "Video Calls", path: "/admin/video-calls", icon: Video },
  { label: "Messages", path: "/admin/messages", icon: MessageSquare },
  { label: "Notifications", path: "/admin/notifications", icon: Bell },
  { label: "Activity Log", path: "/admin/activity", icon: Activity },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const currentNav =
    adminNavItems.find((item) =>
      item.exact
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path)
    ) || adminNavItems[0];

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#171717]">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#D7CFBF] bg-[#17352D] text-[#DBE8DF] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-[#244A40] px-6 py-5">
          <div className="flex items-center gap-3">
            <Logo className="[&_*]:text-white" />
            <span className="rounded bg-[#2A5146] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F2C94C]">
              Admin
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded p-1.5 text-[#B4C9C0] hover:bg-[#244A40] lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Console info banner */}
        <div className="border-b border-[#244A40] bg-[#142E27] px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            <Shield size={14} />
            <span>Control Center</span>
          </div>
          <p className="mt-1 font-serif text-sm font-medium text-[#E5ECE8]">
            Platform Governance
          </p>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7E9C92]">
            Management Modules
          </p>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#2A5146] text-white shadow-sm font-semibold"
                    : "text-[#B4C9C0] hover:bg-[#1E4339] hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors ${
                    isActive
                      ? "text-[#F2C94C]"
                      : "text-[#7E9C92] group-hover:text-[#F2C94C]"
                  }`}
                />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Account / Footer */}
        <div className="border-t border-[#244A40] bg-[#142E27] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 truncate">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2A5146] font-serif text-sm font-bold text-[#F2C94C] ring-2 ring-[#C9A227]/30">
                {user?.full_name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-white">
                  {user?.full_name || "Admin"}
                </p>
                <p className="truncate text-[11px] text-[#8EAAA0]">
                  {user?.email || "admin@vakilo.com"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out of admin console"
              className="rounded p-2 text-[#B4C9C0] transition hover:bg-[#244A40] hover:text-red-300"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-72">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#D7CFBF] bg-[#FBF9F4]/95 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded border border-[#D7CFBF] p-2 text-[#55504A] hover:bg-[#F0EBE1] lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Vakilo Admin
              </p>
              <h1 className="font-serif text-lg font-bold leading-tight sm:text-xl">
                {currentNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Live Backend Connection Indicator */}
            <div className="hidden items-center gap-2 rounded-full border border-[#D7CFBF] bg-white px-3 py-1 text-xs text-[#26332E] sm:flex">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-medium">Backend Live</span>
            </div>

            {/* Link to public/client app */}
            <Link
              to="/client/dashboard"
              className="inline-flex items-center gap-1.5 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold text-[#171717] transition hover:border-[#C9A227] hover:text-[#8A6D1D]"
            >
              <span>User App</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        </header>

        {/* Page View */}
        <main className="flex-1 p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}