import {
  Download,
  Eye,
  FileText,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface CaseItem {
  id: number;
  title: string;
  case_type: string;
  status: string;
}

interface DocumentItem {
  id: number;
  case_id: number;
  uploaded_by: number;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at?: string | null;
}

const categories = [
  { value: "id_proof", label: "ID Proof" },
  { value: "property", label: "Property" },
  { value: "evidence", label: "Evidence" },
  { value: "agreement", label: "Agreement" },
  { value: "fir", label: "FIR" },
  { value: "court_order", label: "Court Order" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCategory(category: string) {
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "Recently";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ClientDocuments() {
  const { token } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [selectedCaseId, setSelectedCaseId] =
    useState<number | "">("");

  const [category, setCategory] =
    useState("other");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loadingCases, setLoadingCases] =
    useState(true);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ==========================================================
  // LOAD CASES
  // ==========================================================

  const loadCases = async () => {
    if (!token) {
      setLoadingCases(false);
      return;
    }

    try {
      setLoadingCases(true);
      setError("");

      const data = await apiRequest<CaseItem[]>(
        "/cases",
        { token }
      );

      const caseList = Array.isArray(data) ? data : [];

      setCases(caseList);

      if (
        caseList.length > 0 &&
        selectedCaseId === ""
      ) {
        setSelectedCaseId(caseList[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your cases."
      );
    } finally {
      setLoadingCases(false);
    }
  };

  // ==========================================================
  // LOAD DOCUMENTS
  // ==========================================================

  const loadDocuments = async (caseId: number) => {
    if (!token) return;

    try {
      setLoadingDocuments(true);
      setError("");

      const data = await apiRequest<DocumentItem[]>(
        `/documents/${caseId}`,
        { token }
      );

      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load documents."
      );

      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [token]);

  useEffect(() => {
    if (selectedCaseId !== "") {
      void loadDocuments(selectedCaseId);
    }
  }, [selectedCaseId, token]);

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowed = [
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".doc",
      ".docx",
    ];

    const extension =
      "." +
      (file.name.split(".").pop() || "").toLowerCase();

    if (!allowed.includes(extension)) {
      setError(
        "Unsupported file type. Use PDF, PNG, JPG, JPEG, DOC or DOCX."
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

  // ==========================================================
  // UPLOAD
  // ==========================================================

  const handleUpload = async () => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    if (selectedCaseId === "") {
      setError("Please select a case.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a document.");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append(
        "case_id",
        String(selectedCaseId)
      );

      formData.append("category", category);

      formData.append("file", selectedFile);

      const data = await apiRequest<{
        message: string;
        document: DocumentItem;
      }>("/documents/upload", {
        method: "POST",
        token,
        body: formData,
      });

      setSuccess(
        data.message ||
          "Document uploaded successfully."
      );

      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await loadDocuments(selectedCaseId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload document."
      );
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // VIEW / PREVIEW DOCUMENT
  // ==========================================================

  const handlePreview = async (
    document: DocumentItem
  ) => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const data = await apiRequest<{
        file_name: string;
        file_type: string;
        file_size: number;
        download_url: string;
        expires_in: number;
      }>(
        `/documents/${document.id}/download`,
        { token }
      );

      if (!data.download_url) {
        throw new Error(
          "Preview URL was not returned."
        );
      }

      // PDFs and images will normally open in the browser.
      // DOC/DOCX behavior depends on the browser.
      window.open(
        data.download_url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to preview document."
      );
    }
  };

  // ==========================================================
  // DOWNLOAD DOCUMENT
  // ==========================================================

  const handleDownload = async (
    document: DocumentItem
  ) => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setError("");
      setSuccess("");

      const data = await apiRequest<{
        file_name: string;
        file_type: string;
        file_size: number;
        download_url: string;
        expires_in: number;
      }>(
        `/documents/${document.id}/download`,
        { token }
      );

      if (!data.download_url) {
        throw new Error(
          "Download URL was not returned."
        );
      }

      const link = window.document.createElement("a");
      link.href = data.download_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = document.file_name;

      window.document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to download document."
      );
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async (
    documentId: number
  ) => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this document?"
      )
    ) {
      return;
    }

    try {
      setDeletingId(documentId);
      setError("");
      setSuccess("");

      const data = await apiRequest<{
        message: string;
      }>(`/documents/${documentId}`, {
        method: "DELETE",
        token,
      });

      setSuccess(
        data.message ||
          "Document deleted successfully."
      );

      if (selectedCaseId !== "") {
        await loadDocuments(selectedCaseId);
      }
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

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-5 py-8 text-[#171717] md:px-8 lg:px-10">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex items-center justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
              Client Portal
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">
              Documents
            </h1>

            <p className="mt-2 text-sm text-[#66615A]">
              Manage documents shared within your legal cases.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadCases();

              if (selectedCaseId !== "") {
                void loadDocuments(selectedCaseId);
              }
            }}
            className="flex items-center gap-2 border border-[#D7CFBF] bg-[#FBF9F4] px-4 py-2 text-sm hover:border-[#C9A227]"
          >
            <RefreshCw
              size={16}
              className={
                loadingCases || loadingDocuments
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

        </div>

        {/* MESSAGES */}

        {error && (
          <div className="mb-5 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* CASE SELECTOR */}

        <section className="mb-6 border border-[#D7CFBF] bg-[#FBF9F4] p-6">

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#77716A]">
            Select Case
          </label>

          {loadingCases ? (
            <p className="text-sm text-[#77716A]">
              Loading your cases...
            </p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-[#77716A]">
              You don't have any cases yet.
            </p>
          ) : (
            <select
              value={selectedCaseId}
              onChange={(event) =>
                setSelectedCaseId(
                  event.target.value
                    ? Number(event.target.value)
                    : ""
                )
              }
              className="w-full max-w-xl border border-[#D7CFBF] bg-white px-4 py-3 text-sm outline-none focus:border-[#C9A227]"
            >
              {cases.map((caseItem) => (
                <option
                  key={caseItem.id}
                  value={caseItem.id}
                >
                  Case #{caseItem.id} — {caseItem.title}
                </option>
              ))}
            </select>
          )}

        </section>

        {selectedCaseId !== "" && (
          <>
            {/* UPLOAD */}

            <section className="mb-6 border border-[#D7CFBF] bg-[#FBF9F4] p-6">

              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8A6D1D]">
                  Share a document
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold">
                  Upload Document
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">

                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#77716A]">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(event.target.value)
                    }
                    className="w-full border border-[#D7CFBF] bg-white px-3 py-3 text-sm"
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

                <div>
                  <label className="mb-2 block text-xs font-semibold text-[#77716A]">
                    File
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={handleFileChange}
                    className="w-full border border-[#D7CFBF] bg-white p-2 text-sm"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={
                      uploading || !selectedFile
                    }
                    className="flex w-full items-center justify-center gap-2 bg-[#171717] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={17} />

                    {uploading
                      ? "Uploading..."
                      : "Upload Document"}
                  </button>
                </div>

              </div>

              {selectedFile && (
                <div className="mt-4 flex items-center justify-between border border-[#D7CFBF] bg-[#F4F0E8] px-4 py-3">

                  <div className="flex items-center gap-3">
                    <FileText size={20} />

                    <div>
                      <p className="text-sm font-medium">
                        {selectedFile.name}
                      </p>

                      <p className="text-xs text-[#77716A]">
                        {formatFileSize(
                          selectedFile.size
                        )}
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
                    className="p-2 hover:bg-[#E8E1D5]"
                  >
                    <X size={17} />
                  </button>

                </div>
              )}

            </section>

            {/* DOCUMENT LIST */}

            <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

              <div className="border-b border-[#D7CFBF] px-6 py-5">

                <p className="text-xs font-semibold uppercase tracking-wider text-[#8A6D1D]">
                  Case #{selectedCaseId}
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold">
                  Shared Documents
                </h2>

              </div>

              {loadingDocuments ? (
                <div className="px-6 py-10 text-center text-sm text-[#77716A]">
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="px-6 py-12 text-center">

                  <FileText
                    size={32}
                    className="mx-auto mb-3 text-[#A39B8E]"
                  />

                  <p className="font-medium">
                    No documents uploaded
                  </p>

                  <p className="mt-1 text-sm text-[#77716A]">
                    Upload the first document for this case.
                  </p>

                </div>
              ) : (
                <div className="divide-y divide-[#D7CFBF]">

                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                    >

                      <div className="flex min-w-0 items-center gap-4">

                        <div className="border border-[#D7CFBF] bg-[#F4F0E8] p-3">
                          <FileText size={22} />
                        </div>

                        <div className="min-w-0">

                          <p className="truncate font-medium">
                            {document.file_name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#77716A]">

                            <span>
                              {formatCategory(
                                document.category
                              )}
                            </span>

                            <span>
                              {formatFileSize(
                                document.file_size
                              )}
                            </span>

                            <span>
                              {formatDate(
                                document.created_at
                              )}
                            </span>

                          </div>

                        </div>

                      </div>

                      <div className="flex flex-wrap gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            void handlePreview(document)
                          }
                          className="flex items-center gap-2 border border-[#D7CFBF] px-3 py-2 text-xs font-semibold hover:border-[#C9A227]"
                          title="View document"
                        >
                          <Eye size={15} />
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDownload(document)
                          }
                          className="flex items-center gap-2 border border-[#D7CFBF] px-3 py-2 text-xs font-semibold hover:border-[#C9A227]"
                          title="Download document"
                        >
                          <Download size={15} />
                          Download
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDelete(
                              document.id
                            )
                          }
                          disabled={
                            deletingId === document.id
                          }
                          className="flex items-center gap-2 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={15} />

                          {deletingId === document.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>

                      </div>

                    </div>
                  ))}

                </div>
              )}

            </section>
          </>
        )}

      </div>
    </main>
  );
}