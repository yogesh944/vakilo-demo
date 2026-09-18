import {
  Download,
  Eye,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface CaseItem {
  id: number;
  title: string;
  case_type?: string;
  status?: string;
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

export default function LawyerDocuments() {
  const { token } = useAuth();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>(
    []
  );

  const [selectedCaseId, setSelectedCaseId] =
    useState<number | "">("");

  const [loadingCases, setLoadingCases] =
    useState(true);

  const [loadingDocuments, setLoadingDocuments] =
    useState(false);

  const [sharing, setSharing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareCategory, setShareCategory] = useState("legal_document");

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD LAWYER CASES
  // ==========================================================

  const loadCases = async () => {
    if (!token) {
      setLoadingCases(false);
      return;
    }

    try {
      setLoadingCases(true);
      setError("");

      /*
       * Use the same lawyer case endpoint already used
       * by the Lawyer Dashboard.
       */
      const data = await apiRequest<CaseItem[]>(
        "/lawyer/cases",
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
      setDocuments([]);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load documents."
      );
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
  // DOWNLOAD
  // ==========================================================

  const handleShareDocument = async () => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    if (selectedCaseId === "") {
      setError("Please select a case first.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a document to share.");
      return;
    }

    try {
      setSharing(true);
      setError("");

      const formData = new FormData();
      formData.append("case_id", String(selectedCaseId));
      formData.append("category", shareCategory);
      formData.append("file", selectedFile);

      await apiRequest("/documents/upload", {
        method: "POST",
        token,
        body: formData,
      });

      setSelectedFile(null);

      const fileInput = document.getElementById(
        "lawyer-document-file"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      await loadDocuments(selectedCaseId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to share document with the client."
      );
    } finally {
      setSharing(false);
    }
  };

  const handlePreview = async (documentId: number) => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setError("");

      const data = await apiRequest<{ download_url: string }>(
        `/documents/${documentId}/download`,
        { token }
      );

      if (!data.download_url) {
        throw new Error("Preview URL was not returned.");
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
          : "Unable to preview document."
      );
    }
  };

  const handleDownload = async (
    documentId: number
  ) => {
    if (!token) {
      setError("Please login again.");
      return;
    }

    try {
      setError("");

      const data = await apiRequest<{
        download_url: string;
      }>(
        `/documents/${documentId}/download`,
        { token }
      );

      if (!data.download_url) {
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

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-5 py-8 text-[#171717] md:px-8 lg:px-10">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
              Lawyer Portal
            </p>

            <h1 className="mt-2 font-serif text-3xl font-semibold">
              Documents
            </h1>

            <p className="mt-2 text-sm text-[#66615A]">
              Review documents shared by your clients.
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
            className="flex items-center justify-center gap-2 border border-[#D7CFBF] bg-[#FBF9F4] px-4 py-2 text-sm hover:border-[#C9A227]"
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

        {/* ERROR */}

        {error && (
          <div className="mb-5 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* CASE SELECTOR */}

        <section className="mb-6 border border-[#D7CFBF] bg-[#FBF9F4] p-6">

          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#77716A]">
            Select Case
          </label>

          {loadingCases ? (
            <p className="text-sm text-[#77716A]">
              Loading cases...
            </p>
          ) : cases.length === 0 ? (
            <p className="text-sm text-[#77716A]">
              No assigned cases found.
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
              className="w-full max-w-2xl border border-[#D7CFBF] bg-white px-4 py-3 text-sm outline-none focus:border-[#C9A227]"
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
          <section className="mb-6 border border-[#D7CFBF] bg-[#FBF9F4] p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8A6D1D]">
                Share With Client
              </p>
              <h2 className="mt-1 font-serif text-xl font-semibold">
                Upload Case Document
              </h2>
              <p className="mt-1 text-sm text-[#77716A]">
                Share a document with the client for Case #{selectedCaseId}.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
              <div>
                <label
                  htmlFor="lawyer-document-file"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#77716A]"
                >
                  Document
                </label>
                <input
                  id="lawyer-document-file"
                  type="file"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  className="w-full border border-[#D7CFBF] bg-white px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="lawyer-document-category"
                  className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#77716A]"
                >
                  Category
                </label>
                <select
                  id="lawyer-document-category"
                  value={shareCategory}
                  onChange={(event) => setShareCategory(event.target.value)}
                  className="w-full border border-[#D7CFBF] bg-white px-4 py-3 text-sm"
                >
                  <option value="legal_document">Legal Document</option>
                  <option value="case_evidence">Case Evidence</option>
                  <option value="court_document">Court Document</option>
                  <option value="notice">Notice</option>
                  <option value="agreement">Agreement</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => void handleShareDocument()}
                disabled={sharing || !selectedFile}
                className="border border-[#C9A227] bg-[#C9A227] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sharing ? "Sharing..." : "Share Document"}
              </button>
            </div>
          </section>
        )}

        {selectedCaseId !== "" && (
          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8A6D1D]">
                Case #{selectedCaseId}
              </p>

              <h2 className="mt-1 font-serif text-xl font-semibold">
                Shared Documents
              </h2>

              <p className="mt-1 text-sm text-[#77716A]">
                Documents uploaded by the client.
              </p>

            </div>

            {loadingDocuments ? (
              <div className="px-6 py-12 text-center text-sm text-[#77716A]">
                Loading documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="px-6 py-12 text-center">

                <FileText
                  size={36}
                  className="mx-auto mb-3 text-[#A39B8E]"
                />

                <p className="font-medium">
                  No documents yet
                </p>

                <p className="mt-1 text-sm text-[#77716A]">
                  Documents uploaded by the client will appear here.
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

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handlePreview(document.id)}
                        className="flex items-center justify-center gap-2 border border-[#D7CFBF] px-4 py-2 text-xs font-semibold hover:border-[#C9A227]"
                        title="Preview document"
                      >
                        <Eye size={15} />
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDownload(document.id)}
                        className="flex items-center justify-center gap-2 border border-[#D7CFBF] px-4 py-2 text-xs font-semibold hover:border-[#C9A227]"
                        title="Download document"
                      >
                        <Download size={15} />
                        Download
                      </button>
                    </div>

                  </div>
                ))}

              </div>
            )}

          </section>
        )}

      </div>
    </main>
  );
}