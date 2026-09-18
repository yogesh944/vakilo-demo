import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Gavel,
  MapPin,
  MessageSquare,
  User,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface LawyerCase {
  id: number;
  client_id: number;
  lawyer_id: number | null;

  title: string;
  case_type: string;
  description: string;
  urgency: string;
  status: string;

  legal_category: string | null;
  recommended_specialization: string | null;

  ai_summary: string | null;
  missing_documents: string | null;
  next_steps: string | null;

  incident_date: string | null;
  incident_location: string | null;

  created_at: string;
  updated_at: string | null;
}

function formatText(value: string | null | undefined) {
  if (!value) {
    return "Not provided";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function LawyerCaseDetails() {
  const navigate = useNavigate();

  const { caseId } = useParams<{ caseId: string }>();

  const { token } = useAuth();

  const [caseData, setCaseData] = useState<LawyerCase | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /*
  ============================================================
  LOAD CASE
  ============================================================
  */

  useEffect(() => {
    let mounted = true;

    async function loadCase() {
      if (!caseId) {
        if (mounted) {
          setError("Invalid case ID.");
          setLoading(false);
        }

        return;
      }

      /*
       * Do not immediately treat a missing token as an error.
       * AuthContext may still be restoring the saved session.
       */
      if (!token) {
        return;
      }

      try {
        if (mounted) {
          setLoading(true);
          setError("");
        }

        console.log(
          "Loading lawyer case:",
          caseId
        );

        const response = await apiRequest<LawyerCase[]>(
          "/lawyer/cases",
          {
            token,
          }
        );

        if (!mounted) {
          return;
        }

        /*
         * Make sure the API response is actually an array.
         */
        if (!Array.isArray(response)) {
          console.error(
            "Unexpected lawyer cases response:",
            response
          );

          setError(
            "Invalid response received from server."
          );

          setCaseData(null);

          return;
        }

        const numericCaseId = Number(caseId);

        const foundCase = response.find(
          (item) => Number(item.id) === numericCaseId
        );

        console.log(
          "Requested case:",
          numericCaseId
        );

        console.log(
          "Found case:",
          foundCase
        );

        if (!foundCase) {
          setError(
            "Case not found or this case is not assigned to you."
          );

          setCaseData(null);

          return;
        }

        setCaseData(foundCase);
      } catch (err) {
        console.error(
          "Failed to load lawyer case:",
          err
        );

        if (!mounted) {
          return;
        }

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Unable to load case details."
          );
        }

        setCaseData(null);
      } finally {
        if (mounted && token) {
          setLoading(false);
        }
      }
    }

    void loadCase();

    return () => {
      mounted = false;
    };
  }, [token, caseId]);

  /*
  ============================================================
  BACK TO DASHBOARD
  ============================================================
  */

  const goBack = () => {
    navigate("/lawyer/dashboard");
  };

  /*
  ============================================================
  MESSAGE CLIENT
  ============================================================
  */

  const messageClient = () => {
    if (!caseData) {
      return;
    }

    navigate(
      `/lawyer/messages?case_id=${caseData.id}`
    );
  };

  /*
  ============================================================
  LOADING
  ============================================================
  */

  if (loading || !token) {
    return (
      <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

          <div className="px-5 py-5 md:px-8">
            <Logo />
          </div>

        </header>

        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#D7CFBF] border-t-[#8A6D1D]" />

            <p className="mt-4 text-sm text-[#77716A]">
              Loading case details...
            </p>

          </div>

        </div>

      </main>
    );
  }

  /*
  ============================================================
  ERROR
  ============================================================
  */

  if (error || !caseData) {
    return (
      <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

          <div className="px-5 py-5 md:px-8">

            <div className="flex items-center gap-4">

              <button
                type="button"
                onClick={goBack}
                className="rounded p-2 text-[#55504A] transition hover:bg-[#F0EBE1]"
              >
                <ArrowLeft size={20} />
              </button>

              <Logo />

            </div>

          </div>

        </header>

        <div className="mx-auto max-w-3xl px-5 py-20 text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

            <Gavel
              size={24}
              className="text-[#8A6D1D]"
            />

          </div>

          <h1 className="mt-6 font-serif text-2xl font-semibold">
            Unable to open case
          </h1>

          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#77716A]">
            {error ||
              "Case information is unavailable."}
          </p>

          <button
            type="button"
            onClick={goBack}
            className="mt-7 inline-flex items-center gap-2 bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#2A2A2A]"
          >
            <ArrowLeft size={16} />

            Back to Dashboard
          </button>

        </div>

      </main>
    );
  }

  /*
  ============================================================
  MAIN PAGE
  ============================================================
  */

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-[#D7CFBF] bg-[#FBF9F4]/95 backdrop-blur">

        <div className="flex h-20 items-center justify-between px-5 md:px-8">

          <div className="flex items-center gap-4">

            <button
              type="button"
              onClick={goBack}
              className="rounded p-2 text-[#55504A] transition hover:bg-[#F0EBE1]"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>

            <Logo />

          </div>

          <button
            type="button"
            onClick={messageClient}
            className="hidden items-center gap-2 bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#2A2A2A] sm:flex"
          >
            <MessageSquare size={16} />

            Message Client
          </button>

        </div>

      </header>

      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}

      <div className="px-5 py-8 md:px-8 lg:px-10">

        <div className="mx-auto max-w-7xl">

          {/* ==================================================
              CASE HEADER
          ================================================== */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] p-6 md:p-8">

              <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-start">

                <div className="min-w-0">

                  <div className="flex flex-wrap items-center gap-2">

                    <span className="border border-[#C9A227] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                      Case #{caseData.id}
                    </span>

                    <span className="border border-[#D7CFBF] bg-[#F8F5EF] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#66615A]">
                      {formatText(caseData.status)}
                    </span>

                  </div>

                  <h1 className="mt-4 font-serif text-3xl font-semibold md:text-4xl">
                    {caseData.title}
                  </h1>

                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[#66615A]">
                    {caseData.description}
                  </p>

                </div>

                <div className="shrink-0 lg:text-right">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Urgency
                  </p>

                  <p
                    className={`mt-2 font-serif text-xl font-semibold ${
                      caseData.urgency === "high" ||
                      caseData.urgency === "emergency"
                        ? "text-red-700"
                        : "text-[#171717]"
                    }`}
                  >
                    {formatText(caseData.urgency)}
                  </p>

                </div>

              </div>

            </div>

            {/* ==================================================
                CASE META
            ================================================== */}

            <div className="grid divide-y divide-[#D7CFBF] md:grid-cols-4 md:divide-x md:divide-y-0">

              {/* Case Type */}

              <div className="p-5">

                <div className="flex items-center gap-2 text-[#8A6D1D]">
                  <Gavel size={17} />

                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Case Type
                  </span>
                </div>

                <p className="mt-3 font-serif text-base font-semibold">
                  {formatText(caseData.case_type)}
                </p>

              </div>

              {/* Client */}

              <div className="p-5">

                <div className="flex items-center gap-2 text-[#8A6D1D]">
                  <User size={17} />

                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Client
                  </span>
                </div>

                <p className="mt-3 font-serif text-base font-semibold">
                  Client #{caseData.client_id}
                </p>

              </div>

              {/* Location */}

              <div className="p-5">

                <div className="flex items-center gap-2 text-[#8A6D1D]">
                  <MapPin size={17} />

                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Location
                  </span>
                </div>

                <p className="mt-3 font-serif text-base font-semibold">
                  {caseData.incident_location ||
                    "Not provided"}
                </p>

              </div>

              {/* Incident Date */}

              <div className="p-5">

                <div className="flex items-center gap-2 text-[#8A6D1D]">
                  <CalendarDays size={17} />

                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    Incident Date
                  </span>
                </div>

                <p className="mt-3 font-serif text-base font-semibold">
                  {formatDate(
                    caseData.incident_date
                  )}
                </p>

              </div>

            </div>

          </section>

          {/* ==================================================
              MAIN GRID
          ================================================== */}

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">

            {/* =================================================
                LEFT COLUMN
            ================================================= */}

            <div className="space-y-6">

              {/* AI SUMMARY */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4]">

                <div className="border-b border-[#D7CFBF] px-6 py-5">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    AI Analysis
                  </p>

                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Case Summary
                  </h2>

                </div>

                <div className="p-6">

                  {caseData.ai_summary ? (
                    <p className="whitespace-pre-line text-sm leading-7 text-[#55504A]">
                      {caseData.ai_summary}
                    </p>
                  ) : (
                    <p className="text-sm text-[#77716A]">
                      No AI summary is available
                      for this case.
                    </p>
                  )}

                </div>

              </div>

              {/* CLIENT DESCRIPTION */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4]">

                <div className="border-b border-[#D7CFBF] px-6 py-5">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Client Statement
                  </p>

                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Description
                  </h2>

                </div>

                <div className="p-6">

                  <p className="whitespace-pre-line text-sm leading-7 text-[#55504A]">
                    {caseData.description}
                  </p>

                </div>

              </div>

              {/* NEXT STEPS */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4]">

                <div className="border-b border-[#D7CFBF] px-6 py-5">

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Recommended
                  </p>

                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Next Steps
                  </h2>

                </div>

                <div className="p-6">

                  {caseData.next_steps ? (
                    <p className="whitespace-pre-line text-sm leading-7 text-[#55504A]">
                      {caseData.next_steps}
                    </p>
                  ) : (
                    <p className="text-sm text-[#77716A]">
                      No next steps have been
                      recorded.
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* =================================================
                RIGHT COLUMN
            ================================================= */}

            <div className="space-y-6">

              {/* LEGAL CLASSIFICATION */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-6">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                  Legal Classification
                </p>

                <h2 className="mt-2 font-serif text-xl font-semibold">
                  {caseData.legal_category ||
                    "Not classified"}
                </h2>

                <div className="mt-5 border-t border-[#D7CFBF] pt-5">

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">
                    Recommended Specialization
                  </p>

                  <p className="mt-2 text-sm font-medium leading-6 text-[#55504A]">
                    {caseData.recommended_specialization ||
                      "Not specified"}
                  </p>

                </div>

              </div>

              {/* MISSING DOCUMENTS */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4]">

                <div className="border-b border-[#D7CFBF] px-6 py-5">

                  <div className="flex items-center gap-3">

                    <FileText
                      size={18}
                      className="text-[#8A6D1D]"
                    />

                    <div>

                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                        Documents
                      </p>

                      <h2 className="mt-1 font-serif text-xl font-semibold">
                        Missing Documents
                      </h2>

                    </div>

                  </div>

                </div>

                <div className="p-6">

                  {caseData.missing_documents ? (
                    <ul className="space-y-3">

                      {caseData.missing_documents
                        .split("\n")
                        .filter(
                          (item) => item.trim()
                        )
                        .map(
                          (document, index) => (
                            <li
                              key={index}
                              className="flex gap-3 text-sm leading-6 text-[#55504A]"
                            >

                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C9A227]" />

                              <span>
                                {document}
                              </span>

                            </li>
                          )
                        )}

                    </ul>
                  ) : (
                    <p className="text-sm text-[#77716A]">
                      No missing documents
                      recorded.
                    </p>
                  )}

                </div>

              </div>

              {/* TIMELINE */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-6">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                  Case Timeline
                </p>

                <div className="mt-5 space-y-5">

                  <div className="flex gap-3">

                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C9A227]" />

                    <div>

                      <p className="text-sm font-semibold">
                        Case created
                      </p>

                      <p className="mt-1 text-xs text-[#77716A]">
                        {formatDate(
                          caseData.created_at
                        )}
                      </p>

                    </div>

                  </div>

                  <div className="flex gap-3">

                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#C9A227]" />

                    <div>

                      <p className="text-sm font-semibold">
                        Lawyer assigned
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#77716A]">
                        This case is assigned
                        to you.
                      </p>

                    </div>

                  </div>

                  {caseData.updated_at && (
                    <div className="flex gap-3">

                      <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#D7CFBF]" />

                      <div>

                        <p className="text-sm font-semibold">
                          Last updated
                        </p>

                        <p className="mt-1 text-xs text-[#77716A]">
                          {formatDate(
                            caseData.updated_at
                          )}
                        </p>

                      </div>

                    </div>
                  )}

                </div>

              </div>

              {/* MESSAGE CLIENT */}

              <div className="border border-[#D7CFBF] bg-[#171717] p-6 text-white">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                  Client Communication
                </p>

                <h2 className="mt-2 font-serif text-xl font-semibold">
                  Need more information?
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#BDB8AE]">
                  Contact the client directly
                  through the case conversation.
                </p>

                <button
                  type="button"
                  onClick={messageClient}
                  className="mt-5 flex w-full items-center justify-center gap-2 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717] transition hover:bg-[#F1ECE2]"
                >

                  <MessageSquare size={16} />

                  Message Client

                </button>

              </div>

            </div>

          </section>

        </div>

      </div>

      {/* ======================================================
          MOBILE MESSAGE BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={messageClient}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-lg sm:hidden"
      >

        <MessageSquare size={16} />

        Message Client

      </button>

    </main>
  );
}