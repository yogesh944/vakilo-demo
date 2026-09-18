import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ShieldAlert } from "lucide-react";

export default function AdminRoute() {
  const { user, token, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F0E8]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#C9A227] border-t-transparent" />
          <p className="font-serif text-lg font-semibold text-[#171717]">
            Loading Vakilo Admin Console...
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.15em] text-[#8A6D1D]">
            Verifying administrative privileges
          </p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not an admin
  if (user.role !== "admin") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4F0E8] px-6 text-[#171717]">
        <div className="w-full max-w-md border border-[#D7CFBF] bg-[#FBF9F4] p-8 text-center shadow-lg md:p-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
            <ShieldAlert size={28} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            Access Denied
          </p>
          <h1 className="mt-2 font-serif text-2xl font-bold">
            Administrator Privilege Required
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#66615A]">
            You are logged in as <strong>{user.full_name || user.email}</strong> ({user.role}), which does not have administrative access.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
              className="bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A227] transition hover:bg-[#292929]"
            >
              Sign In With Admin Account
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  user.role === "lawyer"
                    ? "/lawyer/dashboard"
                    : "/client/dashboard";
              }}
              className="border border-[#CEC6B8] bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#171717] transition hover:bg-[#F0EBE1]"
            >
              Back to My Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <Outlet />;
}
