import { apiRequest } from "./api";

function getToken(): string | undefined {
  const token =
    localStorage.getItem("vakilo_access_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");
  return token && token !== "undefined" && token !== "null" ? token : undefined;
}

// ==========================================================
// TYPES
// ==========================================================

export interface DashboardStats {
  total_users: number;
  total_clients: number;
  total_lawyers: number;
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  total_appointments: number;
  pending_appointments: number;
  completed_appointments: number;
  total_payments: number;
  successful_payments: number;
  total_revenue: number;
  total_documents: number;
  total_messages: number;
  total_video_calls: number;
  total_notifications: number;
  pending_cases: number;
  cancelled_appointments: number;
  failed_payments: number;
}

export interface AdminUser {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  bar_registration_number?: string | null;
  role: "client" | "lawyer" | "admin";
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string | null;
  // Extra fields when fetching lawyer profile details
  specialization?: string | null;
  experience_years?: number | null;
  consultation_fee?: number | null;
  city?: string | null;
  state?: string | null;
  languages?: string | null;
  bio?: string | null;
  is_available?: boolean | null;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: T[];
}

export interface AdminCase {
  id: number;
  client_id: number;
  lawyer_id?: number | null;
  title: string;
  case_type: string;
  description: string;
  urgency: string;
  status: string;
  legal_category?: string | null;
  recommended_specialization?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface AdminAppointment {
  id: number;
  client_id: number;
  lawyer_id: number;
  case_id: number;
  appointment_time: string;
  status: string;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface AdminPayment {
  id: number;
  appointment_id?: number | null;
  client_id: number;
  amount: number;
  currency: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_signature?: string | null;
  status: string;
  created_at: string;
  updated_at?: string | null;
}

export interface PaymentStats {
  total_payments: number;
  successful_payments: number;
  pending_payments: number;
  failed_payments: number;
  refunded_payments: number;
  total_revenue: number;
  average_successful_payment: number;
}

export interface AdminDocument {
  id: number;
  case_id: number;
  uploaded_by: number;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  category: string;
  created_at: string;
}

export interface AdminNotification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationStats {
  total_notifications: number;
  read_notifications: number;
  unread_notifications: number;
  chat_notifications: number;
  appointment_notifications: number;
  payment_notifications: number;
  document_notifications: number;
  video_call_notifications: number;
  system_notifications: number;
}

export interface AdminVideoCall {
  id: number;
  case_id: number;
  caller_id: number;
  receiver_id: number;
  room_id: string;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
}

export interface VideoCallStats {
  total_video_calls: number;
  created_calls: number;
  ongoing_calls: number;
  ended_calls: number;
  missed_calls: number;
}

export interface AdminChatMessage {
  id: number;
  case_id: number;
  sender_id: number;
  receiver_id: number;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface ChatMessageStats {
  total_messages: number;
  read_messages: number;
  unread_messages: number;
  messages_with_attachments: number;
  messages_without_attachments: number;
}

export interface AdminActivity {
  id: number;
  activity_type: string;
  title: string;
  description: string;
  reference_id: number;
  user_id?: number | null;
  created_at: string;
}

// ==========================================================
// API CALLS
// ==========================================================

function buildQueryString(params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  }
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

// DASHBOARD
export const getAdminDashboard = async (): Promise<DashboardStats> => {
  return apiRequest<DashboardStats>("/admin/dashboard", {
    token: getToken(),
  });
};

// USERS
export const getAdminUsers = async (params: {
  skip?: number;
  limit?: number;
  search?: string;
  role?: string;
  active?: boolean;
} = {}): Promise<PaginatedResponse<AdminUser>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminUser>>(`/admin/users${qs}`, {
    token: getToken(),
  });
};

export const getAdminUserById = async (userId: number): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    token: getToken(),
  });
};

export const updateAdminUserStatus = async (
  userId: number,
  isActive: boolean
): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    token: getToken(),
    body: { is_active: isActive },
  });
};

export const updateAdminUser = async (
  userId: number,
  data: { full_name?: string; phone?: string; is_verified?: boolean }
): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/users/${userId}`, {
    method: "PATCH",
    token: getToken(),
    body: data,
  });
};

export const deleteAdminUser = async (userId: number): Promise<unknown> => {
  return apiRequest(`/admin/users/${userId}`, {
    method: "DELETE",
    token: getToken(),
  });
};

// LAWYERS
export const getAdminLawyers = async (params: {
  skip?: number;
  limit?: number;
  search?: string;
  active?: boolean;
  verified?: boolean;
} = {}): Promise<PaginatedResponse<AdminUser>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminUser>>(`/admin/lawyers${qs}`, {
    token: getToken(),
  });
};

export const getAdminLawyerById = async (lawyerId: number): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/lawyers/${lawyerId}`, {
    token: getToken(),
  });
};

export const verifyAdminLawyer = async (
  lawyerId: number,
  isVerified: boolean
): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/lawyers/${lawyerId}/verify`, {
    method: "PATCH",
    token: getToken(),
    body: { is_verified: isVerified },
  });
};

export const updateAdminLawyer = async (
  lawyerId: number,
  data: Partial<AdminUser>
): Promise<AdminUser> => {
  return apiRequest<AdminUser>(`/admin/lawyers/${lawyerId}`, {
    method: "PATCH",
    token: getToken(),
    body: data,
  });
};

export const deleteAdminLawyer = async (lawyerId: number): Promise<unknown> => {
  return apiRequest(`/admin/lawyers/${lawyerId}`, {
    method: "DELETE",
    token: getToken(),
  });
};

// CASES
export const getAdminCases = async (params: {
  skip?: number;
  limit?: number;
  search?: string;
  status?: string;
  case_type?: string;
  lawyer_id?: number;
  client_id?: number;
} = {}): Promise<PaginatedResponse<AdminCase>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminCase>>(`/admin/cases${qs}`, {
    token: getToken(),
  });
};

export const getAdminCaseById = async (caseId: number): Promise<AdminCase> => {
  return apiRequest<AdminCase>(`/admin/cases/${caseId}`, {
    token: getToken(),
  });
};

export const assignAdminCaseLawyer = async (
  caseId: number,
  lawyerId: number
): Promise<AdminCase> => {
  return apiRequest<AdminCase>(`/admin/cases/${caseId}/assign`, {
    method: "PATCH",
    token: getToken(),
    body: { lawyer_id: lawyerId },
  });
};

export const updateAdminCaseStatus = async (
  caseId: number,
  status: string
): Promise<AdminCase> => {
  return apiRequest<AdminCase>(`/admin/cases/${caseId}/status`, {
    method: "PATCH",
    token: getToken(),
    body: { status },
  });
};

export const updateAdminCase = async (
  caseId: number,
  data: Partial<AdminCase>
): Promise<AdminCase> => {
  return apiRequest<AdminCase>(`/admin/cases/${caseId}`, {
    method: "PATCH",
    token: getToken(),
    body: data,
  });
};

// APPOINTMENTS
export const getAdminAppointments = async (params: {
  skip?: number;
  limit?: number;
  status?: string;
  lawyer_id?: number;
  client_id?: number;
  case_id?: number;
} = {}): Promise<PaginatedResponse<AdminAppointment>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminAppointment>>(`/admin/appointments${qs}`, {
    token: getToken(),
  });
};

export const getAdminAppointmentById = async (
  appointmentId: number
): Promise<AdminAppointment> => {
  return apiRequest<AdminAppointment>(`/admin/appointments/${appointmentId}`, {
    token: getToken(),
  });
};

export const updateAdminAppointmentStatus = async (
  appointmentId: number,
  status: string
): Promise<AdminAppointment> => {
  return apiRequest<AdminAppointment>(`/admin/appointments/${appointmentId}/status`, {
    method: "PATCH",
    token: getToken(),
    body: { status },
  });
};

// PAYMENTS
export const getAdminPayments = async (params: {
  skip?: number;
  limit?: number;
  status?: string;
  client_id?: number;
  appointment_id?: number;
} = {}): Promise<PaginatedResponse<AdminPayment>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminPayment>>(`/admin/payments${qs}`, {
    token: getToken(),
  });
};

export const getAdminPaymentStats = async (): Promise<PaymentStats> => {
  return apiRequest<PaymentStats>("/admin/payments/stats", {
    token: getToken(),
  });
};

export const getAdminPaymentById = async (
  paymentId: number
): Promise<AdminPayment> => {
  return apiRequest<AdminPayment>(`/admin/payments/${paymentId}`, {
    token: getToken(),
  });
};

export const refundAdminPayment = async (
  paymentId: number,
  data: { amount?: number; reason?: string }
): Promise<unknown> => {
  return apiRequest(`/admin/payments/${paymentId}/refund`, {
    method: "POST",
    token: getToken(),
    body: data,
  });
};

// DOCUMENTS
export const getAdminDocuments = async (params: {
  skip?: number;
  limit?: number;
  category?: string;
  uploaded_by?: number;
  case_id?: number;
} = {}): Promise<PaginatedResponse<AdminDocument>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminDocument>>(`/admin/documents${qs}`, {
    token: getToken(),
  });
};

export const getAdminDocumentById = async (
  documentId: number
): Promise<AdminDocument> => {
  return apiRequest<AdminDocument>(`/admin/documents/${documentId}`, {
    token: getToken(),
  });
};

export const deleteAdminDocument = async (
  documentId: number
): Promise<unknown> => {
  return apiRequest(`/admin/documents/${documentId}`, {
    method: "DELETE",
    token: getToken(),
  });
};

// NOTIFICATIONS
export const getAdminNotifications = async (params: {
  skip?: number;
  limit?: number;
  user_id?: number;
  notification_type?: string;
  is_read?: boolean;
} = {}): Promise<PaginatedResponse<AdminNotification>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminNotification>>(
    `/admin/notifications${qs}`,
    {
      token: getToken(),
    }
  );
};

export const getAdminNotificationStats = async (): Promise<NotificationStats> => {
  return apiRequest<NotificationStats>("/admin/notifications/stats", {
    token: getToken(),
  });
};

export const deleteAdminNotification = async (
  notificationId: number
): Promise<unknown> => {
  return apiRequest(`/admin/notifications/${notificationId}`, {
    method: "DELETE",
    token: getToken(),
  });
};

// VIDEO CALLS
export const getAdminVideoCalls = async (params: {
  skip?: number;
  limit?: number;
  case_id?: number;
  caller_id?: number;
  receiver_id?: number;
  status?: string;
} = {}): Promise<PaginatedResponse<AdminVideoCall>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminVideoCall>>(`/admin/video-calls${qs}`, {
    token: getToken(),
  });
};

export const getAdminVideoCallStats = async (): Promise<VideoCallStats> => {
  return apiRequest<VideoCallStats>("/admin/video-calls/stats", {
    token: getToken(),
  });
};

// MESSAGES
export const getAdminMessages = async (params: {
  skip?: number;
  limit?: number;
  case_id?: number;
  sender_id?: number;
  receiver_id?: number;
  is_read?: boolean;
} = {}): Promise<PaginatedResponse<AdminChatMessage>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminChatMessage>>(`/admin/messages${qs}`, {
    token: getToken(),
  });
};

export const getAdminMessageStats = async (): Promise<ChatMessageStats> => {
  return apiRequest<ChatMessageStats>("/admin/messages/stats", {
    token: getToken(),
  });
};

// ACTIVITY
export const getAdminActivity = async (params: {
  skip?: number;
  limit?: number;
  activity_type?: string;
} = {}): Promise<PaginatedResponse<AdminActivity>> => {
  const qs = buildQueryString(params);
  return apiRequest<PaginatedResponse<AdminActivity>>(`/admin/activity${qs}`, {
    token: getToken(),
  });
};