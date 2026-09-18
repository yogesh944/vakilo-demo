import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Gavel,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Logo from "../components/Logo";
import { apiRequest } from "../services/api";

type CaseType =
  | "criminal"
  | "civil"
  | "family"
  | "property"
  | "consumer"
  | "cyber"
  | "corporate"
  | "other";

type CaseUrgency =
  | "low"
  | "medium"
  | "high"
  | "emergency";

interface CaseResponse {
  id: number;
  client_id: number;
  lawyer_id: number | null;
  title: string;
  case_type: CaseType;
  description: string;
  urgency: CaseUrgency;
  status: string;
  incident_date: string | null;
  incident_location: string | null;
  created_at: string;
  updated_at: string | null;
}

const CASE_TYPES: {
  value: CaseType;
  label: string;
}[] = [
  {
    value: "criminal",
    label: "Criminal",
  },
  {
    value: "civil",
    label: "Civil",
  },
  {
    value: "family",
    label: "Family",
  },
  {
    value: "property",
    label: "Property",
  },
  {
    value: "consumer",
    label: "Consumer",
  },
  {
    value: "cyber",
    label: "Cyber",
  },
  {
    value: "corporate",
    label: "Corporate",
  },
  {
    value: "other",
    label: "Other",
  },
];

export default function StartCase() {
  const navigate = useNavigate();

  const [description, setDescription] =
    useState("");

  const [caseType, setCaseType] =
    useState<CaseType>("other");

  const [urgency, setUrgency] =
    useState<CaseUrgency>("medium");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const getAuthToken = (): string => {
    return (
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      ""
    );
  };


  /* ==========================================================
     CREATE CASE
  ========================================================== */

  const handleStart = async () => {
    setError("");

    const cleanDescription =
      description.trim();

    if (cleanDescription.length < 10) {
      setError(
        "Please describe your legal problem in at least 10 characters."
      );
      return;
    }

    const token = getAuthToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });
      return;
    }

    setLoading(true);

    try {
      /*
       * Create the initial DRAFT case.
       *
       * IMPORTANT:
       * apiRequest() handles JSON.stringify(),
       * so body must be a normal object.
       */

      const createdCase =
        await apiRequest<CaseResponse>(
          "/cases",
          {
            method: "POST",
            token,
            body: {
              title:
                "New Legal Case",

              case_type:
                caseType,

              description:
                cleanDescription,

              urgency:
                urgency,

              incident_date:
                null,

              incident_location:
                null,
            },
          }
        );

      /*
       * Save the case ID so the intake page
       * can continue the conversation.
       */

      navigate(
        `/case-intake/${createdCase.id}`,
        {
          replace: true,
        }
      );

    } catch (err) {
      console.error(
        "Create case error:",
        err
      );

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Unable to start your case. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };


  /* ==========================================================
     BACK
  ========================================================== */

  const handleBack = () => {
    navigate("/client/dashboard");
  };


  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">

          <Logo />

          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#55504A] transition hover:text-[#8A6D1D]"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

        </div>

      </header>


      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-14">

        {/* Progress */}

        <div className="mb-10">

          <div className="flex items-center gap-3">

            <div className="flex h-8 w-8 items-center justify-center bg-[#171717] text-xs font-semibold text-white">
              01
            </div>

            <div className="h-px w-16 bg-[#C9A227]" />

            <div className="flex h-8 w-8 items-center justify-center border border-[#D7CFBF] bg-[#FBF9F4] text-xs text-[#99938A]">
              02
            </div>

            <div className="h-px w-16 bg-[#D7CFBF]" />

            <div className="flex h-8 w-8 items-center justify-center border border-[#D7CFBF] bg-[#FBF9F4] text-xs text-[#99938A]">
              03
            </div>

          </div>

          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            Step 1 of 3 — Tell us what happened
          </p>

        </div>


        {/* ====================================================
            INTRO
        ==================================================== */}

        <section className="mb-8">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center border border-[#D7CFBF] bg-[#FBF9F4]">
              <Gavel
                size={20}
                className="text-[#8A6D1D]"
              />
            </div>

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                AI Legal Intake
              </p>

              <h1 className="mt-1 font-serif text-3xl font-semibold md:text-4xl">
                Start your case
              </h1>

            </div>

          </div>


          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#66615A]">

            Tell us about your legal problem in
            your own words. You don't need to know
            the legal terminology. Our AI will ask
            relevant follow-up questions and help
            organize your case.

          </p>

        </section>


        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (

          <div className="mb-6 flex items-start justify-between gap-4 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">

            <p className="whitespace-pre-line">
              {error}
            </p>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 text-xs underline"
            >
              Dismiss
            </button>

          </div>

        )}


        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">

          {/* ==================================================
              PROBLEM
          ================================================== */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <div className="flex items-center gap-2">

                <Sparkles
                  size={17}
                  className="text-[#8A6D1D]"
                />

                <h2 className="font-serif text-xl font-semibold">
                  Describe your problem
                </h2>

              </div>

              <p className="mt-2 text-xs leading-5 text-[#77716A]">

                Include what happened, who is
                involved, and what help you need.

              </p>

            </div>


            <div className="p-6">

              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="For example: My uncle is claiming ownership of my grandfather's property. My grandfather passed away recently and I want to understand my rights..."
                rows={10}
                disabled={loading}
                className="w-full resize-none border border-[#CEC6B8] bg-white p-4 text-sm leading-7 outline-none transition placeholder:text-[#A39C91] focus:border-[#C9A227] disabled:bg-[#F0EBE1]"
              />

              <div className="mt-2 flex justify-between text-[10px] text-[#8A847B]">

                <span>
                  Minimum 10 characters
                </span>

                <span>
                  {description.length}
                </span>

              </div>

            </div>

          </section>


          {/* ==================================================
              OPTIONAL DETAILS
          ================================================== */}

          <section className="border border-[#D7CFBF] bg-[#FBF9F4]">

            <div className="border-b border-[#D7CFBF] px-6 py-5">

              <h2 className="font-serif text-xl font-semibold">
                Basic information
              </h2>

              <p className="mt-2 text-xs leading-5 text-[#77716A]">
                These details help the AI begin
                understanding your case.
              </p>

            </div>


            <div className="space-y-6 p-6">

              {/* Case Type */}

              <div>

                <label
                  htmlFor="caseType"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  Case Type
                </label>

                <select
                  id="caseType"
                  value={caseType}
                  onChange={(event) =>
                    setCaseType(
                      event.target.value as CaseType
                    )
                  }
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227] disabled:bg-[#F0EBE1]"
                >

                  {CASE_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}

                </select>

                <p className="mt-2 text-[10px] leading-5 text-[#8A847B]">
                  You can choose "Other" if you're
                  unsure. The AI will help identify
                  the legal category.
                </p>

              </div>


              {/* Urgency */}

              <div>

                <label
                  htmlFor="urgency"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-[#55504A]"
                >
                  How urgent is this?
                </label>

                <select
                  id="urgency"
                  value={urgency}
                  onChange={(event) =>
                    setUrgency(
                      event.target.value as CaseUrgency
                    )
                  }
                  disabled={loading}
                  className="h-12 w-full border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227] disabled:bg-[#F0EBE1]"
                >

                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>

                  <option value="emergency">
                    Emergency
                  </option>

                </select>

              </div>


              {/* Privacy */}

              <div className="border-t border-[#D7CFBF] pt-5">

                <div className="flex gap-3">

                  <ShieldCheck
                    size={18}
                    className="mt-0.5 shrink-0 text-[#8A6D1D]"
                  />

                  <div>

                    <p className="text-xs font-semibold">
                      Your information is private
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-[#77716A]">
                      Your case information is used
                      to understand your legal issue
                      and connect you with suitable
                      lawyers.
                    </p>

                  </div>

                </div>

              </div>

            </div>

          </section>

        </div>


        {/* ====================================================
            CONTINUE
        ==================================================== */}

        <div className="mt-6 flex justify-end">

          <button
            type="button"
            onClick={handleStart}
            disabled={
              loading ||
              description.trim().length < 10
            }
            className="inline-flex items-center gap-3 bg-[#171717] px-7 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-40"
          >

            {loading
              ? "Starting Case..."
              : "Continue to AI Intake"}

            {!loading && (
              <ArrowRight size={16} />
            )}

          </button>

        </div>


        <p className="mt-4 text-right text-[10px] leading-5 text-[#8A847B]">

          The AI will ask additional questions
          after you continue.

        </p>

      </div>

    </main>
  );
}