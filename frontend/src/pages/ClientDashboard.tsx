import {
  CalendarDays,
  BookOpen,
  CreditCard,
  ChevronRight,
  FileText,
  Gavel,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Video,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../components/Logo";
import NotificationPanel from "../pages/NotificationPanel";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";


// ==========================================================
// TYPES
// ==========================================================

interface CaseItem {
  id: number;
  title: string;
  case_type: string;
  status: string;
  lawyer_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  payment_verified_at?: string | null;
}

interface AppointmentItem {
  id: number;
  case_id: number;
  lawyer_id: number;
  client_id: number;
  appointment_time: string;
  status: string;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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


// ==========================================================
// NAVIGATION
// ==========================================================

const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/client/dashboard",
  },
  {
    label: "My Cases",
    icon: Gavel,
    path: "/case-tracker",
  },
  {
    label: "Appointments",
    icon: CalendarDays,
    path: "/client/appointments",
  },
  {
    label: "Payments",
    icon: CreditCard,
    path: "/client/payments",
  },
  {
    label: "Documents",
    icon: FileText,
    path: "/client/documents",
  },
  {
    label: "IPC Laws",
    icon: BookOpen,
    path: "/client/ipc-laws",
  },
  {
    label: "Messages",
    icon: MessageSquare,
    path: "/client/messages",
  },
  {
    label: "Video Calls",
    icon: Video,
    path: "/client/video-calls",
  },
];


// ==========================================================
// HELPERS
// ==========================================================

function formatCaseType(caseType: string) {
  return caseType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatCategory(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}


function formatDate(dateString?: string | null) {
  if (!dateString) {
    return "Recently";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function formatAppointmentDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function formatAppointmentTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}


function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function getInitials(fullName?: string) {
  if (!fullName) {
    return "CL";
  }

  return fullName
    .trim()
    .split(/\s+/)
    .map((name) => name.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}


function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) {
    return "PDF";
  }

  if (fileType.includes("word")) {
    return "DOC";
  }

  if (fileType.includes("image")) {
    return "IMG";
  }

  return "FILE";
}


// ==========================================================
// COMPONENT
// ==========================================================

export default function ClientDashboard() {
  const navigate = useNavigate();

  const {
    user,
    token,
    logout,
  } = useAuth();


  // ========================================================
  // UI STATE
  // ========================================================

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [activeItem, setActiveItem] =
    useState("Dashboard");


  // ========================================================
  // CASE STATE
  // ========================================================

  const [cases, setCases] =
    useState<CaseItem[]>([]);

  const [casesLoading, setCasesLoading] =
    useState(true);

  const [casesError, setCasesError] =
    useState("");


  // ========================================================
  // APPOINTMENT STATE
  // ========================================================

  const [appointments, setAppointments] =
    useState<AppointmentItem[]>([]);

  const [
    appointmentsLoading,
    setAppointmentsLoading,
  ] = useState(true);

  const [
    appointmentsError,
    setAppointmentsError,
  ] = useState("");


  // ========================================================
  // DOCUMENT STATE
  // ========================================================

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [
    documentsLoading,
    setDocumentsLoading,
  ] = useState(true);

  const [
    documentsError,
    setDocumentsError,
  ] = useState("");


  // ==========================================================
  // LOAD CASES
  // ==========================================================

  useEffect(() => {
    const loadCases = async () => {
      if (!token) {
        setCasesLoading(false);
        return;
      }

      setCasesLoading(true);
      setCasesError("");

      try {
        const data =
          await apiRequest<CaseItem[]>(
            "/cases",
            {
              token,
            }
          );

        setCases(data);
      } catch (error) {
        if (error instanceof Error) {
          setCasesError(error.message);
        } else {
          setCasesError(
            "Unable to load your cases."
          );
        }
      } finally {
        setCasesLoading(false);
      }
    };

    void loadCases();
  }, [token]);


  // ==========================================================
  // LOAD APPOINTMENTS
  // ==========================================================

  useEffect(() => {
    const loadAppointments = async () => {
      if (!token) {
        setAppointmentsLoading(false);
        return;
      }

      setAppointmentsLoading(true);
      setAppointmentsError("");

      try {
        const data =
          await apiRequest<AppointmentItem[]>(
            "/appointments",
            {
              token,
            }
          );

        setAppointments(data);
      } catch (error) {
        if (error instanceof Error) {
          setAppointmentsError(error.message);
        } else {
          setAppointmentsError(
            "Unable to load your appointments."
          );
        }
      } finally {
        setAppointmentsLoading(false);
      }
    };

    void loadAppointments();
  }, [token]);


  // ==========================================================
  // LOAD DOCUMENTS
  // ==========================================================

  useEffect(() => {
    const loadDocuments = async () => {
      if (!token) {
        setDocumentsLoading(false);
        return;
      }

      if (casesLoading) {
        return;
      }

      if (cases.length === 0) {
        setDocuments([]);
        setDocumentsLoading(false);
        return;
      }

      setDocumentsLoading(true);
      setDocumentsError("");

      try {
        const documentResults =
          await Promise.all(
            cases.map(async (caseItem) => {
              return apiRequest<DocumentItem[]>(
                `/documents/${caseItem.id}`,
                {
                  token,
                }
              );
            })
          );

        const allDocuments =
          documentResults.flat();

        allDocuments.sort((a, b) => {
          const dateA = a.created_at
            ? new Date(a.created_at).getTime()
            : 0;

          const dateB = b.created_at
            ? new Date(b.created_at).getTime()
            : 0;

          return dateB - dateA;
        });

        setDocuments(allDocuments);
      } catch (error) {
        if (error instanceof Error) {
          setDocumentsError(error.message);
        } else {
          setDocumentsError(
            "Unable to load your documents."
          );
        }
      } finally {
        setDocumentsLoading(false);
      }
    };

    void loadDocuments();
  }, [
    token,
    cases,
    casesLoading,
  ]);


  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const activeCases =
    cases.filter(
      (caseItem) =>
        caseItem.status !== "closed"
    );


  const upcomingAppointments =
    appointments
      .filter((appointment) => {
        const status = appointment.status.toLowerCase();

        // Only active appointment states belong in the dashboard's
        // upcoming section. Expired/completed/cancelled consultations
        // should remain available from the full Appointments page.
        const activeStatus =
          status === "scheduled" ||
          status === "ongoing";

        if (!activeStatus) {
          return false;
        }

        const appointmentDate =
          new Date(
            appointment.appointment_time
          );

        return (
          !Number.isNaN(
            appointmentDate.getTime()
          ) &&
          appointmentDate >= new Date()
        );
      })
      .sort(
        (a, b) =>
          new Date(a.appointment_time).getTime() -
          new Date(b.appointment_time).getTime()
      )
      .slice(0, 5);


  // ==========================================================
  // NAVIGATION HELPERS
  // ==========================================================

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
          `/video-call?case_id=${activeAppointment.case_id}&receiver_id=${activeAppointment.lawyer_id}`
        );
        return;
      }
    }

      navigate(path);
  };


  // ==========================================================
  // CASE NAVIGATION
  // ==========================================================

  const handleCaseClick = (caseItem: CaseItem) => {
  const status = caseItem.status.toLowerCase();

  // Case is still being created/completed
  if (status === "draft" || status === "intake") {
    navigate(`/case-intake/${caseItem.id}`);
    return;
  }

  // Lawyer has been assigned or case is active
  if (
    status === "lawyer_assigned" ||
    status === "active"
  ) {
    navigate(`/case-analysis/${caseItem.id}`);
    return;
  }

  // Lawyer matching / analysis stage
  if (status === "lawyer_matching") {
    navigate(`/case-analysis/${caseItem.id}`);
    return;
  }

  // Closed case
  if (status === "closed") {
    navigate(`/case-analysis/${caseItem.id}`);
    return;
  }

  // Safe fallback
  navigate(`/case-analysis/${caseItem.id}`);
};

  // ==========================================================
  // START CASE
  // ==========================================================

  const handleStartCase = () => {
    setSidebarOpen(false);
    navigate("/start-case");
  };


  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">


      {/* ====================================================
          MOBILE OVERLAY
      ==================================================== */}

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


      {/* ====================================================
          SIDEBAR
      ==================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#D7CFBF] bg-[#FBF9F4] transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* Logo */}

        <div className="flex items-center justify-between border-b border-[#D7CFBF] px-6 py-5">

          <Logo />

          <button
            type="button"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="rounded p-2 text-[#66615A] hover:bg-[#F0EBE1] lg:hidden"
          >
            <X size={20} />
          </button>

        </div>


        {/* Portal Information */}

        <div className="border-b border-[#D7CFBF] px-6 py-6">

          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            Client Account
          </p>

          <p className="mt-2 font-serif text-xl font-semibold">
            Welcome back
          </p>

          <p className="mt-1 text-sm text-[#77716A]">
            Manage your legal journey
          </p>

        </div>


        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto px-4 py-6">

          <p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A847B]">
            Workspace
          </p>


          <div className="space-y-1">

            {navigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                activeItem ===
                item.label;

              return (
                <button
                  key={item.label}
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

                  <Icon size={18} />

                  <span>
                    {item.label}
                  </span>

                </button>
              );
            })}

          </div>


          {/* Account */}

          <p className="px-3 pb-3 pt-8 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A847B]">
            Account
          </p>


          <button
            type="button"
            onClick={() => {
              setSidebarOpen(false);
              setActiveItem("Settings");
              navigate(
                "/client/settings"
              );
            }}
            className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition ${
              activeItem === "Settings"
                ? "bg-[#171717] font-semibold text-white"
                : "text-[#55504A] hover:bg-[#F0EBE1]"
            }`}
          >

            <Settings size={18} />

            <span>
              Settings
            </span>

          </button>

        </nav>


        {/* Logout */}

        <div className="border-t border-[#D7CFBF] p-4">

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-3 text-sm text-[#55504A] transition hover:bg-[#F0EBE1]"
          >

            <LogOut size={18} />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </aside>


      {/* ====================================================
          MAIN
      ==================================================== */}

      <div className="lg:pl-72">


        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="sticky top-0 z-30 border-b border-[#D7CFBF] bg-[#FBF9F4]/95 backdrop-blur">

          <div className="flex h-20 items-center justify-between px-5 md:px-8">


            {/* Left */}

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="rounded p-2 hover:bg-[#F0EBE1] lg:hidden"
              >
                <Menu size={22} />
              </button>


              <div className="hidden sm:block">

                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                  Client Portal
                </p>

                <p className="font-serif text-xl font-semibold">
                  Dashboard
                </p>

              </div>

            </div>


            {/* Right */}

            <div className="flex items-center gap-2 md:gap-4">

              {/* Search */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/case-tracker"
                  )
                }
                aria-label="Search cases"
                className="rounded-full p-2.5 text-[#55504A] transition hover:bg-[#F0EBE1]"
              >
                <Search size={19} />
              </button>


              {/* Notifications */}

              <NotificationPanel
                token={token}
              />


              <div className="ml-1 hidden h-9 w-px bg-[#D7CFBF] sm:block" />


              {/* User */}

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171717] font-serif font-semibold text-[#C9A227]">

                  {getInitials(
                    user?.full_name
                  )}

                </div>


                <div className="hidden md:block">

                  <p className="text-sm font-semibold">
                    {user?.full_name ??
                      "Client"}
                  </p>

                  <p className="text-xs text-[#77716A]">
                    Client
                  </p>

                </div>

              </div>

            </div>

          </div>

        </header>


        {/* ==================================================
            PAGE CONTENT
        ================================================== */}

        <div className="px-5 py-8 md:px-8 lg:px-10">

          <div className="mx-auto max-w-7xl">


            {/* =================================================
                WELCOME
            ================================================= */}

            <section className="mb-8">

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                Overview
              </p>

              <h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">

                Good morning,{" "}

                {user?.full_name ??
                  "Client"}.

              </h1>

              <p className="mt-2 text-sm leading-6 text-[#66615A]">
                Here's what's happening with
                your legal matters.
              </p>

            </section>


            {/* =================================================
                STAT CARDS
            ================================================= */}

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">


              {/* Active Cases */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/case-tracker"
                  )
                }
                className="border border-[#D7CFBF] bg-[#FBF9F4] p-5 text-left transition hover:border-[#C9A227]"
              >

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

                  {casesLoading
                    ? "—"
                    : activeCases.length
                        .toString()
                        .padStart(
                          2,
                          "0"
                        )}

                </p>

                <p className="mt-2 text-xs text-[#77716A]">
                  Your current legal matters
                </p>

              </button>


              {/* Total Cases */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/case-tracker"
                  )
                }
                className="border border-[#D7CFBF] bg-[#FBF9F4] p-5 text-left transition hover:border-[#C9A227]"
              >

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">
                    Total Cases
                  </p>

                  <Gavel
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>

                <p className="mt-5 font-serif text-4xl font-semibold">

                  {casesLoading
                    ? "—"
                    : cases.length
                        .toString()
                        .padStart(
                          2,
                          "0"
                        )}

                </p>

                <p className="mt-2 text-xs text-[#77716A]">
                  Cases created by you
                </p>

              </button>


              {/* Appointments */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/client/appointments"
                  )
                }
                className="border border-[#D7CFBF] bg-[#FBF9F4] p-5 text-left transition hover:border-[#C9A227]"
              >

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

                  {appointmentsLoading
                    ? "—"
                    : upcomingAppointments.length
                        .toString()
                        .padStart(
                          2,
                          "0"
                        )}

                </p>

                <p className="mt-2 text-xs text-[#77716A]">
                  Upcoming appointments
                </p>

              </button>


              {/* Payments */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/client/payments"
                  )
                }
                className="border border-[#D7CFBF] bg-[#FBF9F4] p-5 text-left transition hover:border-[#C9A227]"
              >

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">
                    Payments
                  </p>

                  <CreditCard
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>

                <p className="mt-5 font-serif text-4xl font-semibold">
                  →
                </p>

                <p className="mt-2 text-xs text-[#77716A]">
                  View dues and payment history
                </p>

              </button>


              {/* Documents */}

              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/client/documents"
                  )
                }
                className="border border-[#D7CFBF] bg-[#FBF9F4] p-5 text-left transition hover:border-[#C9A227]"
              >

                <div className="flex items-start justify-between">

                  <p className="text-xs font-semibold uppercase tracking-wider text-[#77716A]">
                    Documents
                  </p>

                  <FileText
                    size={18}
                    className="text-[#8A6D1D]"
                  />

                </div>

                <p className="mt-5 font-serif text-4xl font-semibold">

                  {documentsLoading
                    ? "—"
                    : documents.length
                        .toString()
                        .padStart(
                          2,
                          "0"
                        )}

                </p>

                <p className="mt-2 text-xs text-[#77716A]">
                  Documents across your cases
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8A6D1D]">
                  <span>Open & Share Files</span>
                  <ChevronRight size={14} />
                </div>

              </button>

            </section>


            {/* =================================================
                RECENT CASES
            ================================================= */}

            <section className="mt-6 border border-[#D7CFBF] bg-[#FBF9F4]">

              <div className="flex items-center justify-between border-b border-[#D7CFBF] px-6 py-5">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Legal Matters
                  </p>

                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Recent Cases
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/case-tracker"
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


              {/* Error */}

              {casesError && (

                <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                  {casesError}
                </div>

              )}


              {/* Loading */}

              {casesLoading && (

                <div className="px-6 py-10 text-center text-sm text-[#77716A]">
                  Loading your cases...
                </div>

              )}


              {/* Empty */}

              {!casesLoading &&
                !casesError &&
                cases.length === 0 && (

                  <div className="px-6 py-12 text-center">

                    <Gavel
                      size={30}
                      className="mx-auto text-[#A39B8E]"
                    />

                    <p className="mt-4 font-serif text-lg font-semibold">
                      No cases yet
                    </p>

                    <p className="mt-2 text-sm text-[#77716A]">
                      Your cases will appear here
                      once you create one.
                    </p>

                    <button
                      type="button"
                      onClick={
                        handleStartCase
                      }
                      className="mt-5 bg-[#171717] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white"
                    >
                      Start a Case
                    </button>

                  </div>

                )}


              {/* Case List */}

              {!casesLoading &&
                cases.length > 0 && (

                  <div>

                    {cases
                      .slice(0, 5)
                      .map((caseItem) => (

                        <div
                          key={caseItem.id}
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            handleCaseClick(
                              caseItem
                            )
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" ||
                              event.key === " "
                            ) {
                              event.preventDefault();
                              handleCaseClick(caseItem);
                            }
                          }}
                          className="w-full cursor-pointer border-b border-[#E1DBD0] px-6 py-5 text-left transition hover:bg-[#F5F1E9] last:border-b-0"
                        >

                          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

                            <div className="flex items-start gap-4">

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                                <Gavel
                                  size={18}
                                  className="text-[#8A6D1D]"
                                />

                              </div>


                              <div>

                                <h3 className="font-serif text-lg font-semibold">
                                  {caseItem.title}
                                </h3>

                                <p className="mt-1 text-xs text-[#77716A]">

                                  {formatCaseType(
                                    caseItem.case_type
                                  )}

                                  {" · "}

                                  Case #
                                  {caseItem.id}

                                </p>

                              </div>

                            </div>


                            <div className="flex flex-wrap items-center justify-end gap-3">

                              <div className="text-left md:text-right">

                                <span className="inline-flex border border-[#C9A227] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                                  {formatStatus(
                                    caseItem.status
                                  )}

                                </span>

                                <p className="mt-2 text-[10px] text-[#77716A]">

                                  Updated{" "}

                                  {formatDate(
                                    caseItem.updated_at ??
                                      caseItem.created_at
                                  )}

                                </p>

                              </div>

                              {caseItem.lawyer_id &&
                                (
                                  caseItem.status ===
                                    "lawyer_assigned" ||
                                  caseItem.status ===
                                    "active"
                                ) && (

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    navigate(
                                      `/client/appointments?caseId=${caseItem.id}`
                                    );
                                  }}
                                  className="border border-[#C9A227] bg-[#F7F3EA] px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D] transition hover:bg-[#F1ECE2]"
                                >
                                  Book Consultation
                                </button>

                              )}

                              <ChevronRight
                                size={18}
                                className="text-[#A39B8E]"
                              />

                            </div>

                          </div>

                        </div>

                      ))}

                  </div>

                )}

            </section>


            {/* =================================================
                UPCOMING APPOINTMENTS
            ================================================= */}

            <section className="mt-6 border border-[#D7CFBF] bg-[#FBF9F4]">

              <div className="flex items-center justify-between border-b border-[#D7CFBF] px-6 py-5">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Schedule
                  </p>

                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Upcoming Appointments
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/client/appointments"
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


              {/* Error */}

              {appointmentsError && (

                <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                  {appointmentsError}
                </div>

              )}


              {/* Loading */}

              {appointmentsLoading && (

                <div className="px-6 py-10 text-center text-sm text-[#77716A]">
                  Loading your appointments...
                </div>

              )}


              {/* Empty */}

              {!appointmentsLoading &&
                !appointmentsError &&
                upcomingAppointments.length ===
                  0 && (

                  <div className="px-6 py-12 text-center">

                    <CalendarDays
                      size={30}
                      className="mx-auto text-[#A39B8E]"
                    />

                    <p className="mt-4 font-serif text-lg font-semibold">
                      No upcoming appointments
                    </p>

                    <p className="mt-2 text-sm text-[#77716A]">
                      Your scheduled appointments
                      will appear here.
                    </p>

                  </div>

                )}


              {/* Appointment List */}

              {!appointmentsLoading &&
                upcomingAppointments.length >
                  0 && (

                  <div>

                    {upcomingAppointments.map(
                      (appointment) => (

                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/client/appointments?caseId=${appointment.case_id}`
                            )
                          }
                          className="w-full border-b border-[#E1DBD0] px-6 py-5 text-left transition hover:bg-[#F5F1E9] last:border-b-0"
                        >

                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                            <div className="flex items-start gap-4">

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#C9A227] bg-[#F1ECE2]">

                                <CalendarDays
                                  size={18}
                                  className="text-[#8A6D1D]"
                                />

                              </div>


                              <div>

                                <h3 className="font-serif text-lg font-semibold">
                                  Legal Consultation
                                </h3>

                                <p className="mt-1 text-xs text-[#77716A]">
                                  Case #
                                  {
                                    appointment.case_id
                                  }
                                </p>

                                <p className="mt-2 text-sm text-[#55504A]">

                                  {formatAppointmentDate(
                                    appointment.appointment_time
                                  )}

                                  {" · "}

                                  {formatAppointmentTime(
                                    appointment.appointment_time
                                  )}

                                </p>


                                {appointment.notes && (

                                  <p className="mt-2 text-xs text-[#77716A]">
                                    {appointment.notes}
                                  </p>

                                )}

                              </div>

                            </div>


                            <div className="text-right">

                              <span className="inline-flex border border-[#C9A227] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">

                                {formatStatus(
                                  appointment.status
                                )}

                              </span>
                            </div>

                          </div>

                        </button>

                      )
                    )}

                  </div>

                )}

            </section>


            {/* =================================================
                DOCUMENTS
            ================================================= */}

            <section className="mt-6 border border-[#D7CFBF] bg-[#FBF9F4]">

              <div className="flex items-center justify-between border-b border-[#D7CFBF] px-6 py-5">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
                    Case Files
                  </p>

                  <h2 className="mt-1 font-serif text-xl font-semibold">
                    Recent Documents
                  </h2>

                </div>


                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/client/documents"
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


              {/* Error */}

              {documentsError && (

                <div className="border-b border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
                  {documentsError}
                </div>

              )}


              {/* Loading */}

              {documentsLoading && (

                <div className="px-6 py-10 text-center text-sm text-[#77716A]">
                  Loading your documents...
                </div>

              )}


              {/* Empty */}

              {!documentsLoading &&
                !documentsError &&
                documents.length === 0 && (

                  <div className="px-6 py-12 text-center">

                    <FileText
                      size={30}
                      className="mx-auto text-[#A39B8E]"
                    />

                    <p className="mt-4 font-serif text-lg font-semibold">
                      No documents yet
                    </p>

                    <p className="mt-2 text-sm text-[#77716A]">
                      Documents uploaded to your
                      cases will appear here.
                    </p>

                  </div>

                )}


              {/* Document List */}

              {!documentsLoading &&
                documents.length > 0 && (

                  <div>

                    {documents
                      .slice(0, 5)
                      .map((document) => (

                        <button
                          key={document.id}
                          type="button"
                          onClick={() =>
                            navigate(
                              `/client/documents?caseId=${document.case_id}`
                            )
                          }
                          className="w-full border-b border-[#E1DBD0] px-6 py-5 text-left transition hover:bg-[#F5F1E9] last:border-b-0"
                        >

                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                            <div className="flex items-center gap-4">

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#D7CFBF] bg-[#F1ECE2]">

                                <FileText
                                  size={18}
                                  className="text-[#8A6D1D]"
                                />

                              </div>


                              <div className="min-w-0">

                                <h3 className="truncate font-serif text-lg font-semibold">
                                  {
                                    document.file_name
                                  }
                                </h3>


                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#77716A]">

                                  <span>
                                    Case #
                                    {
                                      document.case_id
                                    }
                                  </span>

                                  <span>
                                    ·
                                  </span>

                                  <span>
                                    {
                                      formatCategory(
                                        document.category
                                      )
                                    }
                                  </span>

                                  <span>
                                    ·
                                  </span>

                                  <span>
                                    {
                                      formatFileSize(
                                        document.file_size
                                      )
                                    }
                                  </span>

                                </div>

                              </div>

                            </div>


                            <div className="flex items-center gap-4">

                              <span className="border border-[#D7CFBF] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">

                                {getFileIcon(
                                  document.file_type
                                )}

                              </span>

                              <span className="text-xs text-[#77716A]">

                                {formatDate(
                                  document.created_at
                                )}

                              </span>

                            </div>

                          </div>

                        </button>

                      ))}

                  </div>

                )}

            </section>


            {/* =================================================
                QUICK ACTION
            ================================================= */}

            <section className="mt-6 border border-[#D7CFBF] bg-[#171717] p-6 text-white md:p-8">

              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">

                <div>

                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A227]">
                    Need Legal Help?
                  </p>

                  <h2 className="mt-2 font-serif text-2xl font-semibold md:text-3xl">
                    Take the next step with confidence.
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#BDB8AE]">
                    Start a new case and tell us
                    about your legal concern.
                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    handleStartCase
                  }
                  className="w-fit bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#171717] transition hover:bg-[#F1ECE2]"
                >
                  Start a Case
                </button>

              </div>

            </section>

          </div>

        </div>

      </div>

    </main>
  );
}