import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  MapPin,
  Star,
  UserRound,
} from "lucide-react";

import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

interface Lawyer {
  user_id: number;
  lawyer_profile_id: number;

  full_name: string;
  email: string;
  phone: string | null;

  specialization: string;
  experience_years: number;

  consultation_fee: number | null;

  city: string | null;
  state: string | null;

  languages: string | null;
  bio: string | null;

  rating: number;
  total_reviews: number;

  is_available: boolean;
  is_verified: boolean;

  match_score: number;
  match_reasons: string[];
}

interface LawyerRecommendationResponse {
  case_id: number;
  legal_category: string | null;
  recommended_specialization: string | null;
  lawyers: Lawyer[];
}

export default function RecommendedLawyers() {
  const navigate = useNavigate();

  const { caseId } = useParams<{
    caseId: string;
  }>();

  const { token } = useAuth();

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [category, setCategory] = useState("");
  const [specialization, setSpecialization] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [selectingId, setSelectingId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [requestedIds, setRequestedIds] = useState<Set<number>>(
    new Set()
  );


  // ==========================================================
  // LOAD RECOMMENDED LAWYERS
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadLawyers = async () => {
      if (!token || !caseId) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await apiRequest<LawyerRecommendationResponse>(
            `/cases/${caseId}/recommended-lawyers`,
            {
              method: "GET",
              token,
            }
          );

        if (!mounted) {
          return;
        }

        setLawyers(
          Array.isArray(response.lawyers)
            ? response.lawyers
            : []
        );

        setCategory(
          response.legal_category ||
            "Not specified"
        );

        setSpecialization(
          response.recommended_specialization ||
            "Not specified"
        );

      } catch (err) {
        console.error(
          "Lawyer recommendation error:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load recommended lawyers."
        );

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadLawyers();

    return () => {
      mounted = false;
    };
  }, [
    token,
    caseId,
    navigate,
  ]);


  // ==========================================================
  // SELECT LAWYER
  // ==========================================================

  const handleSelectLawyer = async (
    lawyer: Lawyer
  ) => {
    if (!token || !caseId) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    const confirmed =
      window.confirm(
        `Send a lawyer request to ${lawyer.full_name}? The lawyer must accept your request before the case is assigned.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setSelectingId(
        lawyer.user_id
      );

      setError("");
      setSuccess("");

      await apiRequest(
        `/lawyer-requests/cases/${caseId}`,
        {
          method: "POST",
          token,
          body: {
            lawyer_id: lawyer.user_id,
            client_message:
              "I would like to request your assistance with my case.",
          },
        }
      );

      setRequestedIds((previous) => {
        const next = new Set(previous);
        next.add(lawyer.user_id);
        return next;
      });

      setSuccess(
        `Request sent to ${lawyer.full_name}. The lawyer must accept your request before the case is assigned.`
      );

    } catch (err) {
      console.error(
        "Select lawyer error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to select this lawyer."
      );

    } finally {
      setSelectingId(null);
    }
  };


  // ==========================================================
  // LOADING
  // ==========================================================

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
              <BriefcaseBusiness size={27} />
            </div>

            <Loader2
              size={25}
              className="mx-auto mt-6 animate-spin text-[#8A6D1D]"
            />

            <h1 className="mt-5 font-serif text-2xl font-semibold">
              Finding lawyers for your case
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#77716A]">
              We're matching your case with lawyers
              based on their expertise and availability.
            </p>

          </div>

        </div>

      </main>
    );
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  if (error && lawyers.length === 0) {
    return (
      <main className="min-h-screen bg-[#F4F0E8]">

        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="px-5 py-5 md:px-8">
            <Logo />
          </div>
        </header>

        <div className="mx-auto max-w-2xl px-5 py-20 text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-red-200 bg-red-50">
            <BriefcaseBusiness
              size={25}
              className="text-red-600"
            />
          </div>

          <h1 className="mt-5 font-serif text-2xl font-semibold">
            Unable to load lawyers
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-700">
            {error}
          </p>

          <div className="mt-7 flex justify-center gap-3">

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/case-analysis/${caseId}`
                )
              }
              className="inline-flex items-center gap-2 border border-[#BEB5A5] px-5 py-3 text-xs font-semibold uppercase tracking-wider"
            >
              <ArrowLeft size={15} />
              Case Analysis
            </button>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Try Again
            </button>

          </div>

        </div>

      </main>
    );
  }


  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">

          <Logo />

          <button
            type="button"
            onClick={() =>
              navigate(
                `/case-analysis/${caseId}`
              )
            }
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#55504A] hover:text-[#8A6D1D]"
          >
            <ArrowLeft size={16} />
            Case Analysis
          </button>

        </div>

      </header>


      {/* ====================================================
          CONTENT
      ==================================================== */}

      <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">

        {/* ==================================================
            INTRO
        ================================================== */}

        <section className="mb-8">

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8A6D1D]">
            Lawyer Matching
          </p>

          <h1 className="mt-2 font-serif text-4xl font-semibold">
            Recommended lawyers
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#66615A]">
            Based on your AI case assessment, these
            lawyers appear relevant to your case.
            Review their profiles and select the
            lawyer you would like to work with.
          </p>


          {/* AI MATCH INFORMATION */}

          <div className="mt-6 grid gap-4 md:grid-cols-2">

            <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
                Legal Category
              </p>

              <p className="mt-2 font-serif text-lg font-semibold">
                {category}
              </p>

            </div>


            <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
                Recommended Specialization
              </p>

              <p className="mt-2 font-serif text-lg font-semibold">
                {specialization}
              </p>

            </div>

          </div>

        </section>


        {/* ==================================================
            SUCCESS
        ================================================== */}

        {success && (
          <div className="mb-6 flex items-center gap-3 border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">

            <CheckCircle2 size={19} />

            <span>{success}</span>

          </div>
        )}


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}


        {/* ==================================================
            NO LAWYERS
        ================================================== */}

        {lawyers.length === 0 && !error && (

          <section className="border border-[#D7CFBF] bg-[#FBF9F4] px-6 py-14 text-center">

            <UserRound
              size={34}
              className="mx-auto text-[#8A6D1D]"
            />

            <h2 className="mt-5 font-serif text-2xl font-semibold">
              No matching lawyers found
            </h2>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#77716A]">
              We couldn't find a suitable available
              lawyer based on the information currently
              available for your case.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/case-analysis/${caseId}`
                )
              }
              className="mt-7 bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Back to Case Analysis
            </button>

          </section>

        )}


        {/* ==================================================
            LAWYER CARDS
        ================================================== */}

        <div className="grid gap-6 lg:grid-cols-2">

          {lawyers.map((lawyer) => (

            <article
              key={lawyer.user_id}
              className="border border-[#D7CFBF] bg-[#FBF9F4]"
            >

              {/* CARD HEADER */}

              <div className="border-b border-[#D7CFBF] p-6">

                <div className="flex items-start justify-between gap-5">

                  <div className="flex gap-4">

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[#171717] text-white">
                      <UserRound size={24} />
                    </div>

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="font-serif text-xl font-semibold">
                          {lawyer.full_name}
                        </h2>

                        {lawyer.is_verified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[#6B7A42]">
                            <BadgeCheck size={15} />
                            Verified
                          </span>
                        )}

                      </div>

                      <p className="mt-1 text-sm text-[#66615A]">
                        {lawyer.specialization}
                      </p>

                    </div>

                  </div>


                  {/* MATCH SCORE */}

                  <div className="shrink-0 text-right">

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                      Match
                    </p>

                    <p className="mt-1 font-serif text-2xl font-semibold">
                      {lawyer.match_score}%
                    </p>

                  </div>

                </div>

              </div>


              {/* DETAILS */}

              <div className="p-6">

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-[#8A847B]">
                      Experience
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <BriefcaseBusiness size={15} />
                      {lawyer.experience_years} years
                    </p>

                  </div>


                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-[#8A847B]">
                      Rating
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <Star
                        size={15}
                        className="fill-current text-[#8A6D1D]"
                      />
                      {lawyer.rating.toFixed(1)}

                      <span className="font-normal text-[#77716A]">
                        ({lawyer.total_reviews})
                      </span>
                    </p>

                  </div>


                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-[#8A847B]">
                      Location
                    </p>

                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold">
                      <MapPin size={15} />

                      {lawyer.city ||
                        lawyer.state ||
                        "Not specified"}
                    </p>

                  </div>


                  <div>

                    <p className="text-[10px] uppercase tracking-wider text-[#8A847B]">
                      Consultation
                    </p>

                    <p className="mt-1 text-sm font-semibold">
                      {lawyer.consultation_fee !==
                      null
                        ? `₹${lawyer.consultation_fee}`
                        : "Contact lawyer"}
                    </p>

                  </div>

                </div>


                {/* BIO */}

                {lawyer.bio && (

                  <div className="mt-6 border-t border-[#E1DACD] pt-5">

                    <p className="text-[10px] uppercase tracking-wider text-[#8A847B]">
                      About
                    </p>

                    <p className="mt-2 text-sm leading-6 text-[#55504A]">
                      {lawyer.bio}
                    </p>

                  </div>

                )}


                {/* MATCH REASONS */}

                {lawyer.match_reasons.length > 0 && (

                  <div className="mt-6 border-t border-[#E1DACD] pt-5">

                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                      Why this lawyer
                    </p>

                    <ul className="mt-3 space-y-2">

                      {lawyer.match_reasons
                        .slice(0, 4)
                        .map(
                          (
                            reason,
                            index
                          ) => (

                            <li
                              key={`${reason}-${index}`}
                              className="flex items-start gap-2 text-sm text-[#55504A]"
                            >

                              <CheckCircle2
                                size={15}
                                className="mt-0.5 shrink-0 text-[#6B7A42]"
                              />

                              <span>
                                {reason}
                              </span>

                            </li>

                          )
                        )}

                    </ul>

                  </div>

                )}


                {/* LANGUAGES */}

                {lawyer.languages && (

                  <div className="mt-5">

                    <p className="text-[10px] uppercase tracking-wider text-[#8A847B]">
                      Languages
                    </p>

                    <p className="mt-1 text-sm text-[#55504A]">
                      {lawyer.languages}
                    </p>

                  </div>

                )}


                {/* SELECT */}

                <button
                  type="button"
                  disabled={
                    selectingId !== null ||
                    !lawyer.is_available ||
                    requestedIds.has(lawyer.user_id)
                  }
                  onClick={() =>
                    void handleSelectLawyer(
                      lawyer
                    )
                  }
                  className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#171717] px-5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {requestedIds.has(lawyer.user_id) ? (
                    <>
                      <CheckCircle2 size={16} />
                      Request Sent
                    </>
                  ) : selectingId ===
                  lawyer.user_id ? (
                    <>
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                      Sending Request...
                    </>
                  ) : lawyer.is_available ? (
                    <>
                      Request This Lawyer
                      <CheckCircle2 size={16} />
                    </>
                  ) : (
                    "Currently Unavailable"
                  )}

                </button>

              </div>

            </article>

          ))}

        </div>


        {/* ==================================================
            DISCLAIMER
        ================================================== */}

        <div className="mt-8 border-t border-[#D7CFBF] pt-5 text-xs leading-5 text-[#8A847B]">

          Lawyer recommendations are based on the
          information available in your case and lawyer
          profiles. The AI assessment and matching
          system do not replace professional legal advice.

        </div>

      </div>

    </main>
  );
}