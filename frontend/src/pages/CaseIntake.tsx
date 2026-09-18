import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Send,
  User,
} from "lucide-react";

import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";


// ==========================================================
// TYPES
// ==========================================================

interface IntakeMessage {
  id: number;
  case_id: number;
  sender: "user" | "ai";
  message: string;
  created_at: string;
}

interface IntakeConversationResponse {
  user_message: IntakeMessage;
  ai_message: IntakeMessage | null;
  intake_complete: boolean;
}

interface CaseAnalysisResponse {
  ai_summary: string;
  legal_category: string;
  recommended_specialization: string;
  missing_documents: string[];
  next_steps: string[];
  urgency: string;
}

interface CaseResponse {
  id: number;
  case_type: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
}


// ==========================================================
// COMPONENT
// ==========================================================

export default function CaseIntake() {
  const navigate = useNavigate();

  const { caseId } = useParams<{
    caseId: string;
  }>();

  const { token } = useAuth();


  // ========================================================
  // STATE
  // ========================================================

  const [caseData, setCaseData] =
    useState<CaseResponse | null>(null);

  const [messages, setMessages] =
    useState<IntakeMessage[]>([]);

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [complete, setComplete] =
    useState(false);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [questionCount, setQuestionCount] =
    useState(0);

  const [error, setError] =
    useState("");

  const bottomRef =
    useRef<HTMLDivElement | null>(null);


  // ==========================================================
  // LOAD CASE
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadCase = async () => {
      if (!token || !caseId) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await apiRequest<CaseResponse>(
            `/cases/${caseId}`,
            {
              token,
            }
          );

        if (!mounted) {
          return;
        }

        setCaseData(data);


        // ====================================================
        // IMPORTANT:
        // If the case has already moved beyond intake,
        // don't allow the client to submit more questions.
        // ====================================================

        const completedStatuses = [
          "lawyer_matching",
          "lawyer_assigned",
          "active",
          "closed",
        ];

        if (
          completedStatuses.includes(
            data.status.toLowerCase()
          )
        ) {
          setComplete(true);
          setQuestionCount(10);

          navigate(
            `/case-analysis/${caseId}`,
            {
              replace: true,
            }
          );

          return;
        }

      } catch (err) {
        if (!mounted) {
          return;
        }

        console.error(
          "Load case error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this case."
        );

      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadCase();

    return () => {
      mounted = false;
    };
  }, [
    token,
    caseId,
    navigate,
  ]);


  // ==========================================================
  // SCROLL TO BOTTOM
  // ==========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  // ==========================================================
  // ANALYZE CASE
  // ==========================================================

  const analyzeCase = async () => {
    if (
      !caseId ||
      !token ||
      analyzing
    ) {
      return false;
    }

    setAnalyzing(true);
    setError("");

    try {
      await apiRequest<CaseAnalysisResponse>(
        `/cases/${caseId}/analyze`,
        {
          method: "POST",
          token,
        }
      );

      navigate(
        `/case-analysis/${caseId}`,
        {
          replace: true,
        }
      );

      return true;

    } catch (err) {
      console.error(
        "Case analysis error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to analyze your case."
      );

      setAnalyzing(false);

      return false;
    }
  };


  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  const sendMessage = async () => {
    const cleanMessage =
      message.trim();

    // --------------------------------------------------------
    // HARD FRONTEND GUARD
    // --------------------------------------------------------

    if (
      !cleanMessage ||
      !caseId ||
      !token ||
      sending ||
      complete ||
      analyzing
    ) {
      return;
    }

    // Never allow question 11
    if (questionCount >= 10) {
      setComplete(true);
      setQuestionCount(10);

      await analyzeCase();

      return;
    }

    setSending(true);
    setError("");
    setMessage("");

    try {
      const response =
        await apiRequest<IntakeConversationResponse>(
          `/cases/${caseId}/intake/messages`,
          {
            method: "POST",
            token,

            body: {
              message: cleanMessage,
            },
          }
        );


      // ======================================================
      // ADD USER MESSAGE
      // ======================================================

      setMessages((previous) => [
        ...previous,
        response.user_message,
      ]);


      // ======================================================
      // ADD AI MESSAGE
      // ======================================================

      if (response.ai_message) {
        setMessages((previous) => [
          ...previous,
          response.ai_message!,
        ]);

        /*
         * Each AI response represents the next
         * intake question.
         */
        setQuestionCount((previous) =>
          Math.min(
            previous + 1,
            10
          )
        );
      }


      // ======================================================
      // INTAKE COMPLETE
      // ======================================================

      if (response.intake_complete) {
        setComplete(true);
        setQuestionCount(10);

        /*
         * Automatically start AI analysis.
         */
        await analyzeCase();

        return;
      }


      // ======================================================
      // EXTRA SAFETY
      // ======================================================

      /*
       * If the frontend has reached question 10,
       * do not allow another submission.
       */

      if (questionCount >= 9) {
        setComplete(true);
        setQuestionCount(10);

        await analyzeCase();

        return;
      }

    } catch (err) {
      console.error(
        "AI intake error:",
        err
      );


      // ======================================================
      // IMPORTANT:
      // Backend says intake is already complete.
      // ======================================================

      const errorMessage =
        err instanceof Error
          ? err.message
          : "";


      const intakeAlreadyComplete =
        errorMessage
          .toLowerCase()
          .includes(
            "intake has already been completed"
          ) ||
        errorMessage
          .toLowerCase()
          .includes(
            "10-question intake"
          ) ||
        errorMessage
          .toLowerCase()
          .includes(
            "intake already"
          );


      if (intakeAlreadyComplete) {
        setComplete(true);
        setQuestionCount(10);
        setMessage("");

        /*
         * The backend has already finished
         * the intake. Take the client directly
         * to case analysis.
         */

        navigate(
          `/case-analysis/${caseId}`,
          {
            replace: true,
          }
        );

        return;
      }


      // ======================================================
      // NORMAL ERROR
      // ======================================================

      setError(
        errorMessage ||
          "Unable to contact the AI intake service."
      );


      /*
       * Put the message back into the
       * textbox so the client doesn't
       * lose what they typed.
       */

      setMessage(
        cleanMessage
      );

    } finally {
      setSending(false);
    }
  };


  // ==========================================================
  // KEYBOARD
  // ==========================================================

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void sendMessage();
    }
  };


  // ==========================================================
  // FINISH
  // ==========================================================

  const finishIntake = () => {
    void analyzeCase();
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


        <div className="flex min-h-[70vh] items-center justify-center">

          <div className="text-center">

            <Loader2
              size={30}
              className="mx-auto animate-spin text-[#8A6D1D]"
            />

            <p className="mt-4 text-sm text-[#77716A]">
              Preparing your legal intake...
            </p>

          </div>

        </div>

      </main>
    );
  }


  // ==========================================================
  // ERROR WITHOUT CASE
  // ==========================================================

  if (error && !caseData) {
    return (
      <main className="min-h-screen bg-[#F4F0E8]">

        <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">

          <div className="px-5 py-5 md:px-8">
            <Logo />
          </div>

        </header>


        <div className="mx-auto max-w-2xl px-5 py-20 text-center">

          <h1 className="font-serif text-2xl font-semibold">
            Unable to open intake
          </h1>

          <p className="mt-3 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/client/dashboard"
              )
            }
            className="mt-6 inline-flex items-center gap-2 bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>

        </div>

      </main>
    );
  }


  // ==========================================================
  // MAIN PAGE
  // ==========================================================

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
            Exit
          </button>

        </div>

      </header>


      <div className="mx-auto max-w-4xl px-5 py-8 md:px-8">


        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-6">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center bg-[#171717] text-white">

              <Bot size={19} />

            </div>


            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                AI Legal Intake
              </p>

              <h1 className="font-serif text-2xl font-semibold">
                Let's understand your case
              </h1>

            </div>

          </div>


          {caseData && (

            <p className="mt-4 text-sm text-[#77716A]">
              Case #{caseData.id} ·{" "}
              {caseData.case_type}
            </p>

          )}


          {/* ==================================================
              PROGRESS
          ================================================== */}

          <div className="mt-5 flex items-center justify-between border border-[#D7CFBF] bg-[#FBF9F4] px-4 py-3">

            <div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A6D1D]">
                Intake Progress
              </p>

              <p className="mt-1 text-sm text-[#55504A]">
                {Math.min(
                  questionCount,
                  10
                )}{" "}
                of 10 questions
              </p>

            </div>


            <div className="w-32 md:w-48">

              <div className="h-1.5 overflow-hidden bg-[#DED7CA]">

                <div
                  className="h-full bg-[#8A6D1D] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (questionCount / 10) *
                        100,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

          </div>

        </div>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (

          <div className="mb-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>

        )}


        {/* ==================================================
            CHAT
        ================================================== */}

        <section className="overflow-hidden border border-[#D7CFBF] bg-[#FBF9F4]">


          <div className="min-h-[55vh] max-h-[62vh] overflow-y-auto p-5 md:p-8">


            {messages.length === 0 && (

              <div className="flex justify-center py-16">

                <div className="max-w-md text-center">

                  <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                    <Bot
                      size={25}
                      className="text-[#8A6D1D]"
                    />

                  </div>


                  <h2 className="mt-5 font-serif text-xl font-semibold">
                    Tell me more about your situation
                  </h2>


                  <p className="mt-3 text-sm leading-6 text-[#77716A]">

                    I'll ask you relevant questions
                    to understand the facts of your
                    case. Answer as naturally as you
                    can.

                  </p>

                </div>

              </div>

            )}


            <div className="space-y-6">

              {messages.map(
                (item) => {

                  const isUser =
                    item.sender ===
                    "user";

                  return (

                    <div
                      key={item.id}
                      className={`flex gap-3 ${
                        isUser
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >

                      {!isUser && (

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#171717] text-white">

                          <Bot size={15} />

                        </div>

                      )}


                      <div
                        className={`max-w-[80%] px-4 py-3 text-sm leading-7 ${
                          isUser
                            ? "bg-[#171717] text-white"
                            : "border border-[#D7CFBF] bg-white text-[#55504A]"
                        }`}
                      >

                        <p className="whitespace-pre-line">
                          {item.message}
                        </p>

                      </div>


                      {isUser && (

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                          <User
                            size={15}
                            className="text-[#8A6D1D]"
                          />

                        </div>

                      )}

                    </div>

                  );
                }
              )}

            </div>


            {/* ==================================================
                AI TYPING
            ================================================== */}

            {sending && (

              <div className="mt-6 flex items-center gap-3">

                <div className="flex h-8 w-8 items-center justify-center bg-[#171717] text-white">

                  <Bot size={15} />

                </div>


                <div className="border border-[#D7CFBF] bg-white px-4 py-3">

                  <div className="flex items-center gap-2">

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8A6D1D]" />

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8A6D1D]" />

                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8A6D1D]" />

                  </div>

                </div>

              </div>

            )}


            <div ref={bottomRef} />

          </div>


          {/* ==================================================
              INPUT / COMPLETED STATE
          ================================================== */}

          {!complete && !analyzing ? (

            <div className="border-t border-[#D7CFBF] bg-[#F1ECE2] p-4 md:p-5">

              <div className="flex gap-3">

                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={
                    sending ||
                    analyzing ||
                    questionCount >= 10
                  }
                  placeholder={
                    questionCount >= 10
                      ? "Intake completed..."
                      : "Type your answer..."
                  }
                  rows={3}
                  className="min-h-[72px] flex-1 resize-none border border-[#CEC6B8] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#C9A227] disabled:bg-[#F0EBE1]"
                />


                <button
                  type="button"
                  onClick={() =>
                    void sendMessage()
                  }
                  disabled={
                    sending ||
                    analyzing ||
                    questionCount >= 10 ||
                    !message.trim()
                  }
                  className="self-end bg-[#171717] p-4 text-white transition hover:bg-[#2A2A2A] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Send message"
                >

                  {sending ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Send size={18} />
                  )}

                </button>

              </div>


              <p className="mt-2 text-[10px] text-[#8A847B]">
                Press Enter to send · Shift + Enter for a new line
              </p>

            </div>

          ) : (

            <div className="border-t border-[#D7CFBF] bg-[#F1ECE2] p-5">

              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">


                <div className="flex items-center gap-3">

                  <CheckCircle2
                    size={22}
                    className="text-[#6B7A42]"
                  />


                  <div>

                    <p className="text-sm font-semibold">

                      {analyzing
                        ? "Analyzing your case..."
                        : "Intake completed"}

                    </p>


                    <p className="text-xs text-[#77716A]">

                      {analyzing
                        ? "Our AI is reviewing your answers and preparing your case summary, next steps, and lawyer specialization."
                        : "Your 10-question intake is complete. Your case is ready for AI analysis."}

                    </p>

                  </div>

                </div>


                {analyzing ? (

                  <div className="inline-flex items-center justify-center gap-2 bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white">

                    <Loader2
                      size={15}
                      className="animate-spin"
                    />

                    Analyzing...

                  </div>

                ) : (

                  <button
                    type="button"
                    onClick={
                      finishIntake
                    }
                    className="inline-flex items-center justify-center gap-2 bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#2A2A2A]"
                  >

                    View Case Analysis

                    <ArrowRight
                      size={15}
                    />

                  </button>

                )}

              </div>

            </div>

          )}

        </section>

      </div>

    </main>
  );
}