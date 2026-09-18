import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  RefreshCw,
  Video,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

type AppointmentStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

interface Appointment {
  id: number;
  client_id: number;
  lawyer_id: number;
  case_id: number;
  appointment_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatStatus(status: AppointmentStatus) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isJoinable(appointment: Appointment) {
  if (!["scheduled", "ongoing"].includes(appointment.status)) return false;
  const time = new Date(appointment.appointment_time).getTime();
  const now = Date.now();
  return now >= time - 10 * 60 * 1000 && now <= time + 2 * 60 * 60 * 1000;
}

function isUpcoming(appointment: Appointment) {
  return (
    appointment.status === "scheduled" &&
    new Date(appointment.appointment_time).getTime() >= Date.now() - 2 * 60 * 60 * 1000
  );
}

export default function ClientAppointments() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [, setSelected] = useState<Appointment | null>(null);

  const loadAppointments = async (refresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const data = await apiRequest<Appointment[]>("/appointments", { token });
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load consultations.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, [token]);

  const cancelAppointment = async (appointmentId: number) => {
    if (!token) return;
    if (!window.confirm("Cancel this consultation?")) return;
    try {
      setProcessingId(appointmentId);
      setError("");
      setSuccess("");
      await apiRequest<Appointment>(`/appointments/${appointmentId}/status`, {
        method: "PATCH",
        token,
        body: { status: "cancelled" },
      });
      setSuccess("Consultation cancelled successfully.");
      setSelected(null);
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to cancel consultation.");
    } finally {
      setProcessingId(null);
    }
  };

  const upcoming = useMemo(
    () => appointments.filter(isUpcoming).sort((a, b) => new Date(a.appointment_time).getTime() - new Date(b.appointment_time).getTime()),
    [appointments]
  );
  const history = useMemo(
    () => appointments.filter((appointment) => !isUpcoming(appointment)),
    [appointments]
  );

  const joinVideo = (appointment: Appointment) => {
    if (!isJoinable(appointment)) {
      setError("The video room becomes available 10 minutes before the scheduled time.");
      return;
    }
    navigate(`/video-call?case_id=${appointment.case_id}&receiver_id=${appointment.lawyer_id}`);
  };

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]">
      <header className="border-b border-[#D7CFBF] bg-[#FBF9F4]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate("/client/dashboard")} className="flex h-10 w-10 items-center justify-center border border-[#D7CFBF] text-[#55504A] hover:bg-[#F0EBE1]" aria-label="Back to dashboard">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">Client Portal</p>
              <h1 className="font-serif text-xl font-semibold">Consultations</h1>
            </div>
          </div>
          <button type="button" onClick={() => void loadAppointments(true)} disabled={refreshing} className="flex items-center gap-2 border border-[#D7CFBF] bg-[#FBF9F4] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#55504A] hover:border-[#C9A227] disabled:opacity-50">
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 lg:py-10">
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">Your Schedule</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">Virtual Consultations</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66615A]">
            Discuss the date and time with your lawyer in chat. Once scheduled, both of you can join the same virtual consultation room.
          </p>
        </section>

        {error && <div className="mb-5 flex gap-3 border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700"><XCircle size={18} />{error}</div>}
        {success && <div className="mb-5 flex gap-3 border border-[#C9A227] bg-[#F7F3EA] px-5 py-4 text-sm text-[#55504A]"><CheckCircle2 size={18} className="text-[#8A6D1D]" />{success}</div>}

        <section className="mb-6 border border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="border-b border-[#D7CFBF] px-6 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">How it works</p>
            <h3 className="mt-1 font-serif text-xl font-semibold">Simple consultation scheduling</h3>
          </div>
          <div className="grid gap-3 px-6 py-6 md:grid-cols-3">
            {[
              ["1. Discuss in chat", "Agree on a convenient date and time with your lawyer."],
              ["2. Lawyer schedules", "The agreed time is saved as a consultation and both users are notified."],
              ["3. Join video", "Join the shared video room directly when the consultation window opens."],
            ].map(([title, text]) => (
              <div key={title} className="border border-[#E1DBD0] bg-[#F7F3EA] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">{title}</p>
                <p className="mt-2 text-xs leading-5 text-[#55504A]">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="border-b border-[#D7CFBF] px-6 py-5 flex items-center justify-between">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">Coming Up</p><h3 className="mt-1 font-serif text-xl font-semibold">Upcoming Consultations</h3></div>
            <span className="border border-[#D7CFBF] bg-[#F1ECE2] px-3 py-1 text-xs font-semibold">{upcoming.length}</span>
          </div>
          {loading ? <div className="py-16 text-center text-sm text-[#77716A]">Loading consultations...</div> : upcoming.length === 0 ? <div className="px-6 py-14 text-center text-sm text-[#77716A]">No upcoming consultations. Discuss a time with your lawyer in chat.</div> : (
            <div className="divide-y divide-[#E1DBD0]">
              {upcoming.map((appointment) => (
                <article key={appointment.id} className="px-6 py-6">
                  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#C9A227] bg-[#F1ECE2]"><CalendarDays size={20} className="text-[#8A6D1D]" /></div>
                      <div>
                        <h4 className="font-serif text-lg font-semibold">Legal Consultation</h4>
                        <p className="mt-1 text-xs text-[#77716A]">Case #{appointment.case_id} · Lawyer #{appointment.lawyer_id}</p>
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#55504A]"><span className="flex items-center gap-1.5"><CalendarDays size={14} />{formatDate(appointment.appointment_time)}</span><span className="flex items-center gap-1.5"><Clock size={14} />{formatTime(appointment.appointment_time)}</span></div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => navigate(`/client/messages?caseId=${appointment.case_id}`)} className="inline-flex items-center gap-2 border border-[#D7CFBF] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider hover:border-[#C9A227]"><MessageSquare size={14} /> Chat</button>
                      <button type="button" onClick={() => joinVideo(appointment)} className="inline-flex items-center gap-2 bg-[#171717] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white hover:bg-[#2A2A2A]"><Video size={14} /> Join Video</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 border border-[#D7CFBF] bg-[#FBF9F4]">
          <div className="border-b border-[#D7CFBF] px-6 py-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">History</p><h3 className="mt-1 font-serif text-xl font-semibold">Previous Consultations</h3></div>
          {history.length === 0 ? <div className="px-6 py-12 text-center text-sm text-[#77716A]">No previous consultations.</div> : <div className="divide-y divide-[#E1DBD0]">{history.map((appointment) => <div key={appointment.id} className="px-6 py-5"><div className="flex items-center justify-between gap-4"><div><p className="font-serif font-semibold">Consultation #{appointment.id}</p><p className="mt-1 text-xs text-[#77716A]">Case #{appointment.case_id} · {formatDate(appointment.appointment_time)} · {formatTime(appointment.appointment_time)}</p></div><span className="text-xs uppercase tracking-wider text-[#77716A]">{formatStatus(appointment.status)}</span></div></div>)}</div>}
        </section>
      </div>

    </main>
  );
}

