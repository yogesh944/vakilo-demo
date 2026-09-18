import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Loader2, MessageSquare, RefreshCw, Video, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../services/api";

type AppointmentStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
interface Appointment { id: number; client_id: number; lawyer_id: number; case_id: number; appointment_time: string; status: AppointmentStatus; notes?: string | null; created_at?: string | null; updated_at?: string | null; }
interface LawyerCase { id: number; client_id: number; lawyer_id: number | null; title: string; case_type: string; status: string; }

function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
function formatStatus(status: AppointmentStatus) { return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function canJoin(appointment: Appointment) { if (!["scheduled", "ongoing"].includes(appointment.status)) return false; const t = new Date(appointment.appointment_time).getTime(); return Date.now() >= t - 10 * 60 * 1000 && Date.now() <= t + 2 * 60 * 60 * 1000; }

export default function LawyerAppointments() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [assignedCases, setAssignedCases] = useState<LawyerCase[]>([]);
  const [caseId, setCaseId] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    if (!token) { setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const [appointmentsData, casesData] = await Promise.all([
        apiRequest<Appointment[]>("/appointments", { token }),
        apiRequest<LawyerCase[]>("/lawyer/cases", { token }),
      ]);
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
      setAssignedCases(Array.isArray(casesData) ? casesData.filter((item) => item.lawyer_id != null && Number(item.lawyer_id) === Number(user?.id)) : []);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load consultations."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [token, user?.id]);

  const schedule = async () => {
    if (!token) return;
    if (!caseId || !dateTime) { setError("Select a case and agree on a date and time with the client first."); return; }
    const selected = new Date(dateTime);
    if (Number.isNaN(selected.getTime()) || selected <= new Date()) { setError("Consultation time must be in the future."); return; }
    try {
      setSaving(true); setError(""); setSuccess("");
      await apiRequest<Appointment>("/appointments", { method: "POST", token, body: { case_id: Number(caseId), appointment_time: selected.toISOString(), notes: notes.trim() || null } });
      setCaseId(""); setDateTime(""); setNotes(""); setSuccess("Consultation scheduled. Both client and lawyer have been notified."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to schedule consultation."); }
    finally { setSaving(false); }
  };

  const reschedule = async (appointment: Appointment) => {
    if (!token) return;
    const raw = window.prompt("Enter the new consultation date/time (for example: 2026-09-04 16:00):");
    if (!raw) return;
    const selected = new Date(raw.replace(" ", "T"));
    if (Number.isNaN(selected.getTime()) || selected <= new Date()) { setError("Please enter a valid future date and time."); return; }
    try {
      setProcessingId(appointment.id); setError(""); setSuccess("");
      await apiRequest<Appointment>(`/appointments/${appointment.id}`, { method: "PUT", token, body: { appointment_time: selected.toISOString() } });
      setSuccess("Consultation rescheduled. Both users have been notified."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to reschedule consultation."); }
    finally { setProcessingId(null); }
  };

  const cancel = async (appointmentId: number) => {
    if (!token || !window.confirm("Cancel this consultation?")) return;
    try {
      setProcessingId(appointmentId); setError(""); setSuccess("");
      await apiRequest<Appointment>(`/appointments/${appointmentId}/status`, { method: "PATCH", token, body: { status: "cancelled" } });
      setSuccess("Consultation cancelled."); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to cancel consultation."); }
    finally { setProcessingId(null); }
  };

  const active = useMemo(() => appointments.filter((a) => a.status === "scheduled" || a.status === "ongoing"), [appointments]);
  const history = useMemo(() => appointments.filter((a) => a.status === "completed" || a.status === "cancelled"), [appointments]);

  return (
    <main className="min-h-screen bg-[#F4F0E8] text-[#171717]"><div className="mx-auto max-w-6xl px-5 py-8 md:px-8 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-5"><div><Link to="/lawyer/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#77716A] hover:text-[#8A6D1D]"><ArrowLeft size={15}/> Back to Dashboard</Link><p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">Lawyer Portal</p><h1 className="mt-2 font-serif text-3xl font-semibold md:text-4xl">Consultations</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#66615A]">Discuss the date and time with your client in chat, then schedule the virtual consultation here. Join Video opens the consultation directly when the appointment window is available.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#C9A227] bg-[#F7F3EA] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#8A6D1D] disabled:opacity-50"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button></div>

      {error && <div className="mt-7 flex gap-3 border border-[#D9B8B8] bg-[#FBF1F1] px-5 py-4 text-sm text-[#8A3D3D]"><XCircle size={18}/>{error}</div>}
      {success && <div className="mt-7 flex gap-3 border border-[#C9A227] bg-[#F7F3EA] px-5 py-4 text-sm text-[#55504A]"><CheckCircle2 size={18} className="text-[#8A6D1D]"/>{success}</div>}

      <section className="mt-8 border border-[#D7CFBF] bg-[#FBF9F4]"><div className="border-b border-[#D7CFBF] px-6 py-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">Schedule</p><h2 className="mt-1 font-serif text-2xl font-semibold">Schedule a Consultation</h2><p className="mt-2 text-sm leading-6 text-[#77716A]">Only schedule a time after you and the client have agreed on it in chat.</p></div><div className="grid gap-4 px-6 py-6 md:grid-cols-2"><div className="md:col-span-2"><label className="text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">Assigned Case</label><select value={caseId} onChange={(e) => setCaseId(e.target.value)} disabled={saving} className="mt-2 w-full border border-[#CFC6B8] bg-white px-3 py-3 text-sm"><option value="">Select a case</option>{assignedCases.map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.title} · Client #{item.client_id}</option>)}</select></div><div><label className="text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">Agreed Date & Time</label><input type="datetime-local" min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0,16)} value={dateTime} onChange={(e) => setDateTime(e.target.value)} disabled={saving} className="mt-2 w-full border border-[#CFC6B8] bg-white px-3 py-3 text-sm"/></div><div><label className="text-[10px] font-semibold uppercase tracking-wider text-[#77716A]">Note <span className="font-normal normal-case">(optional)</span></label><input value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} placeholder="e.g. Please keep relevant documents ready." className="mt-2 w-full border border-[#CFC6B8] bg-white px-3 py-3 text-sm"/></div><div className="md:col-span-2 flex justify-end"><button type="button" onClick={() => void schedule()} disabled={saving || assignedCases.length === 0} className="inline-flex items-center gap-2 bg-[#C9A227] px-6 py-3 text-xs font-semibold uppercase tracking-wider disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin"/>}<CalendarDays size={14}/> Schedule Consultation</button></div></div></section>

      <section className="mt-8 border border-[#D7CFBF] bg-[#FBF9F4]"><div className="border-b border-[#D7CFBF] px-6 py-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">Upcoming</p><h2 className="mt-1 font-serif text-2xl font-semibold">Client Consultations</h2></div>{loading ? <div className="py-16 text-center text-sm text-[#77716A]">Loading consultations...</div> : active.length === 0 ? <div className="px-6 py-16 text-center text-sm text-[#77716A]">No scheduled consultations.</div> : <div className="divide-y divide-[#E1DBD0]">{active.map((appointment) => <article key={appointment.id} className="px-6 py-6"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="border border-[#C9A227] bg-[#F1ECE2] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#8A6D1D]">{formatStatus(appointment.status)}</span><span className="text-[10px] uppercase tracking-wider text-[#77716A]">Appointment #{appointment.id}</span></div><h3 className="mt-3 font-serif text-xl font-semibold">Client #{appointment.client_id}</h3><div className="mt-3 flex flex-wrap gap-4 text-sm text-[#55504A]"><span className="flex items-center gap-2"><CalendarDays size={15}/>{formatDateTime(appointment.appointment_time)}</span><span className="flex items-center gap-2"><MessageSquare size={15}/><button type="button" onClick={() => navigate(`/lawyer/messages?caseId=${appointment.case_id}`)} className="hover:text-[#8A6D1D]">Open Case Chat</button></span></div>{appointment.notes && <p className="mt-3 text-xs leading-5 text-[#77716A]">{appointment.notes}</p>}</div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigate(`/lawyer/messages?caseId=${appointment.case_id}`)} className="inline-flex items-center gap-2 border border-[#D7CFBF] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider"><MessageSquare size={14}/> Chat</button><button type="button" onClick={() => navigate(`/video-call?case_id=${appointment.case_id}&receiver_id=${appointment.client_id}`)} disabled={!canJoin(appointment)} className="inline-flex items-center gap-2 bg-[#171717] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40"><Video size={14}/> Join Video</button><button type="button" onClick={() => void reschedule(appointment)} disabled={processingId === appointment.id} className="border border-[#D7CFBF] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider disabled:opacity-50">Reschedule</button><button type="button" onClick={() => void cancel(appointment.id)} disabled={processingId === appointment.id} className="border border-[#D2B7B7] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#8A3D3D] disabled:opacity-50">Cancel</button></div></div></article>)}</div>}</section>

      <section className="mt-6 border border-[#D7CFBF] bg-[#FBF9F4]"><div className="border-b border-[#D7CFBF] px-6 py-5"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8A6D1D]">History</p><h2 className="mt-1 font-serif text-2xl font-semibold">Previous Consultations</h2></div>{history.length === 0 ? <div className="px-6 py-12 text-center text-sm text-[#77716A]">No previous consultations.</div> : <div className="divide-y divide-[#E1DBD0]">{history.map((a) => <div key={a.id} className="px-6 py-5 flex items-center justify-between"><div><p className="font-serif font-semibold">Client #{a.client_id}</p><p className="mt-1 text-xs text-[#77716A]">Case #{a.case_id} · {formatDateTime(a.appointment_time)}</p></div><span className="text-xs uppercase tracking-wider text-[#77716A]">{formatStatus(a.status)}</span></div>)}</div>}</section>
    </div></main>
  );
}
