import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  Scale,
} from "lucide-react";

import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface CaseResponse {
  id: number;
  client_id: number;
  lawyer_id: number | null;
  title: string;
  case_type: string;
  description: string;
  urgency: string;
  status: string;
  ai_summary: string | null;
  legal_category: string | null;
  recommended_specialization: string | null;
  missing_documents: string | null;
  next_steps: string | null;
  incident_date: string | null;
  incident_location: string | null;
  created_at: string;
  updated_at: string | null;
}

interface CaseAnalysisResponse {
  ai_summary: string;
  legal_category: string;
  recommended_specialization: string;
  missing_documents: string[];
  next_steps: string[];
  urgency: string;
}

export default function CaseAnalysis() {
  const navigate = useNavigate();

  const { caseId } =
    useParams<{
      caseId: string;
    }>();

  const { token } = useAuth();

  const [analysis, setAnalysis] =
    useState<CaseAnalysisResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ========================================================
  // LOAD ANALYSIS
  // ========================================================

  useEffect(() => {
    let mounted = true;

    const loadAnalysis = async () => {
      if (!token || !caseId) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const caseData =
          await apiRequest<CaseResponse>(
            `/cases/${caseId}`,
            {
              method: "GET",
              token,
            }
          );

        if (!mounted) {
          return;
        }

        if (!caseData.ai_summary) {
          throw new Error(
            "Case analysis has not been completed yet. Please return to the intake and complete the analysis."
          );
        }

        const missingDocuments =
          caseData.missing_documents
            ? caseData.missing_documents
                .split("\n")
                .map((item) =>
                  item
                    .replace(/^[-•]\s*/, "")
                    .trim()
                )
                .filter(Boolean)
            : [];

        const nextSteps =
          caseData.next_steps
            ? caseData.next_steps
                .split("\n")
                .map((item) =>
                  item
                    .replace(/^\d+[.)]\s*/, "")
                    .trim()
                )
                .filter(Boolean)
            : [];

        setAnalysis({
          ai_summary: caseData.ai_summary,
          legal_category:
            caseData.legal_category ||
            "Not specified",
          recommended_specialization:
            caseData.recommended_specialization ||
            "Not specified",
          missing_documents: missingDocuments,
          next_steps: nextSteps,
          urgency: caseData.urgency,
        });
      } catch (err) {
        console.error(
          "Case analysis error:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load case analysis."
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadAnalysis();

    return () => {
      mounted = false;
    };
  }, [
    token,
    caseId,
    navigate,
  ]);


  // ========================================================
  // LOADING
  // ========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F4F0E8]">

        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="px-5 py-5 md:px-8">
            <Logo />
          </div>
        </header>

        <div className="flex min-h-[75vh] items-center justify-center">

          <div className="text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#171717] text-white">
              <Bot size={28} />
            </div>

            <Loader2
              size={25}
              className="mx-auto mt-6 animate-spin text-[#8A6D1D]"
            />

            <h1 className="mt-5 font-serif text-2xl font-semibold">
              Analyzing your case
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#77716A]">
              Our AI is reviewing the information
              you provided and preparing a preliminary
              case assessment.
            </p>

          </div>

        </div>

      </main>
    );
  }


  // ========================================================
  // ERROR
  // ========================================================

  if (error || !analysis) {
    return (
      <main className="min-h-screen bg-[#F4F0E8]">

        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="px-5 py-5 md:px-8">
            <Logo />
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-5 py-20 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-red-200 bg-red-50">
            <Bot
              size={25}
              className="text-red-600"
            />
          </div>

          <h1 className="mt-5 font-serif text-2xl font-semibold">
            Unable to load analysis
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-700">
            {error ||
              "No case analysis was found."}
          </p>

          <div className="mt-7 flex justify-center gap-3">

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/case-intake/${caseId}`
                )
              }
              className="inline-flex items-center gap-2 border border-[#BEB5A5] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717]"
            >
              <ArrowLeft size={15} />
              Back to Intake
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/client/dashboard"
                )
              }
              className="inline-flex items-center gap-2 bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Dashboard
            </button>

          </div>

        </div>

      </main>
    );
  }


  // ========================================================
  // ANALYSIS PAGE
  // ========================================================

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 md:px-8">

          <Logo />

          <button
            type="button"
            onClick={() =>
              navigate(
                "/client/dashboard"
              )
            }
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#55504A] hover:text-[#8A6D1D]"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

        </div>

      </header>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <div className="mx-auto max-w-4xl px-5 py-10 md:px-8">

        {/* ==================================================
            PAGE INTRO
        ================================================== */}

        <div className="mb-8">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center bg-[#171717] text-white">
              <Bot size={20} />
            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                AI Case Analysis
              </p>

              <h1 className="font-serif text-3xl font-semibold">
                Your case assessment
              </h1>

            </div>

          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#66615A]">
            Based on the information you provided
            during the legal intake, here is a
            preliminary AI-generated assessment.
          </p>

          <div className="mt-4 flex items-start gap-2 border border-[#D7CFBF] bg-[#FBF9F4] px-4 py-3 text-xs leading-5 text-[#77716A]">
            <Scale
              size={15}
              className="mt-0.5 shrink-0 text-[#8A6D1D]"
            />

            <span>
              This is an AI-generated preliminary
              assessment and is not a substitute for
              advice from a qualified lawyer.
            </span>
          </div>

        </div>


        {/* ==================================================
            CASE SUMMARY
        ================================================== */}

        <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

          <div className="border-b border-[#D7CFBF] px-5 py-4 md:px-7">

            <div className="flex items-center gap-3">

              <FileText
                size={18}
                className="text-[#8A6D1D]"
              />

              <div>

                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
                  Case Summary
                </p>

                <h2 className="mt-1 font-serif text-xl font-semibold">
                  What we understand
                </h2>

              </div>

            </div>

          </div>

          <div className="px-5 py-6 md:px-7">

            <p className="whitespace-pre-line text-sm leading-7 text-[#55504A]">
              {analysis.ai_summary}
            </p>

          </div>

        </section>


        {/* ==================================================
            CATEGORY + SPECIALIZATION
        ================================================== */}

        <div className="mt-5 grid gap-5 md:grid-cols-2">

          {/* Legal Category */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4] p-6">

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
              Legal Category
            </p>

            <h2 className="mt-3 font-serif text-xl font-semibold">
              {analysis.legal_category}
            </h2>

          </section>


          {/* Specialization */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4] p-6">

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
              Recommended Specialization
            </p>

            <h2 className="mt-3 font-serif text-xl font-semibold">
              {analysis.recommended_specialization}
            </h2>

          </section>

        </div>


        {/* ==================================================
            URGENCY
        ================================================== */}

        <section className="mt-5 border border-[#D7CFBF] bg-[#FBF9F4] p-6">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
                Case Urgency
              </p>

              <h2 className="mt-2 font-serif text-xl font-semibold capitalize">
                {analysis.urgency}
              </h2>

            </div>

            <div className="flex h-10 w-10 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">
              <CheckCircle2
                size={20}
                className="text-[#6B7A42]"
              />
            </div>

          </div>

        </section>


        {/* ==================================================
            MISSING DOCUMENTS
        ================================================== */}

        <section className="mt-5 border border-[#D7CFBF] bg-[#FBF9F4]">

          <div className="border-b border-[#D7CFBF] px-5 py-4 md:px-7">

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
              Missing Documents
            </p>

            <h2 className="mt-1 font-serif text-xl font-semibold">
              Documents that may help
            </h2>

          </div>

          <div className="px-5 py-6 md:px-7">

            {analysis.missing_documents.length > 0 ? (

              <ul className="space-y-3">

                {analysis.missing_documents.map(
                  (document, index) => (

                    <li
                      key={`${document}-${index}`}
                      className="flex gap-3 text-sm leading-6 text-[#55504A]"
                    >

                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8A6D1D]" />

                      <span>
                        {document}
                      </span>

                    </li>

                  )
                )}

              </ul>

            ) : (

              <p className="text-sm text-[#77716A]">
                No specific documents were identified
                from the information provided.
              </p>

            )}

          </div>

        </section>


        {/* ==================================================
            NEXT STEPS
        ================================================== */}

        <section className="mt-5 border border-[#D7CFBF] bg-[#FBF9F4]">

          <div className="border-b border-[#D7CFBF] px-5 py-4 md:px-7">

            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
              Next Steps
            </p>

            <h2 className="mt-1 font-serif text-xl font-semibold">
              What you can prepare
            </h2>

          </div>

          <div className="px-5 py-6 md:px-7">

            {analysis.next_steps.length > 0 ? (

              <ol className="space-y-4">

                {analysis.next_steps.map(
                  (step, index) => (

                    <li
                      key={`${step}-${index}`}
                      className="flex gap-4"
                    >

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-[#171717] text-xs font-semibold text-white">
                        {index + 1}
                      </span>

                      <p className="pt-1 text-sm leading-6 text-[#55504A]">
                        {step}
                      </p>

                    </li>

                  )
                )}

              </ol>

            ) : (

              <p className="text-sm text-[#77716A]">
                No specific next steps were identified.
              </p>

            )}

          </div>

        </section>


        {/* ==================================================
            LAWYER MATCHING CTA
        ================================================== */}

        <section className="mt-8 border border-[#BEB5A5] bg-[#171717] p-6 text-white md:p-8">

          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

            <div className="max-w-xl">

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                Next Step
              </p>

              <h2 className="mt-2 font-serif text-2xl font-semibold">
                Find the right lawyer for your case
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#BDB8AE]">
                We'll use your case category and
                recommended specialization to find
                suitable lawyers on Vakilo.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/case-lawyers/${caseId}`
                )
              }
              className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#C9A227] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717] transition hover:bg-[#D8B638]"
            >
              Find Recommended Lawyers
              <ArrowRight size={16} />
            </button>

          </div>

        </section>


        {/* ==================================================
            FOOTER NOTE
        ================================================== */}

        <div className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#8A847B]">

          <MapPin
            size={14}
            className="mt-0.5 shrink-0"
          />

          <p>
            Lawyer recommendations will be based
            on the legal specialization identified
            from your case and the lawyers available
            on Vakilo.
          </p>

        </div>

      </div>

    </main>
  );
}