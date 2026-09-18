import { Navigate, Route, Routes } from "react-router-dom";

import CaseTrackerDashboard from "./pages/CaseTrackerDashboard";
import CaselyApp from "./pages/CaselyApp";
import ClientDashboard from "./pages/ClientDashboard";
import Homepage from "./pages/Homepage";

import LawyerDashboard from "./pages/LawyerDashboard";
import LawyerProfile from "./pages/LawyerProfile";
import LawyerCaseDetails from "./pages/LawyerCaseDetails";
import LawyerAppointments from "./pages/LawyerAppointments";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

import ChatPage from "./pages/ChatPage";
import CaseDocuments from "./pages/CaseDocuments";

import StartCase from "./pages/StartCase";
import CaseIntake from "./pages/CaseIntake";
import CaseAnalysis from "./pages/CaseAnalysis";
import RecommendedLawyers from "./pages/RecommendedLawyers";
import ClientAppointments from "./pages/ClientAppointments";
import VideoCall from "./pages/VideoCall";
import ClientPayments from "./pages/ClientPayments";
import LawyerPayments from "./pages/LawyerPayments";
import ClientDocuments from "./pages/ClientDocuments";
import LawyerDocuments from "./pages/LawyerDocuments";
import LawyerIpcLaws from "./pages/LawyerIpcLaws";

// Admin Imports
import AdminRoute from "./components/admin/AdminRoute";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Users from "./pages/admin/Users";
import Lawyers from "./pages/admin/Lawyers";
import Cases from "./pages/admin/Cases";
import Appointments from "./pages/admin/Appointments";
import Payments from "./pages/admin/Payments";
import Documents from "./pages/admin/Documents";
import VideoCalls from "./pages/admin/VideoCalls";
import Messages from "./pages/admin/Messages";
import Notifications from "./pages/admin/Notifications";
import Activity from "./pages/admin/Activity";



// ============================================================
// COMING SOON PAGE
// ============================================================

function ComingSoon({
  title,
  description,
  portal = "Client Portal",
  backPath = "/client/dashboard",
}: {
  title: string;
  description: string;
  portal?: string;
  backPath?: string;
}) {
  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">

        <div className="w-full border border-[#D7CFBF] bg-[#FBF9F4] p-8 text-center md:p-12">

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">
            {portal}
          </p>

          <h1 className="mt-3 font-serif text-3xl font-semibold">
            {title}
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#66615A]">
            {description}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = backPath;
            }}
            className="mt-8 bg-[#171717] px-6 py-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A227] transition hover:bg-[#292929]"
          >
            Back to Dashboard
          </button>

        </div>

      </div>
    </main>
  );
}


// ============================================================
// APP
// ============================================================

function App() {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC ROUTES
      ===================================================== */}

      <Route
        path="/"
        element={<Homepage />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/signup"
        element={<SignupPage />}
      />


      {/* =====================================================
          CLIENT - CASE FLOW
      ===================================================== */}

      {/* Case Tracker */}
      <Route
        path="/case-tracker"
        element={<CaseTrackerDashboard />}
      />

      {/* Client Dashboard */}
      <Route
        path="/client/dashboard"
        element={<ClientDashboard />}
      />

      {/* Start New Case */}
      <Route
        path="/start-case"
        element={<StartCase />}
      />

      {/* AI Intake */}
      <Route
        path="/case-intake/:caseId"
        element={<CaseIntake />}
      />

      {/* AI Analysis / Case Summary */}
      <Route
        path="/case-analysis/:caseId"
        element={<CaseAnalysis />}
      />

      {/* Recommended Lawyers */}
      <Route
        path="/case-lawyers/:caseId"
        element={<RecommendedLawyers />}
      />

      {/* Client Appointments */}
      <Route
        path="/client/appointments"
        element={<ClientAppointments />}
      />

      {/* Client Payments */}
      <Route
        path="/client/payments"
        element={<ClientPayments />}
      />


      {/* =====================================================
          CLIENT - COMMUNICATION
      ===================================================== */}

      <Route
        path="/client/messages"
        element={<ChatPage />}
      />

      <Route
        path="/video-call"
        element={<VideoCall />}
      />


      {/* =====================================================
          CLIENT - DOCUMENTS
      ===================================================== */}

      <Route
        path="/case/documents"
        element={<CaseDocuments />}
      />

      <Route
        path="/client/documents"
        element={<ClientDocuments />}
      />

      <Route
        path="/client/ipc-laws"
        element={<LawyerIpcLaws />}
      />

      <Route
        path="/lawyer/documents"
        element={<LawyerDocuments />}
      />


      {/* =====================================================
          CLIENT - VIDEO CALLS
      ===================================================== */}

      <Route
        path="/client/video-calls"
        element={
          <ComingSoon
            title="Video Calls"
            description="Access your scheduled video consultations with your lawyer."
            portal="Client Portal"
            backPath="/client/dashboard"
          />
        }
      />


      {/* =====================================================
          CLIENT - SETTINGS
      ===================================================== */}

      <Route
        path="/client/settings"
        element={
          <ComingSoon
            title="Settings"
            description="Manage your account and client profile settings."
            portal="Client Portal"
            backPath="/client/dashboard"
          />
        }
      />


      {/* =====================================================
          LAWYER
      ===================================================== */}

      {/* Lawyer Dashboard */}
      <Route
        path="/lawyer/dashboard"
        element={<LawyerDashboard />}
      />

      <Route
        path="/lawyer/profile"
        element={<LawyerProfile />}
      />

      <Route
        path="/lawyer/ipc-laws"
        element={<LawyerIpcLaws />}
      />

      {/* Lawyer Case Details */}
      <Route
        path="/lawyer/cases/:caseId"
        element={<LawyerCaseDetails />}
      />

      {/* Lawyer Messages */}
      <Route
        path="/lawyer/messages"
        element={<ChatPage />}
      />


      {/* =====================================================
          LAWYER - MY CASES
      ===================================================== */}

      <Route
        path="/lawyer/cases"
        element={
          <ComingSoon
            title="My Cases"
            description="Your accepted and active client cases will appear here."
            portal="Lawyer Portal"
            backPath="/lawyer/dashboard"
          />
        }
      />


      {/* =====================================================
          LAWYER - CLIENTS
      ===================================================== */}

      <Route
        path="/lawyer/clients"
        element={
          <ComingSoon
            title="Clients"
            description="Manage your clients and review their case information."
            portal="Lawyer Portal"
            backPath="/lawyer/dashboard"
          />
        }
      />


      {/* =====================================================
          LAWYER - APPOINTMENTS
      ===================================================== */}

      <Route
        path="/lawyer/appointments"
        element={<LawyerAppointments />}
      />

      {/* Lawyer Payments */}
      <Route
        path="/lawyer/payments"
        element={<LawyerPayments />}
      />


      {/* =====================================================
          LAWYER - DOCUMENTS
      ===================================================== */}

      


      {/* =====================================================
          LAWYER - VIDEO CALLS
      ===================================================== */}

      <Route
        path="/lawyer/video-calls"
        element={
          <ComingSoon
            title="Video Calls"
            description="Access your scheduled video consultations."
            portal="Lawyer Portal"
            backPath="/lawyer/dashboard"
          />
        }
      />


      {/* =====================================================
          LAWYER - SETTINGS
      ===================================================== */}

      <Route
        path="/lawyer/settings"
        element={
          <ComingSoon
            title="Settings"
            description="Manage your lawyer profile and account settings."
            portal="Lawyer Portal"
            backPath="/lawyer/dashboard"
          />
        }
      />


      {/* =====================================================
          GENERAL APPLICATION
      ===================================================== */}

      <Route
        path="/app"
        element={<CaselyApp />}
      />


      {/* =====================================================
          ADMIN CONSOLE (PROTECTED)
      ===================================================== */}

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="lawyers" element={<Lawyers />} />
          <Route path="cases" element={<Cases />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="payments" element={<Payments />} />
          <Route path="documents" element={<Documents />} />
          <Route path="video-calls" element={<VideoCalls />} />
          <Route path="messages" element={<Messages />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="activity" element={<Activity />} />
        </Route>
      </Route>


      {/* =====================================================
          FALLBACK
      ===================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;