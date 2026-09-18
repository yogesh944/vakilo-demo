from pydantic import BaseModel
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.document import DocumentCategory
from app.models.notification import NotificationType

from app.models.video_call import CallStatus

from app.models.user import UserRole
from app.models.case import CaseStatus
from app.models.appointment import AppointmentStatus
from app.models.case import (
    CaseType,
    CaseUrgency,
)


class DashboardResponse(BaseModel):
    total_users: int
    total_clients: int
    total_lawyers: int

    total_cases: int
    active_cases: int
    closed_cases: int

    total_appointments: int
    pending_appointments: int
    completed_appointments: int

    total_payments: int
    successful_payments: int
    total_revenue: float

    total_documents: int

    total_messages: int

    total_video_calls: int

    total_notifications: int
    pending_cases: int
    cancelled_appointments: int
    failed_payments: int

class AdminUserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str | None = None
    bar_registration_number: str | None = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

from pydantic import BaseModel

class PaginatedUsersResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminUserResponse]


class AdminUserDetailResponse(AdminUserResponse):
    updated_at: datetime | None = None


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    is_verified: bool | None = None

    model_config = ConfigDict(
        extra="forbid"
    )

class LawyerVerificationUpdate(BaseModel):
    is_verified: bool


class PaginatedLawyersResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminUserResponse]

class LawyerUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None

    specialization: str | None = None
    experience_years: int | None = None
    consultation_fee: float | None = None

    city: str | None = None
    state: str | None = None
    languages: str | None = None
    bio: str | None = None

    is_available: bool | None = None
    is_verified: bool | None = None

    model_config = ConfigDict(
        extra="forbid"
    )

class AdminCaseResponse(BaseModel):
    id: int
    client_id: int
    lawyer_id: int | None = None
    title: str
    case_type: str
    description: str
    urgency: str
    status: str
    legal_category: str | None = None
    recommended_specialization: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedCasesResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminCaseResponse]

class CaseAssignRequest(BaseModel):
    lawyer_id: int

class CaseStatusUpdate(BaseModel):
    status: CaseStatus

class AdminCaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    case_type: CaseType | None = None
    urgency: CaseUrgency | None = None
    legal_category: str | None = None
    recommended_specialization: str | None = None
    missing_documents: str | None = None
    next_steps: str | None = None
    incident_date: datetime | None = None
    incident_location: str | None = None

    model_config = ConfigDict(
        extra="forbid"
    )

class AdminAppointmentResponse(BaseModel):
    id: int
    client_id: int
    lawyer_id: int
    case_id: int
    appointment_time: datetime
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedAppointmentsResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminAppointmentResponse]

class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus

class AdminPaymentResponse(BaseModel):
    id: int
    appointment_id: int | None = None
    client_id: int
    amount: float
    currency: str
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    razorpay_signature: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedPaymentsResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminPaymentResponse]

class PaymentStatsResponse(BaseModel):
    total_payments: int
    successful_payments: int
    pending_payments: int
    failed_payments: int
    refunded_payments: int
    total_revenue: float
    average_successful_payment: float

class PaymentRefundRequest(BaseModel):
    amount: float | None = None
    reason: str | None = None

class PaymentRefundResponse(BaseModel):
    payment_id: int
    razorpay_payment_id: str
    refund_id: str
    refund_amount: float
    currency: str
    status: str
    message: str

class AdminDocumentResponse(BaseModel):
    id: int
    case_id: int
    uploaded_by: int
    file_name: str
    storage_path: str
    file_type: str
    file_size: int
    category: DocumentCategory
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedDocumentsResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminDocumentResponse]

class AdminNotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: NotificationType
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedNotificationsResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminNotificationResponse]

class NotificationStatsResponse(BaseModel):
    total_notifications: int
    read_notifications: int
    unread_notifications: int
    chat_notifications: int
    appointment_notifications: int
    payment_notifications: int
    document_notifications: int
    video_call_notifications: int
    system_notifications: int

class AdminVideoCallResponse(BaseModel):
    id: int
    case_id: int
    caller_id: int
    receiver_id: int
    room_id: str
    status: CallStatus
    started_at: datetime | None = None
    ended_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedVideoCallsResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminVideoCallResponse]

class VideoCallStatsResponse(BaseModel):
    total_video_calls: int
    created_calls: int
    ongoing_calls: int
    ended_calls: int
    missed_calls: int

class AdminChatMessageResponse(BaseModel):
    id: int
    case_id: int
    sender_id: int
    receiver_id: int
    attachment_url: str | None = None
    attachment_name: str | None = None
    attachment_type: str | None = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedChatMessagesResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminChatMessageResponse]

class ChatMessageStatsResponse(BaseModel):
    total_messages: int
    read_messages: int
    unread_messages: int
    messages_with_attachments: int
    messages_without_attachments: int

class AdminActivityResponse(BaseModel):
    id: int
    activity_type: str
    title: str
    description: str
    reference_id: int
    user_id: int | None = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class PaginatedActivityResponse(BaseModel):
    total: int
    page: int
    size: int
    pages: int
    items: list[AdminActivityResponse]