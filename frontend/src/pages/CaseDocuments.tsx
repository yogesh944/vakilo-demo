import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  X,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

type DocumentCategory =
  | "id_proof"
  | "property"
  | "evidence"
  | "agreement"
  | "fir"
  | "court_order"
  | "other";

interface CaseDocument {
  id: number;
  case_id: number;
  uploaded_by: number;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  category: DocumentCategory;
  created_at: string;
}

const categories: {
  value: DocumentCategory;
  label: string;
}[] = [
  { value: "id_proof", label: "ID Proof" },
  { value: "property", label: "Property" },
  { value: "evidence", label: "Evidence" },
  { value: "agreement", label: "Agreement" },
  { value: "fir", label: "FIR" },
  { value: "court_order", label: "Court Order" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getCategoryLabel(category: DocumentCategory) {
  return (
    categories.find((item) => item.value === category)?.label ||
    category
  );
}

function getToken() {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
}

export default function CaseDocuments() {
  const [searchParams] = useSearchParams();

  const caseId = searchParams.get("case_id");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [category, setCategory] =
    useState<DocumentCategory>("other");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // LOAD DOCUMENTS
  // ============================================================

  const loadDocuments = async () => {
    if (!caseId) {
      setError("Case ID is missing.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/documents/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.detail || "Unable to load documents."
        );
      }

      const data = await response.json();

      setDocuments(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  // ============================================================
  // FILE SELECTION
  // ============================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedExtensions = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".doc",
      ".docx",
    ];

    const extension =
      "." +
      file.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      setError(
        "Unsupported file type. Allowed: PDF, PNG, JPG, JPEG, DOC and DOCX."
      );

      setSelectedFile(null);

      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size cannot exceed 10 MB.");

      setSelectedFile(null);

      return;
    }

    setError("");
    setSuccess("");
    setSelectedFile(file);
  };

  // ============================================================
  // UPLOAD
  // ============================================================

  const handleUpload = async () => {
    if (!caseId) {
      setError("Case ID is missing.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a document first.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("case_id", caseId);
      formData.append("category", category);
      formData.append("file", selectedFile);

      const response = await fetch(
        `${API_URL}/documents/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || "Document upload failed."
        );
      }

      setSuccess("Document uploaded successfully.");

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Document upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // DOWNLOAD
  // ============================================================

  const handleDownload = async (
    documentId: number
  ) => {
    const token = getToken();

    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/documents/${documentId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to generate download link."
        );
      }

      if (!data?.download_url) {
        throw new Error(
          "Download URL was not returned."
        );
      }

      window.open(
        data.download_url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download document."
      );
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (
    documentId: number
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document?"
    );

    if (!confirmed) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setDeletingId(documentId);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/documents/${documentId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to delete document."
        );
      }

      setSuccess("Document deleted successfully.");

      await loadDocuments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete document."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ============================================================
  // NO CASE ID
  // ============================================================

  if (!caseId) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Case ID is missing.
        </div>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="space-y-6 p-6">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold">
            Case Documents
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Upload and securely share documents for
            Case #{caseId}
          </p>
        </div>

        <button
          type="button"
          onClick={loadDocuments}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Refresh
        </button>

      </div>

      {/* Messages */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Upload section */}

      <div className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center gap-2">
          <Upload size={20} />

          <h2 className="font-semibold">
            Upload Document
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">

          {/* Category */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              Document Category
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value as DocumentCategory
                )
              }
              className="w-full rounded-lg border px-3 py-2"
            >
              {categories.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {/* File */}

          <div>
            <label className="mb-1 block text-sm font-medium">
              File
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileChange}
              className="w-full rounded-lg border p-2 text-sm"
            />
          </div>

          {/* Upload button */}

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={17} />

              {uploading
                ? "Uploading..."
                : "Upload Document"}
            </button>
          </div>

        </div>

        {selectedFile && (
          <div className="mt-4 flex items-center justify-between rounded-lg border bg-gray-50 p-3">

            <div className="flex items-center gap-3">

              <FileText size={20} />

              <div>
                <p className="text-sm font-medium">
                  {selectedFile.name}
                </p>

                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="rounded p-1 hover:bg-gray-200"
            >
              <X size={17} />
            </button>

          </div>
        )}

        <p className="mt-3 text-xs text-gray-500">
          Maximum file size: 10 MB. Supported formats:
          PDF, PNG, JPG, JPEG, DOC and DOCX.
        </p>

      </div>

      {/* Documents */}

      <div className="rounded-xl border bg-white shadow-sm">

        <div className="border-b p-5">

          <h2 className="font-semibold">
            Shared Documents
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Documents shared between the client and
            assigned lawyer.
          </p>

        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center">

            <FileText
              size={40}
              className="mx-auto mb-3 opacity-40"
            />

            <p className="font-medium">
              No documents yet
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Upload a document to share it with the
              other case participant.
            </p>

          </div>
        ) : (
          <div className="divide-y">

            {documents.map((document) => (
              <div
                key={document.id}
                className="flex items-center justify-between gap-4 p-5"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <div className="rounded-lg p-2">
                    <FileText size={22} />
                  </div>

                  <div className="min-w-0">

                    <p className="truncate font-medium">
                      {document.file_name}
                    </p>

                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">

                      <span>
                        {getCategoryLabel(
                          document.category
                        )}
                      </span>

                      <span>
                        {formatFileSize(
                          document.file_size
                        )}
                      </span>

                      <span>
                        {new Date(
                          document.created_at
                        ).toLocaleString()}
                      </span>

                    </div>

                  </div>

                </div>

                <div className="flex shrink-0 items-center gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(document.id)
                    }
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <Download size={16} />
                    Download
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(document.id)
                    }
                    disabled={
                      deletingId === document.id
                    }
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 size={16} />

                    {deletingId === document.id
                      ? "Deleting..."
                      : "Delete"}
                  </button>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
}