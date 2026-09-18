import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { apiRequest } from "../services/api";

interface CaseStatus {
  label: string;
  completed: boolean;
  current?: boolean;
}

interface EcourtsCase {
  cnr_number: string;
  case_number?: string | null;
  title: string;
  court?: string | null;
  case_type?: string | null;
  status: string;
  next_hearing_date?: string | null;
  last_updated?: string | null;
  stages: Array<{ label?: string; name?: string; status?: string; completed?: boolean }>;
}

export default function CaseTrackerDashboard() {
  const [searchParams] = useSearchParams();
  const [cnrNumber, setCnrNumber] = useState("");
  const [caseData, setCaseData] = useState<EcourtsCase | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookupCase = useCallback(async (value: string) => {
    const cleanCnr = value.trim().toUpperCase();
    if (!cleanCnr) {
      return;
    }

    setCnrNumber(cleanCnr);
    setLoading(true);
    setError("");
    setCaseData(null);

    try {
      const data = await apiRequest<EcourtsCase>(
        `/ecourts/cases?cnr=${encodeURIComponent(cleanCnr)}`
      );
      setCaseData(data);
    } catch (lookupError) {
      setError(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to retrieve this case from eCourts."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialCnr = searchParams.get("cnr");
    if (initialCnr) {
      void lookupCase(initialCnr);
    }
  }, [lookupCase, searchParams]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void lookupCase(cnrNumber);
  };

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-[#D5CDBF] bg-[#FBF9F4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10 lg:px-16">
          <Logo />

          <button
            type="button"
            className="border border-[#BEB5A5] px-5 py-3 text-xs font-semibold uppercase tracking-wider transition hover:border-[#C9A227] hover:text-[#8A6D1D]"
          >
            Back to Vakilo
          </button>
        </div>
      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-10 md:py-16">
        {/* Heading */}

        <div className="mb-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-[#8A6D1D]">
            Case Tracker
          </p>

          <h1 className="font-serif text-4xl font-semibold md:text-5xl">
            Track your case
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#66615A]">
            Enter your CNR number to view the latest information
            and progress of your court case.
          </p>
        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <form
          onSubmit={handleSearch}
          className="border border-[#CEC6B8] bg-[#FBF9F4] p-5 md:p-7"
        >
          <label
            htmlFor="cnr"
            className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[#55504A]"
          >
            CNR Number
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="cnr"
              type="text"
              value={cnrNumber}
              onChange={(event) => setCnrNumber(event.target.value.toUpperCase())}
              placeholder="Enter your CNR number"
              className="h-13 flex-1 border border-[#CEC6B8] bg-white px-4 text-sm outline-none focus:border-[#C9A227]"
            />

            <button
              type="submit"
              className="h-13 bg-[#171717] px-7 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#2A2A2A]"
            >
              {loading ? "Loading..." : "Track Case"}
            </button>
          </div>
        </form>

        {/* =================================================
            SEARCH RESULT
        ================================================= */}

        {error && (
          <div className="mt-8 border border-[#C98C7A] bg-[#FFF7F3] px-6 py-5 text-sm text-[#8B3022]">
            {error}
          </div>
        )}

        {caseData && (
          <section className="mt-8 border border-[#CEC6B8] bg-[#FBF9F4]">
            {/* Case header */}

            <div className="border-b border-[#D9D2C5] p-7">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Case Information
                  </p>

                  <h2 className="mt-3 font-serif text-2xl font-semibold">
                    {caseData.title}
                  </h2>
                </div>

                <span className="w-fit border border-[#C9A227] bg-[#F1ECE2] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#8A6D1D]">
                  {caseData.status}
                </span>
              </div>
            </div>

            {/* Case details */}

            <div className="grid border-b border-[#D9D2C5] md:grid-cols-3">
              <div className="border-b border-[#D9D2C5] p-6 md:border-b-0 md:border-r">
                <p className="text-[10px] uppercase tracking-wider text-[#77716A]">
                  Case Type
                </p>

                <p className="mt-2 font-serif text-lg font-semibold">
                  {caseData.case_type || "Not provided"}
                </p>
              </div>

              <div className="border-b border-[#D9D2C5] p-6 md:border-b-0 md:border-r">
                <p className="text-[10px] uppercase tracking-wider text-[#77716A]">
                  Court
                </p>

                <p className="mt-2 font-serif text-lg font-semibold">
                  {caseData.court || "Not provided"}
                </p>
              </div>

              <div className="p-6">
                <p className="text-[10px] uppercase tracking-wider text-[#77716A]">
                  Last Updated
                </p>

                <p className="mt-2 font-serif text-lg font-semibold">
                  {caseData.last_updated || "Not provided"}
                </p>
              </div>
            </div>

            {/* =================================================
                TIMELINE
            ================================================= */}

            <div className="p-7 md:p-10">
              <p className="mb-8 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Case Progress
              </p>

              <div className="relative">
                {caseData.stages.map((stage, index) => {
                  const isLast =
                    index === caseData.stages.length - 1;
                  const status: CaseStatus = {
                    label: stage.label || stage.name || stage.status || `Stage ${index + 1}`,
                    completed: stage.completed ?? false,
                    current: !stage.completed && index === 0,
                  };

                  return (
                    <div
                      key={status.label}
                      className="relative flex gap-5"
                    >
                      {!isLast && (
                        <div
                          className={`absolute left-[11px] top-7 h-full w-px ${
                            status.completed
                              ? "bg-[#C9A227]"
                              : "bg-[#D5CDBF]"
                          }`}
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                          status.completed
                            ? "border-[#C9A227] bg-[#C9A227]"
                            : status.current
                              ? "border-[#C9A227] bg-[#FBF9F4]"
                              : "border-[#C9C2B5] bg-[#FBF9F4]"
                        }`}
                      >
                        {status.completed && (
                          <span className="text-xs font-bold text-[#171717]">
                            ✓
                          </span>
                        )}
                      </div>

                      <div className="pb-10">
                        <h3
                          className={`font-serif text-lg font-semibold ${
                            status.current
                              ? "text-[#8A6D1D]"
                              : "text-[#171717]"
                          }`}
                        >
                          {status.label}
                        </h3>

                        <p className="mt-1 text-sm text-[#77716A]">
                          {status.completed
                            ? "Completed"
                            : status.current
                              ? "Current stage"
                              : "Upcoming"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!caseData && !error && !loading && (
          <div className="mt-8 border border-dashed border-[#C8BFAF] bg-[#FBF9F4] px-6 py-14 text-center">
            <p className="font-serif text-xl font-semibold">
              Enter a CNR number to begin.
            </p>

            <p className="mt-2 text-sm text-[#77716A]">
              Your case information will appear here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}