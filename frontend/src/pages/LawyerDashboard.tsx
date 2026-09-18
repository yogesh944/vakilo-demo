import {
  BookOpen,
  CalendarDays,
  CreditCard,
  Check,
  ChevronRight,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Users,
  Video,
  X,
  UserRound,
  Clock,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo";
import NotificationPanel from "../pages/NotificationPanel";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";


/* ============================================================
   TYPES
============================================================ */

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

  recommended_specialization:
    | string
    | null;

  ai_summary?: string | null;

  missing_documents?:
    | string
    | null;

  next_steps?: string | null;

  incident_date?:
    | string
    | null;

  incident_location?:
    | string
    | null;

  created_at: string;

  updated_at: string | null;
}


interface LawyerRequest {
  id: number;

  case_id: number;

  client_id: number;

  lawyer_id: number;

  status: string;

  client_message:
    | string
    | null;

  lawyer_message:
    | string
    | null;

  created_at: string;

  updated_at:
    | string
    | null;
}


interface AppointmentItem {
  id: number;
  client_id: number;
  lawyer_id: number;
  case_id: number;
  appointment_time: string;
  status: "pending" | "time_proposed" | "change_requested" | "payment_pending" | "confirmed" | "completed" | "cancelled" | "expired";
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}


/* ============================================================
   HELPERS
============================================================ */

function formatCaseType(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatStatus(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatUrgency(
  value: string
) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatRelativeDate(
  value: string | null
) {
  if (!value) {
    return "Not updated yet";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Recently";
  }

  const now =
    new Date();

  const difference =
    now.getTime() -
    date.getTime();

  const minutes =
    Math.floor(
      difference /
        (1000 * 60)
    );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1
        ? ""
        : "s"
    } ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1
        ? ""
        : "s"
    } ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days} day${
      days === 1
        ? ""
        : "s"
    } ago`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


/* ============================================================
   COMPONENT
============================================================ */

export default function LawyerDashboard() {

  const navigate =
    useNavigate();

  const {
    user,
    token,
  } = useAuth();


  /* ==========================================================
     UI STATE
  ========================================================== */

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    activeItem,
    setActiveItem,
  ] = useState(
    "Dashboard"
  );


  /* ==========================================================
     CASE STATE
  ========================================================== */

  const [
    cases,
    setCases,
  ] = useState<
    LawyerCase[]
  >([]);

  const [
    loadingCases,
    setLoadingCases,
  ] = useState(true);

  const [
    casesError,
    setCasesError,
  ] = useState("");


  /* ==========================================================
     REQUEST STATE
  ========================================================== */

  const [
    requests,
    setRequests,
  ] = useState<
    LawyerRequest[]
  >([]);

  const [
    loadingRequests,
    setLoadingRequests,
  ] = useState(true);

  const [
    requestsError,
    setRequestsError,
  ] = useState("");

  const [
    processingRequest,
    setProcessingRequest,
  ] = useState<
    number | null
  >(null);


  /* ==========================================================
     APPOINTMENTS
  ========================================================== */

  const [appointments, setAppointments] =
    useState<AppointmentItem[]>([]);

  const [loadingAppointments, setLoadingAppointments] =
    useState(true);

  const [appointmentsError, setAppointmentsError] =
    useState("");

  const [processingAppointment, setProcessingAppointment] =
    useState<number | null>(null);

  const [proposalAppointment, setProposalAppointment] =
    useState<number | null>(null);

  const [proposalDate, setProposalDate] = useState("");
  const [proposalTime, setProposalTime] = useState("");
  const [proposalNotes, setProposalNotes] = useState("");

  const resetProposalForm = () => {
    setProposalAppointment(null);
    setProposalDate("");
    setProposalTime("");
    setProposalNotes("");
  };

  const openProposalForm = (appointment: AppointmentItem) => {
    const date = new Date(appointment.appointment_time);

    if (!Number.isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      setProposalDate(`${year}-${month}-${day}`);
      setProposalTime(`${hours}:${minutes}`);
    } else {
      setProposalDate("");
      setProposalTime("");
    }

    setProposalNotes(appointment.notes ?? "");
    setProposalAppointment(appointment.id);
    setAppointmentsError("");
  };

  const handleProposeTime = async (appointmentId: number) => {
    if (!token) return;

    if (!proposalDate || !proposalTime) {
      setAppointmentsError("Please select both a date and a time.");
      return;
    }

    const appointmentDateTime = new Date(
      `${proposalDate}T${proposalTime}`
    );

    if (Number.isNaN(appointmentDateTime.getTime())) {
      setAppointmentsError("Please select a valid date and time.");
      return;
    }

    if (appointmentDateTime.getTime() <= Date.now()) {
      setAppointmentsError("The consultation time must be in the future.");
      return;
    }

    try {
      setProcessingAppointment(appointmentId);
      setAppointmentsError("");

      await apiRequest<AppointmentItem>(
        `/appointments/${appointmentId}/propose`,
        {
          method: "POST",
          token,
          body: {
            appointment_time: appointmentDateTime.toISOString(),
            notes: proposalNotes.trim() || null,
          },
        }
      );

      resetProposalForm();
      await loadAppointments();
    } catch (error) {
      console.error("Failed to propose consultation time:", error);
      setAppointmentsError(
        error instanceof Error
          ? error.message
          : "Unable to propose the consultation time."
      );
    } finally {
      setProcessingAppointment(null);
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!token) return;

    try {
      setProcessingAppointment(appointmentId);
      setAppointmentsError("");

      await apiRequest<AppointmentItem>(
        `/appointments/${appointmentId}/status`,
        {
          method: "PATCH",
          token,
          body: { status: "cancelled" },
        }
      );

      await loadAppointments();
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
      setAppointmentsError(
        error instanceof Error
          ? error.message
          : "Unable to cancel the appointment."
      );
    } finally {
      setProcessingAppointment(null);
    }
  };

  const loadAppointments = async () => {
    if (!token) {
      setLoadingAppointments(false);
      return;
    }

    try {
      setLoadingAppointments(true);
      setAppointmentsError("");

      const data = await apiRequest<AppointmentItem[]>(
        "/appointments",
        { token }
      );

      setAppointments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load appointments:", error);
      setAppointmentsError(
        error instanceof Error ? error.message : "Unable to load appointments."
      );
    } finally {
      setLoadingAppointments(false);
    }
  };



  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const navigation = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/lawyer/dashboard",
    },
    {
      label: "My Cases",
      icon: Gavel,
      path: "/lawyer/cases",
    },
    {
      label: "Clients",
      icon: Users,
      path: "/lawyer/clients",
    },
    {
      label: "Appointments",
      icon: CalendarDays,
      path: "/lawyer/appointments",
    },
    {
      label: "Payments",
      icon: CreditCard,
      path: "/lawyer/payments",
    },
    {
      label: "Documents",
      icon: FileText,
      path: "/lawyer/documents",
    },
    {
      label: "IPC Laws",
      icon: BookOpen,
      path: "/lawyer/ipc-laws",
    },
    {
      label: "Messages",
      icon: MessageSquare,
      path: "/lawyer/messages",
    },
    {
      label: "Video Calls",
      icon: Video,
      path: "/lawyer/video-calls",
    },
  ];


  /* ==========================================================
     LOAD ASSIGNED CASES
  ========================================================== */

  const loadCases =
    async () => {

      if (!token) {
        return;
      }

      setLoadingCases(true);
      setCasesError("");

      try {

        const data =
          await apiRequest<
            LawyerCase[]
          >(
            "/lawyer/cases",
            {
              token,
            }
          );


        setCases(
          Array.isArray(data)
            ? data
            : []
        );

      } catch (error) {

        console.error(
          "Failed to load lawyer cases:",
          error
        );


        if (
          error instanceof Error
        ) {

          setCasesError(
            error.message
          );

        } else {

          setCasesError(
            "Unable to load your cases."
          );

        }

      } finally {

        setLoadingCases(
          false
        );

      }

    };


  /* ==========================================================
     LOAD INCOMING REQUESTS
  ========================================================== */

  const loadRequests =
    async () => {

      if (!token) {
        return;
      }

      setLoadingRequests(true);
      setRequestsError("");

      try {

        const data =
          await apiRequest<
            LawyerRequest[]
          >(
            "/lawyer-requests/incoming",
            {
              token,
            }
          );


        setRequests(
          Array.isArray(data)
            ? data
            : []
        );

      } catch (error) {

        console.error(
          "Failed to load incoming lawyer requests:",
          error
        );


        if (
          error instanceof Error
        ) {

          setRequestsError(
            error.message
          );

        } else {

          setRequestsError(
            "Unable to load case requests."
          );

        }

      } finally {

        setLoadingRequests(
          false
        );

      }

    };


  /* ==========================================================
     LOAD DATA
  ========================================================== */

  useEffect(() => {

    void loadCases();

    void loadRequests();

    void loadAppointments();

  }, [token]);


  /* ==========================================================
     REQUEST CASE DETAILS
  ========================================================== */

  const [
    requestCases,
    setRequestCases,
  ] = useState<
    Record<number, LawyerCase>
  >({});


  /* ==========================================================
     LOAD CASE DETAILS FOR INCOMING REQUESTS

     Pending requests are not assigned yet, so the normal
     /cases/{caseId} endpoint may deny the lawyer access.

     The dedicated request endpoint lets the receiving lawyer
     inspect the case before accepting or rejecting it.
     ========================================================== */

  useEffect(() => {

    if (
      !token ||
      requests.length === 0
    ) {

      setRequestCases({});
      return;

    }

    let cancelled = false;

    const loadRequestCases = async () => {

      const result: Record<number, LawyerCase> = {};

      await Promise.all(
        requests
          .filter(
            (request) =>
              request.status === "pending"
          )
          .map(
            async (request) => {

              try {

                const data =
                  await apiRequest<LawyerCase>(
                    `/lawyer-requests/${request.id}/case`,
                    {
                      token,
                    }
                  );

                if (data) {

                  result[request.case_id] =
                    data;

                }

              } catch (error) {

                console.error(
                  `Unable to load case for request ${request.id}:`,
                  error
                );

              }

            }
          )
      );

      if (!cancelled) {

        setRequestCases(result);

      }

    };

    void loadRequestCases();

    return () => {

      cancelled = true;

    };

  }, [
    token,
    requests,
  ]);


  /* ==========================================================
     DASHBOARD STATISTICS
  ========================================================== */

  const activeCases =
    cases.filter(
      (item) =>
        item.status ===
          "active" ||
        item.status ===
          "lawyer_assigned"
    ).length;


  const newCases =
    cases.filter(
      (item) =>
        item.status ===
        "lawyer_assigned"
    ).length;


  const highPriorityCases =
    cases.filter(
      (item) =>
        item.urgency ===
          "high" ||
        item.urgency ===
          "emergency"
    ).length;


  const pendingRequests =
    requests.filter(
      (item) =>
        item.status ===
        "pending"
    ).length;


  /* ==========================================================
     NAVIGATION HANDLER
  ========================================================== */

  const handleNavigation = (
    label: string,
    path: string
  ) => {

    setActiveItem(label);

    setSidebarOpen(false);

    if (label === "Video Calls") {
      const activeAppointment = appointments
        .filter((appointment) => {
          const status = appointment.status.toLowerCase();
          return status === "scheduled" || status === "ongoing";
        })
        .sort(
          (a, b) =>
            new Date(a.appointment_time).getTime() -
            new Date(b.appointment_time).getTime()
        )[0];

      if (activeAppointment) {
        navigate(
          `/video-call?case_id=${activeAppointment.case_id}&receiver_id=${activeAppointment.client_id}`
        );
        return;
      }

      navigate(path);
      return;
    }


    if (
      label ===
      "Dashboard"
    ) {

      if (
        window.location.pathname !==
        "/lawyer/dashboard"
      ) {

        navigate(
          "/lawyer/dashboard"
        );

      }

      return;

    }


    navigate(path);

  };


  /* ==========================================================
     SIGN OUT
  ========================================================== */

  const handleSignOut =
    () => {

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem(
        "user"
      );

      navigate(
        "/login"
      );

    };


  /* ==========================================================
     VIEW CASE
  ========================================================== */

  const handleViewCase =
    (
      caseId: number
    ) => {

      navigate(
        `/lawyer/cases/${caseId}`
      );

    };


  /* ==========================================================
     OPEN CHAT
  ========================================================== */

  const handleOpenChat =
    (
      caseId?: number
    ) => {

      if (caseId) {

        navigate(
          `/lawyer/messages?case_id=${caseId}`
        );

      } else {

        navigate(
          "/lawyer/messages"
        );

      }

    };


  /* ==========================================================
     ACCEPT / REJECT REQUEST
  ========================================================== */

  const handleRequestDecision =
    async (
      requestId: number,
      decision:
        | "accepted"
        | "rejected"
    ) => {

      if (!token) {
        return;
      }


      setProcessingRequest(
        requestId
      );


      try {

        await apiRequest(
          `/lawyer-requests/${requestId}`,
          {
            method: "PATCH",

            token,

            body: {
              status:
                decision,
            },
          }
        );


        /*
         * Remove the request from
         * the pending list.
         */

        setRequests(
          (previous) =>
            previous.filter(
              (item) =>
                item.id !==
                requestId
            )
        );


        /*
         * Refresh assigned cases.
         * Accepted cases should now
         * appear here.
         */

        if (
          decision ===
          "accepted"
        ) {

          await loadCases();

        }

      } catch (error) {

        console.error(
          "Failed to update case request:",
          error
        );


        if (
          error instanceof Error
        ) {

          setRequestsError(
            error.message
          );

        } else {

          setRequestsError(
            "Unable to update case request."
          );

        }

      } finally {

        setProcessingRequest(
          null
        );

      }

    };


  /* ==========================================================
     RENDER
  ========================================================== */

  return (

    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">


      {/* ======================================================
          MOBILE OVERLAY
      ====================================================== */}

      {sidebarOpen && (

        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() =>
            setSidebarOpen(false)
          }
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />

      )}


      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#D7CFBF] bg-[#FBF9F4] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >


        {/* LOGO */}

        <div className="flex items-center justify-between border-b border-[#D7CFBF] px-6 py-5">

          <Logo />

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(
                false
              )
            }
            className="rounded p-2 text-[#66615A] hover:bg-[#F0EBE1] lg:hidden"
          >

            <X size={20} />

          </button>

        </div>


        {/* PORTAL HEADER */}

        <div className="border-b border-[#D7CFBF] px-6 py-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

            Lawyer Portal

          </p>


          <p className="mt-2 font-serif text-xl font-semibold">

            Welcome back

          </p>


          <p className="mt-1 text-sm text-[#77716A]">

            Manage your legal practice

          </p>

        </div>


        {/* NAVIGATION */}

        <nav className="flex-1 overflow-y-auto px-4 py-6">

          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A847B]">

            Workspace

          </p>


          <div className="space-y-1">

            {navigation.map(
              (item) => {

                const Icon =
                  item.icon;

                const isActive =
                  activeItem ===
                  item.label;


                return (

                  <button
                    key={
                      item.label
                    }
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        item.label,
                        item.path
                      )
                    }
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition ${
                      isActive
                        ? "bg-[#171717] font-semibold text-white"
                        : "text-[#55504A] hover:bg-[#F0EBE1]"
                    }`}
                  >

                    <Icon
                      size={18}
                    />

                    <span>
                      {
                        item.label
                      }
                    </span>


                    {item.label ===
                      "Dashboard" &&
                      pendingRequests >
                        0 && (

                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C9A227] px-1.5 text-[10px] font-bold text-[#171717]">

                          {
                            pendingRequests
                          }

                        </span>

                      )}

                  </button>

                );

              }
            )}

          </div>


          {/* ACCOUNT */}

          <p className="px-3 pb-3 pt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A847B]">

            Account

          </p>


          <button
            type="button"
            onClick={() => {
              setActiveItem("Settings");
              setSidebarOpen(false);
              navigate("/lawyer/profile");
            }}
            className="flex w-full items-center gap-3 px-3 py-3 text-left text-sm text-[#55504A] transition hover:bg-[#F0EBE1]"
          >

            <Settings
              size={18}
            />

            <span>
              Settings
            </span>

          </button>

        </nav>


        {/* SIGN OUT */}

        <div className="border-t border-[#D7CFBF] p-4">

          <button
            type="button"
            onClick={
              handleSignOut
            }
            className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[#55504A] transition hover:bg-[#F0EBE1]"
          >

            <LogOut
              size={18}
            />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </aside>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <div className="lg:pl-72">


        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sticky top-0 z-30 border-b border-[#D7CFBF] bg-[#FBF9F4]/95 backdrop-blur">

          <div className="flex h-20 items-center justify-between px-5 md:px-8">


            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(
                    true
                  )
                }
                className="rounded p-2 hover:bg-[#F0EBE1] lg:hidden"
              >

                <Menu
                  size={22}
                />

              </button>


              <div className="hidden sm:block">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

                  Lawyer Portal

                </p>


                <p className="font-serif text-xl font-semibold">

                  Dashboard

                </p>

              </div>

            </div>


            <div className="flex items-center gap-2 md:gap-4">

              <button
                type="button"
                className="rounded-full p-2.5 text-[#55504A] transition hover:bg-[#F0EBE1]"
              >

                <Search
                  size={19}
                />

              </button>


              <NotificationPanel
                token={token}
              />


              <div className="ml-1 hidden h-9 w-px bg-[#D7CFBF] sm:block" />


              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] font-serif font-semibold text-[#C9A227]">

                  {user?.full_name
                    ?.split(" ")
                    .map(
                      (part) =>
                        part[0]
                    )
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() ||
                    "LW"}

                </div>


                <div className="hidden md:block">

                  <p className="text-sm font-semibold">

                    {user?.full_name ||
                      "Lawyer"}

                  </p>


                  <p className="text-xs text-[#77716A]">

                    Lawyer

                  </p>

                </div>

              </div>

            </div>

          </div>

        </header>


        {/* ====================================================
            CONTENT
        ==================================================== */}

        <div className="px-5 py-8 md:px-8 lg:px-10">

          <div className="mx-auto max-w-7xl">


            {/* =================================================
                WELCOME
            ================================================= */}

            <section className="mb-8">

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

                Practice Overview

              </p>


              <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">

                Good morning
                {user?.full_name
                  ? `, ${user.full_name}.`
                  : "."}

              </h1>


              <p className="mt-2 text-sm leading-6 text-[#66615A]">

                Here's what's happening
                with your practice today.

              </p>

            </section>


            {/* =================================================
                INCOMING REQUESTS
            ================================================= */}

            <section className="mb-6 border border-[#D7CFBF] bg-[#FBF9F4]">


              <div className="flex flex-col gap-4 border-b border-[#D7CFBF] px-6 py-5 md:flex-row md:items-center md:justify-between">

                <div>

                  <div className="flex items-center gap-3">

                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

                      New Requests

                    </p>


                    {pendingRequests >
                      0 && (

                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#171717] px-2 text-[10px] font-bold text-[#C9A227]">

                        {
                          pendingRequests
                        }

                      </span>

                    )}

                  </div>


                  <h2 className="mt-1 font-serif text-xl font-semibold">

                    Incoming Case Requests

                  </h2>


                  <p className="mt-1 text-xs text-[#77716A]">

                    Review cases requested by clients before accepting them.

                  </p>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    void loadRequests()
                  }
                  className="border border-[#BEB5A5] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#55504A] hover:border-[#C9A227] hover:text-[#8A6D1D]"
                >

                  Refresh

                </button>

              </div>


              {/* REQUEST ERROR */}

              {requestsError && (

                <div className="border-b border-red-200 bg-red-50 px-6 py-4">

                  <p className="text-sm font-semibold text-red-700">

                    Unable to load requests

                  </p>


                  <p className="mt-1 text-xs text-red-600">

                    {
                      requestsError
                    }

                  </p>

                </div>

              )}


              {/* REQUEST LOADING */}

              {loadingRequests && (

                <div className="px-6 py-12 text-center">

                  <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#D7CFBF] border-t-[#8A6D1D]" />

                  <p className="mt-4 text-sm text-[#77716A]">

                    Loading incoming requests...

                  </p>

                </div>

              )}


              {/* NO REQUESTS */}

              {!loadingRequests &&
                !requestsError &&
                requests.filter(
                  (item) =>
                    item.status ===
                    "pending"
                ).length ===
                  0 && (

                  <div className="px-6 py-12 text-center">

                    <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                      <Check
                        size={20}
                        className="text-[#8A6D1D]"
                      />

                    </div>


                    <p className="mt-4 font-serif text-lg font-semibold">

                      No pending requests

                    </p>


                    <p className="mt-2 text-xs text-[#77716A]">

                      New client case requests will appear here.

                    </p>

                  </div>

                )}


              {/* REQUEST CARDS */}

              {!loadingRequests &&
                requests
                  .filter(
                    (item) =>
                      item.status ===
                      "pending"
                  )
                  .map(
                    (request) => {

                      const caseData =
                        requestCases[
                          request.case_id
                        ];


                      const isProcessing =
                        processingRequest ===
                        request.id;


                      return (

                        <div
                          key={
                            request.id
                          }
                          className="border-b border-[#E1DBD0] px-6 py-6 last:border-b-0"
                        >

                          <div className="grid gap-6 xl:grid-cols-[1fr_auto]">


                            {/* CASE INFORMATION */}

                            <div>

                              <div className="flex flex-wrap items-start gap-4">

                                <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#C9A227] bg-[#F1ECE2]">

                                  <Gavel
                                    size={19}
                                    className="text-[#8A6D1D]"
                                  />

                                </div>


                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-3">

                                    <h3 className="font-serif text-xl font-semibold">

                                      {caseData?.title ||
                                        `Case #${request.case_id}`}

                                    </h3>


                                    <span className="inline-flex items-center gap-1 border border-[#C9A227] bg-[#F1ECE2] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                                      <Clock
                                        size={11}
                                      />

                                      Pending

                                    </span>

                                  </div>


                                  <p className="mt-2 text-xs text-[#77716A]">

                                    Case #
                                    {
                                      request.case_id
                                    }

                                    {" · "}

                                    Client #
                                    {
                                      request.client_id
                                    }

                                    {caseData?.case_type &&
                                      (
                                        <>
                                          {" · "}
                                          {
                                            formatCaseType(
                                              caseData.case_type
                                            )
                                          }
                                        </>
                                      )}

                                  </p>


                                  {caseData?.legal_category && (

                                    <p className="mt-2 text-xs font-medium text-[#8A6D1D]">

                                      {
                                        caseData.legal_category
                                      }

                                    </p>

                                  )}

                                </div>

                              </div>


                              {/* CASE PREVIEW */}

                              <div className="mt-5 border border-[#D7CFBF] bg-[#F7F3EA] px-4 py-4">

                                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                                  Case Preview

                                </p>

                                <div className="mt-3 grid gap-4 md:grid-cols-2">

                                  <div>

                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8A847B]">

                                      What the case is about

                                    </p>

                                    <p className="mt-1 text-sm font-medium leading-6 text-[#55504A]">

                                      {caseData?.description

                                        ? caseData.description.length > 220

                                          ? `${caseData.description.slice(0, 220)}...`

                                          : caseData.description

                                        : "Loading case details..."}

                                    </p>

                                  </div>

                                  <div>

                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-[#8A847B]">

                                      AI Case Summary

                                    </p>

                                    <p className="mt-1 text-sm leading-6 text-[#55504A]">

                                      {caseData?.ai_summary

                                        ? caseData.ai_summary.length > 220

                                          ? `${caseData.ai_summary.slice(0, 220)}...`

                                          : caseData.ai_summary

                                        : "Loading AI case summary..."}

                                    </p>

                                  </div>

                                </div>

                              </div>


                              {/* REQUEST MESSAGE */}

                              {request.client_message && (

                                <div className="mt-5">

                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A847B]">

                                    Client Message

                                  </p>


                                  <p className="mt-2 text-sm italic leading-6 text-[#55504A]">

                                    “
                                    {
                                      request.client_message
                                    }
                                    ”

                                  </p>

                                </div>

                              )}


                              {/* META */}

                              <div className="mt-5 flex flex-wrap gap-3">

                                {caseData?.urgency && (

                                  <span
                                    className={`border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                                      caseData.urgency ===
                                        "emergency" ||
                                      caseData.urgency ===
                                        "high"
                                        ? "border-red-300 bg-red-50 text-red-700"
                                        : "border-[#D7CFBF] bg-[#F1ECE2] text-[#77716A]"
                                    }`}
                                  >

                                    Urgency:{" "}
                                    {
                                      formatUrgency(
                                        caseData.urgency
                                      )
                                    }

                                  </span>

                                )}


                                {caseData?.recommended_specialization && (

                                  <span className="border border-[#D7CFBF] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">

                                    Recommended:{" "}
                                    {
                                      caseData.recommended_specialization
                                    }

                                  </span>

                                )}

                              </div>


                              <p className="mt-4 text-[10px] text-[#8A847B]">

                                Request received{" "}

                                {
                                  formatRelativeDate(
                                    request.created_at
                                  )
                                }

                              </p>

                            </div>


                            {/* ACTIONS */}

                            <div className="flex flex-col gap-3 xl:min-w-[190px] xl:justify-center">

                              <p className="text-center text-[10px] leading-5 text-[#8A847B]">

                                Review the full case details before accepting or rejecting this request.

                              </p>

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewCase(
                                    request.case_id
                                  )
                                }
                                className="flex items-center justify-center gap-2 border border-[#C9A227] bg-[#F7F3EA] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#8A6D1D] transition hover:bg-[#F1ECE2]"
                              >

                                <FileText
                                  size={15}
                                />

                                View Full Case

                              </button>


                              <button
                                type="button"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  void handleRequestDecision(
                                    request.id,
                                    "accepted"
                                  )
                                }
                                className="flex items-center justify-center gap-2 bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#C9A227] transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <Check
                                  size={15}
                                />

                                {isProcessing
                                  ? "Processing..."
                                  : "Accept Case"}

                              </button>


                              <button
                                type="button"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  void handleRequestDecision(
                                    request.id,
                                    "rejected"
                                  )
                                }
                                className="flex items-center justify-center gap-2 border border-red-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >

                                <XCircle
                                  size={15}
                                />

                                Reject Case

                              </button>

                            </div>

                          </div>

                        </div>

                      );

                    }
                  )}

            </section>


            {/* =================================================
                STAT CARDS
            ================================================= */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">


              {/* ACTIVE CASES */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">

                    Active Cases

                  </p>


                  <Gavel
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>


                <p className="mt-5 font-serif text-4xl font-semibold">

                  {
                    activeCases
                  }

                </p>


                <p className="mt-2 text-xs text-[#77716A]">

                  {highPriorityCases >
                  0
                    ? `${highPriorityCases} need attention`
                    : "No urgent cases"}

                </p>

              </div>


              {/* CLIENTS */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">

                    Clients

                  </p>


                  <Users
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>


                <p className="mt-5 font-serif text-4xl font-semibold">

                  {
                    new Set(
                      cases.map(
                        (item) =>
                          item.client_id
                      )
                    ).size
                  }

                </p>


                <p className="mt-2 text-xs text-[#77716A]">

                  Clients with assigned cases

                </p>

              </div>


              {/* APPOINTMENTS */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4] p-5">

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">

                    Appointments

                  </p>


                  <CalendarDays
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>


                <p className="mt-5 font-serif text-4xl font-semibold">

                  {appointments.length
                    .toString()
                    .padStart(
                      2,
                      "0"
                    )}

                </p>


                <p className="mt-2 text-xs text-[#77716A]">

                  Next:{" "}

                  {
                    appointments[0]
                      ?.appointment_time
                  }

                </p>

              </div>


              {/* MESSAGES */}

              <button
                type="button"
                onClick={() =>
                  handleOpenChat()
                }
                className="border border-[#D7CFBF] bg-[#FBF9F4] p-5 text-left transition hover:border-[#C9A227]"
              >

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">

                    Messages

                  </p>


                  <MessageSquare
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>


                <p className="mt-5 font-serif text-4xl font-semibold">

                  —

                </p>


                <p className="mt-2 text-xs text-[#77716A]">

                  Open your conversations

                </p>

              </button>

            </section>


            {/* =================================================
                CASES + APPOINTMENTS
            ================================================= */}

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">


              {/* =================================================
                  RECENT CASES
              ================================================= */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4]">

                <div className="flex items-center justify-between border-b border-[#D7CFBF] px-6 py-5">

                  <div>

                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

                      Practice

                    </p>


                    <h2 className="mt-1 font-serif text-xl font-semibold">

                      Recent Cases

                    </h2>

                  </div>


                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "My Cases",
                        "/lawyer/cases"
                      )
                    }
                    className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[#8A6D1D]"
                  >

                    View All

                    <ChevronRight
                      size={15}
                    />

                  </button>

                </div>


                {/* LOADING */}

                {loadingCases && (

                  <div className="px-6 py-12 text-center">

                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#D7CFBF] border-t-[#8A6D1D]" />

                    <p className="mt-4 text-sm text-[#77716A]">

                      Loading your cases...

                    </p>

                  </div>

                )}


                {/* ERROR */}

                {!loadingCases &&
                  casesError && (

                    <div className="px-6 py-10 text-center">

                      <p className="text-sm font-semibold text-red-700">

                        Unable to load cases

                      </p>


                      <p className="mt-2 text-xs text-[#77716A]">

                        {
                          casesError
                        }

                      </p>


                      <button
                        type="button"
                        onClick={() =>
                          void loadCases()
                        }
                        className="mt-4 border border-[#BEB5A5] px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:border-[#C9A227]"
                      >

                        Retry

                      </button>

                    </div>

                  )}


                {/* EMPTY */}

                {!loadingCases &&
                  !casesError &&
                  cases.length ===
                    0 && (

                    <div className="px-6 py-12 text-center">

                      <div className="mx-auto flex h-12 w-12 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                        <Gavel
                          size={20}
                          className="text-[#8A6D1D]"
                        />

                      </div>


                      <p className="mt-4 font-serif text-lg font-semibold">

                        No assigned cases

                      </p>


                      <p className="mt-2 text-xs text-[#77716A]">

                        Accepted cases will appear here.

                      </p>

                    </div>

                  )}


                {/* CASES */}

                {!loadingCases &&
                  !casesError &&
                  cases.length >
                    0 && (

                    <div>

                      {cases
                        .slice(
                          0,
                          5
                        )
                        .map(
                          (
                            caseItem
                          ) => {

                            const status =
                              formatStatus(
                                caseItem.status
                              );


                            const type =
                              formatCaseType(
                                caseItem.case_type
                              );


                            return (

                              <div
                                key={
                                  caseItem.id
                                }
                                className="border-b border-[#E1DBD0] px-6 py-5 last:border-b-0"
                              >

                                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">


                                  <div className="flex items-start gap-4">

                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                                      <Gavel
                                        size={18}
                                        className="text-[#8A6D1D]"
                                      />

                                    </div>


                                    <div className="min-w-0">

                                      <h3 className="font-serif text-lg font-semibold">

                                        {
                                          caseItem.title
                                        }

                                      </h3>


                                      <p className="mt-1 text-xs text-[#77716A]">

                                        {
                                          type
                                        }

                                        {" · "}

                                        Client #

                                        {
                                          caseItem.client_id
                                        }

                                      </p>


                                      {caseItem.legal_category && (

                                        <p className="mt-1 truncate text-xs text-[#8A6D1D]">

                                          {
                                            caseItem.legal_category
                                          }

                                        </p>

                                      )}

                                    </div>

                                  </div>


                                  <div className="flex items-center justify-between gap-6 md:justify-end">

                                    <div className="text-left md:text-right">

                                      <span className="inline-flex border border-[#C9A227] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                                        {
                                          status
                                        }

                                      </span>


                                      <p className="mt-2 text-[10px] text-[#77716A]">

                                        Updated{" "}

                                        {
                                          formatRelativeDate(
                                            caseItem.updated_at
                                          )
                                        }

                                      </p>

                                    </div>


                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleViewCase(
                                          caseItem.id
                                        )
                                      }
                                      className="rounded p-1 hover:bg-[#F1ECE2]"
                                      title="View case"
                                    >

                                      <ChevronRight
                                        size={18}
                                        className="text-[#A39B8E]"
                                      />

                                    </button>

                                  </div>

                                </div>

                              </div>

                            );

                          }
                        )}

                    </div>

                  )}

              </div>


              {/* =================================================
                  APPOINTMENTS
              ================================================= */}

              <div className="border border-[#D7CFBF] bg-[#FBF9F4]">

                <div className="border-b border-[#D7CFBF] px-6 py-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Schedule
                  </p>
                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Upcoming Appointments
                  </h2>
                </div>

                {appointmentsError && (
                  <div className="border-b border-red-200 bg-red-50 px-6 py-3 text-xs text-red-700">
                    {appointmentsError}
                  </div>
                )}

                {loadingAppointments ? (
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#D7CFBF] border-t-[#8A6D1D]" />
                    <p className="mt-3 text-xs text-[#77716A]">Loading appointments...</p>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <CalendarDays size={24} className="mx-auto text-[#A39B8E]" />
                    <p className="mt-3 font-serif font-semibold">No appointments</p>
                    <p className="mt-1 text-xs text-[#77716A]">Accepted case consultations and proposed times will appear here.</p>
                  </div>
                ) : (
                  <div>
                    {appointments.slice(0, 5).map((appointment) => {
                      const date = new Date(appointment.appointment_time);
                      const dateText = Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                      const timeText = Number.isNaN(date.getTime()) ? "Invalid time" : date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                      const isProcessing = processingAppointment === appointment.id;

                      return (
                        <div key={appointment.id} className="border-b border-[#E1DBD0] px-6 py-5 last:border-b-0">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#C9A227] bg-[#F1ECE2]">
                                <CalendarDays size={17} className="text-[#8A6D1D]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-serif font-semibold">Consultation</p>
                                  <span
                                    className={`border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${
                                      appointment.status === "pending" ||
                                      appointment.status === "change_requested"
                                        ? "border-[#C9A227] bg-[#F1ECE2] text-[#8A6D1D]"
                                        : appointment.status === "time_proposed"
                                          ? "border-blue-200 bg-blue-50 text-blue-700"
                                          : appointment.status === "payment_pending"
                                            ? "border-purple-200 bg-purple-50 text-purple-700"
                                            : appointment.status === "confirmed"
                                              ? "border-green-200 bg-green-50 text-green-700"
                                              : appointment.status === "cancelled" ||
                                                  appointment.status === "expired"
                                                ? "border-red-200 bg-red-50 text-red-700"
                                                : "border-[#D7CFBF] bg-[#F1ECE2] text-[#77716A]"
                                    }`}
                                  >
                                    {formatStatus(appointment.status)}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-[#77716A]">Client #{appointment.client_id} · Case #{appointment.case_id}</p>
                                <p className="mt-2 text-xs font-medium text-[#55504A]">{dateText} · {timeText}</p>
                                {appointment.notes && <p className="mt-2 text-xs leading-5 text-[#77716A]">{appointment.notes}</p>}
                              </div>
                            </div>

                            {(appointment.status === "pending" ||
                              appointment.status === "change_requested") && (
                              <div className="border-t border-[#E1DBD0] pt-4">
                                {appointment.status === "change_requested" && (
                                  <div className="mb-4 border border-[#C9A227] bg-[#F7F3EA] px-4 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                                      Client Requested a Different Time
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-[#77716A]">
                                      Please choose a new consultation date and time.
                                    </p>
                                  </div>
                                )}

                                {proposalAppointment === appointment.id ? (
                                  <div className="space-y-4 border border-[#D7CFBF] bg-[#F7F3EA] p-4">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                                        {appointment.status === "change_requested"
                                          ? "Propose a New Consultation Time"
                                          : "Propose Consultation Time"}
                                      </p>
                                      <p className="mt-1 text-xs text-[#77716A]">
                                        The client will receive a notification and can accept the proposed time or request another change.
                                      </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <label className="block">
                                        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">
                                          Date
                                        </span>
                                        <input
                                          type="date"
                                          value={proposalDate}
                                          min={new Date().toISOString().split("T")[0]}
                                          onChange={(event) => setProposalDate(event.target.value)}
                                          className="w-full border border-[#BEB5A5] bg-[#FBF9F4] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
                                        />
                                      </label>

                                      <label className="block">
                                        <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">
                                          Time
                                        </span>
                                        <input
                                          type="time"
                                          value={proposalTime}
                                          onChange={(event) => setProposalTime(event.target.value)}
                                          className="w-full border border-[#BEB5A5] bg-[#FBF9F4] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
                                        />
                                      </label>
                                    </div>

                                    <label className="block">
                                      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">
                                        Note to Client
                                      </span>
                                      <textarea
                                        value={proposalNotes}
                                        onChange={(event) => setProposalNotes(event.target.value)}
                                        rows={3}
                                        placeholder="Optional message for the client..."
                                        className="w-full resize-none border border-[#BEB5A5] bg-[#FBF9F4] px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]"
                                      />
                                    </label>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                      <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={resetProposalForm}
                                        className="border border-[#BEB5A5] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#55504A] transition hover:border-[#8A6D1D] disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>

                                      <button
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => void handleProposeTime(appointment.id)}
                                        className="flex items-center justify-center gap-2 bg-[#171717] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#C9A227] transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                                      >
                                        <CalendarDays size={14} />
                                        {isProcessing
                                          ? "Sending..."
                                          : appointment.status === "change_requested"
                                            ? "Propose New Time"
                                            : "Propose Time"}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() => openProposalForm(appointment)}
                                      className="flex items-center justify-center gap-2 bg-[#171717] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#C9A227] transition hover:bg-[#292929] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <CalendarDays size={14} />
                                      {appointment.status === "change_requested"
                                        ? "Propose New Time"
                                        : "Propose Time"}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isProcessing}
                                      onClick={() => void handleCancelAppointment(appointment.id)}
                                      className="flex items-center justify-center gap-2 border border-red-200 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      <XCircle size={14} />
                                      Cancel
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {appointment.status === "time_proposed" && (
                              <div className="border-t border-[#E1DBD0] pt-4">
                                <div className="border border-[#C9A227] bg-[#F7F3EA] px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                                    Time Proposed
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-[#77716A]">
                                    Waiting for the client to accept this consultation time or request a change.
                                  </p>
                                </div>
                              </div>
                            )}

                            {appointment.status === "payment_pending" && (
                              <div className="border-t border-[#E1DBD0] pt-4">
                                <div className="border border-blue-200 bg-blue-50 px-4 py-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
                                    Payment Pending
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-blue-700/80">
                                    The client accepted the proposed time. The consultation will be confirmed after payment is verified.
                                  </p>
                                </div>
                              </div>
                            )}

                            {appointment.status === "confirmed" && (
                              <div className="border-t border-[#E1DBD0] pt-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">
                                      Consultation Available
                                    </p>
                                    <p className="mt-1 text-xs text-[#77716A]">
                                      You and the client can join the video consultation anytime.
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      navigate(
                                        `/video-call?case_id=${appointment.case_id}&receiver_id=${appointment.client_id}`
                                      )
                                    }
                                    className="flex items-center justify-center gap-2 bg-[#171717] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#C9A227] transition hover:bg-[#292929]"
                                  >
                                    <Video size={14} />
                                    Join Consultation
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="p-5">
                  <button type="button" onClick={() => handleNavigation("Appointments", "/lawyer/appointments")} className="flex w-full items-center justify-center gap-2 border border-[#BEB5A5] py-3 text-xs font-semibold uppercase tracking-wider transition hover:border-[#C9A227] hover:text-[#8A6D1D]">
                    View Calendar <ChevronRight size={15} />
                  </button>
                </div>

              </div>

            </section>

            {/* =================================================
                QUICK ACTIONS
            ================================================= */}

            <section className="mt-6 border border-[#D7CFBF] bg-[#171717] p-6 text-white md:p-8">

              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A227]">

                    Practice Tools

                  </p>


                  <h2 className="mt-2 font-serif text-2xl font-semibold md:text-3xl">

                    Stay on top of your practice.

                  </h2>


                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#BDB8AE]">

                    Review case requests, manage your cases,
                    communicate with clients, review documents,
                    and keep your appointments organized.

                  </p>

                </div>


                <div className="flex flex-col gap-3 sm:flex-row">

                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "My Cases",
                        "/lawyer/cases"
                      )
                    }
                    className="border border-[#C9A227] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#C9A227] transition hover:bg-[#C9A227] hover:text-[#171717]"
                  >

                    View Cases

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      handleOpenChat()
                    }
                    className="bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717] transition hover:bg-[#F1ECE2]"
                  >

                    Messages

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "Documents",
                        "/lawyer/documents"
                      )
                    }
                    className="border border-white px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-white hover:text-[#171717]"
                  >

                    Documents

                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      handleNavigation(
                        "Payments",
                        "/lawyer/payments"
                      )
                    }
                    className="bg-[#C9A227] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717] transition hover:bg-[#D6B43A]"
                  >

                    Payments

                  </button>

                </div>

              </div>

            </section>


            {/* =================================================
                CASE SUMMARY
            ================================================= */}

            {cases.length >
              0 && (

              <section className="mt-6 border border-[#D7CFBF] bg-[#FBF9F4] p-6">

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>

                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">

                      Assignment Summary

                    </p>


                    <h2 className="mt-1 font-serif text-xl font-semibold">

                      Your Case Portfolio

                    </h2>

                  </div>


                  <div className="grid grid-cols-4 gap-3">


                    <div className="border border-[#D7CFBF] bg-[#F1ECE2] px-4 py-3 text-center">

                      <p className="font-serif text-xl font-semibold">

                        {
                          cases.length
                        }

                      </p>

                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[#77716A]">

                        Total

                      </p>

                    </div>


                    <div className="border border-[#D7CFBF] bg-[#F1ECE2] px-4 py-3 text-center">

                      <p className="font-serif text-xl font-semibold">

                        {
                          newCases
                        }

                      </p>

                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[#77716A]">

                        Assigned

                      </p>

                    </div>


                    <div className="border border-[#D7CFBF] bg-[#F1ECE2] px-4 py-3 text-center">

                      <p className="font-serif text-xl font-semibold">

                        {
                          highPriorityCases
                        }

                      </p>

                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[#77716A]">

                        Urgent

                      </p>

                    </div>


                    <div className="border border-[#C9A227] bg-[#F1ECE2] px-4 py-3 text-center">

                      <p className="font-serif text-xl font-semibold text-[#8A6D1D]">

                        {
                          pendingRequests
                        }

                      </p>

                      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                        Requests

                      </p>

                    </div>

                  </div>

                </div>

              </section>

            )}

          </div>

        </div>

      </div>

    </main>

  );
}