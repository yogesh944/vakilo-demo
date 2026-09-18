export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'lawyers'
  | 'cases'
  | 'appointments'
  | 'payments'
  | 'documents'
  | 'notifications'
  | 'video-calls'
  | 'messages'
  | 'activity'

export interface AdminDashboard {
  total_users: number;
  total_lawyers: number;
  total_cases: number;
  total_appointments: number;
  total_payments: number;
  total_documents: number;
  total_notifications: number;
  total_video_calls: number;
  total_messages: number;
}

export interface AdminActivity {
  id: number;
  activity_type: string;
  title: string;
  description: string;
  reference_id: number;
  user_id: number | null;
  created_at: string;
}

export interface PaginatedActivityResponse {
  total: number;
  page: number;
  size: number;
  pages: number;
  items: AdminActivity[];
}