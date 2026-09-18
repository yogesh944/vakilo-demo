import {
  AlertCircle,
  CheckCircle,
  Edit2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
  type AdminUser,
} from "../../services/adminApi";

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Edit Modal
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    is_verified: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeParam =
        activeFilter === "true" ? true : activeFilter === "false" ? false : undefined;
      const data = await getAdminUsers({
        skip: (page - 1) * limit,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        active: activeParam,
      });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load users:", err);
      setError(err?.message || "Failed to load user accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, roleFilter, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers();
  };

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const newStatus = !user.is_active;
      await updateAdminUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
      );
    } catch (err: any) {
      alert("Failed to update user status: " + (err?.message || "Unknown error"));
    }
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone || "",
      is_verified: user.is_verified,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const updated = await updateAdminUser(editingUser.id, {
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || undefined,
        is_verified: editForm.is_verified,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, ...updated } : u))
      );
      setEditingUser(null);
    } catch (err: any) {
      alert("Failed to update user: " + (err?.message || "Unknown error"));
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    setActionLoading(true);
    try {
      await deleteAdminUser(deletingUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeletingUser(null);
    } catch (err: any) {
      alert("Failed to delete user: " + (err?.message || "Unknown error"));
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            User Accounts
          </h2>
          <p className="text-sm text-[#66615A]">
            Manage client, lawyer, and admin accounts across the platform ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadUsers()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A847B]"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-[#D7CFBF] bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#C9A227]"
          />
        </form>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
          className="rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
        >
          <option value="">All Roles</option>
          <option value="client">Clients</option>
          <option value="lawyer">Lawyers</option>
          <option value="admin">Admins</option>
        </select>

        {/* Status Filter */}
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">User</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Verified</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    No user accounts found matching the criteria.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{user.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#171717]">
                        {user.full_name}
                      </div>
                      <div className="text-xs text-[#66615A]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {user.phone || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "lawyer"
                            ? "bg-amber-100 text-amber-900"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        title={`Click to ${user.is_active ? "deactivate" : "activate"}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                          user.is_active
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-red-100 text-red-800 hover:bg-red-200"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            user.is_active ? "bg-emerald-600" : "bg-red-600"
                          }`}
                        />
                        {user.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <CheckCircle size={14} /> Yes
                        </span>
                      ) : (
                        <span className="text-[#8A847B]">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(user.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          title="Edit User"
                          className="rounded p-1.5 text-[#55504A] hover:bg-[#F0EBE1] hover:text-[#171717]"
                        >
                          <Edit2 size={15} />
                        </button>
                        {user.role !== "admin" && (
                          <button
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            title="Delete User"
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                          >
                            <Trash2 size={15} />
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
            Showing {users.length} of {total} accounts
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

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D7CFBF] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#171717]">
                Edit User Account
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-[#66615A] hover:text-[#171717]"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, full_name: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#55504A]">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  className="mt-1 w-full rounded border border-[#D7CFBF] bg-white px-3 py-2 text-sm outline-none focus:border-[#C9A227]"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="verified-checkbox"
                  checked={editForm.is_verified}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_verified: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#C9A227]"
                />
                <label
                  htmlFor="verified-checkbox"
                  className="text-sm font-medium text-[#171717]"
                >
                  Mark account as verified
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-[#D7CFBF] pt-4">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded border border-[#D7CFBF] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#F0EBE1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded bg-[#171717] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#F2C94C] hover:bg-[#2A2A2A] disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-red-900">
              Delete User Account?
            </h3>
            <p className="mt-2 text-sm text-[#66615A]">
              Are you sure you want to permanently delete{" "}
              <strong>{deletingUser.full_name}</strong> ({deletingUser.email})?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded border border-[#D7CFBF] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={confirmDelete}
                className="rounded bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-800 disabled:opacity-50"
              >
                {actionLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
