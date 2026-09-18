import {
  AlertCircle,
  Download,
  File,
  FileText,
  Filter,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  deleteAdminDocument,
  getAdminDocuments,
  type AdminDocument,
} from "../../services/adminApi";

const CATEGORIES = [
  "case_file",
  "identity_proof",
  "court_order",
  "evidence",
  "contract",
  "general",
];

export default function Documents() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Delete modal
  const [deletingDoc, setDeletingDoc] = useState<AdminDocument | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminDocuments({
        skip: (page - 1) * limit,
        limit,
        category: categoryFilter || undefined,
      });
      setDocuments(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load documents:", err);
      setError(err?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [page, categoryFilter]);

  const confirmDelete = async () => {
    if (!deletingDoc) return;
    setDeletingLoading(true);
    try {
      await deleteAdminDocument(deletingDoc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== deletingDoc.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setDeletingDoc(null);
    } catch (err: any) {
      alert("Failed to delete document: " + (err?.message || "Error"));
    } finally {
      setDeletingLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#171717]">
            Document Repository
          </h2>
          <p className="text-sm text-[#66615A]">
            Audit and manage files, evidence, and filings uploaded across all cases ({total} total).
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadDocuments()}
          className="inline-flex items-center gap-2 rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] hover:bg-[#FBF9F4]"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-lg border border-[#D7CFBF] bg-[#FBF9F4] p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#66615A]">
            Document Category:
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by document category"
            className="rounded border border-[#D7CFBF] bg-white px-3 py-1.5 text-sm text-[#171717] outline-none focus:border-[#C9A227]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace(/_/g, " ").toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Documents Table */}
      <div className="overflow-hidden rounded-lg border border-[#D7CFBF] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-[#171717]">
            <thead className="border-b border-[#D7CFBF] bg-[#FBF9F4] text-xs font-semibold uppercase tracking-wider text-[#66615A]">
              <tr>
                <th className="px-4 py-3.5">ID</th>
                <th className="px-4 py-3.5">File Name</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Size</th>
                <th className="px-4 py-3.5">Case Reference</th>
                <th className="px-4 py-3.5">Uploaded By</th>
                <th className="px-4 py-3.5">Uploaded Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE3D5]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[#C9A227] border-t-transparent" />
                    Loading documents...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#66615A]">
                    No files found for this category.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#FBF9F4]/70">
                    <td className="px-4 py-3 font-mono text-xs text-[#8A847B]">
                      #{doc.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#171717]">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[#8A6D1D] shrink-0" />
                        <span className="truncate max-w-xs">{doc.file_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-[#F4F0E8] px-2 py-0.5 text-xs font-medium text-[#55504A]">
                        {doc.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#66615A]">
                      {formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      Case #{doc.case_id}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      User #{doc.uploaded_by}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#66615A]">
                      {new Date(doc.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeletingDoc(doc)}
                        title="Delete Document"
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                      >
                        <Trash2 size={15} />
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
            Showing {documents.length} of {total} files
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

      {/* Delete Modal */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-6 shadow-xl">
            <h3 className="font-serif text-lg font-bold text-red-900">
              Delete Document?
            </h3>
            <p className="mt-2 text-sm text-[#66615A]">
              Are you sure you want to permanently delete{" "}
              <strong>{deletingDoc.file_name}</strong>? It will be removed from case #{deletingDoc.case_id}.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="rounded border border-[#D7CFBF] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#171717]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLoading}
                onClick={confirmDelete}
                className="rounded bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-red-800 disabled:opacity-50"
              >
                {deletingLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
