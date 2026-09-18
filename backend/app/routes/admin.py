from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.models.document import DocumentCategory
from app.models.case import CaseStatus
from app.schemas.admin import (
    AdminCaseResponse,
    DashboardResponse,
    AdminUserResponse,
    AdminUserDetailResponse,
    PaginatedUsersResponse,
    PaginatedLawyersResponse,
    PaginatedCasesResponse,
    LawyerVerificationUpdate,
    LawyerUpdate,
    UserStatusUpdate,
    UserUpdate,
    CaseStatusUpdate,
    CaseAssignRequest,
    AdminCaseUpdate,
    AdminAppointmentResponse,
    PaginatedAppointmentsResponse,
    AppointmentStatusUpdate,
    AdminPaymentResponse,
    PaginatedPaymentsResponse,
    PaymentStatsResponse,
    PaymentRefundRequest,
    PaymentRefundResponse,
    AdminDocumentResponse,
    PaginatedDocumentsResponse,
    AdminNotificationResponse,
    PaginatedNotificationsResponse,
    NotificationStatsResponse,
    AdminVideoCallResponse,
    PaginatedVideoCallsResponse,
    VideoCallStatsResponse,
    AdminChatMessageResponse,
    PaginatedChatMessagesResponse,
    ChatMessageStatsResponse,
    AdminActivityResponse,
    PaginatedActivityResponse,
)
from app.services.admin_service import AdminService
from app.models.appointment import AppointmentStatus
from app.models.payment import PaymentStatus
from app.models.notification import NotificationType
from app.models.video_call import CallStatus

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# =====================================================
# Dashboard
# =====================================================

@router.get(
    "/dashboard",
    response_model=DashboardResponse,
)
def dashboard(
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):
    return AdminService.dashboard(db)


# =====================================================
# Users
# =====================================================

@router.get(
    "/users",
    response_model=PaginatedUsersResponse,
)
def get_users(
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    role: UserRole | None = None,
    active: bool | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_users(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        active=active,
    )

@router.get(
    "/users/{user_id}",
    response_model=AdminUserDetailResponse,
)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_user_by_id(
        db=db,
        user_id=user_id,
    )

@router.patch(
    "/users/{user_id}",
    response_model=AdminUserResponse,
)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):
    
    return AdminService.update_user(
        db=db,
        user_id=user_id,
        data=data,
    )

@router.delete(
    "/users/{user_id}",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.delete_user(
        db=db,
        user_id=user_id,
        current_admin=current_admin,
    )
@router.patch(
    "/users/{user_id}/status",
    response_model=AdminUserResponse,
)
def update_status(
    user_id: int,
    data: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):
    return AdminService.update_user_status(
        db=db,
        user_id=user_id,
        is_active=data.is_active,
    )


# =====================================================
# Lawyers
# =====================================================

@router.get(
    "/lawyers",
    response_model=PaginatedLawyersResponse,
)
def get_lawyers(
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    active: bool | None = None,
    verified: bool | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_lawyers(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        active=active,
        verified=verified,
    )

@router.get(
    "/lawyers/{lawyer_id}",
    response_model=AdminUserDetailResponse,
)
def get_lawyer(
    lawyer_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_lawyer_by_id(
        db=db,
        lawyer_id=lawyer_id,
    )

@router.patch(
    "/lawyers/{lawyer_id}",
    response_model=AdminUserDetailResponse,
)
def update_lawyer(
    lawyer_id: int,
    data: LawyerUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.update_lawyer(
        db=db,
        lawyer_id=lawyer_id,
        data=data,
    )

@router.patch(
    "/lawyers/{lawyer_id}/verify",
    response_model=AdminUserDetailResponse,
)
def verify_lawyer(
    lawyer_id: int,
    data: LawyerVerificationUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.verify_lawyer(
        db=db,
        lawyer_id=lawyer_id,
        is_verified=data.is_verified,
    )
@router.delete(
    "/lawyers/{lawyer_id}",
)
def delete_lawyer(
    lawyer_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.delete_lawyer(
        db=db,
        lawyer_id=lawyer_id,
        current_admin=current_admin,
    )

# =====================================================
# CASE MANAGEMENT
# =====================================================

@router.get(
    "/cases",
    response_model=PaginatedCasesResponse,
)
def get_cases(
    skip: int = 0,
    limit: int = 20,
    search: str | None = None,
    status: CaseStatus | None = None,
    case_type: str | None = None,
    lawyer_id: int | None = None,
    client_id: int | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_cases(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        case_type=case_type,
        lawyer_id=lawyer_id,
        client_id=client_id,
    )

@router.get(
    "/cases/{case_id}",
    response_model=AdminCaseResponse,
)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_case_by_id(
        db=db,
        case_id=case_id,
    )

@router.patch(
    "/cases/{case_id}/assign",
    response_model=AdminCaseResponse,
)
def assign_lawyer(
    case_id: int,
    data: CaseAssignRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):
    return AdminService.assign_lawyer(
        db=db,
        case_id=case_id,
        lawyer_id=data.lawyer_id,
    )

@router.patch(
    "/cases/{case_id}",
    response_model=AdminCaseResponse,
)
def update_case(
    case_id: int,
    data: AdminCaseUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):
    return AdminService.update_case(
        db=db,
        case_id=case_id,
        data=data,
    )

@router.patch(
    "/cases/{case_id}/status",
    response_model=AdminCaseResponse,
)
def update_case_status(
    case_id: int,
    data: CaseStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.update_case_status(
        db=db,
        case_id=case_id,
        status=data.status,
    )

# =====================================================
# APPOINTMENT MANAGEMENT
# =====================================================

@router.get(
    "/appointments",
    response_model=PaginatedAppointmentsResponse,
)
def get_appointments(
    skip: int = 0,
    limit: int = 20,
    status: AppointmentStatus | None = None,
    lawyer_id: int | None = None,
    client_id: int | None = None,
    case_id: int | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_appointments(  # type: ignore[attr-defined]
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        lawyer_id=lawyer_id,
        client_id=client_id,
        case_id=case_id,
    )
@router.get(
    "/appointments/{appointment_id}",
    response_model=AdminAppointmentResponse,
)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_appointment_by_id(  # type: ignore[attr-defined]
        db=db,
        appointment_id=appointment_id,
    )
@router.patch(
    "/appointments/{appointment_id}/status",
    response_model=AdminAppointmentResponse,
)
def update_appointment_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.update_appointment_status(  # type: ignore[attr-defined]
        db=db,
        appointment_id=appointment_id,
        status=data.status,
    )

# =====================================================
# PAYMENT MANAGEMENT
# =====================================================

@router.get(
    "/payments",
    response_model=PaginatedPaymentsResponse,
)
def get_payments(
    skip: int = 0,
    limit: int = 20,
    status: PaymentStatus | None = None,
    client_id: int | None = None,
    appointment_id: int | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_payments(
        db=db,
        skip=skip,
        limit=limit,
        status=status,
        client_id=client_id,
        appointment_id=appointment_id,
    )

@router.get(
    "/payments/stats",
    response_model=PaymentStatsResponse,
)
def get_payment_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_payment_stats(
        db=db,
    )

@router.get(
    "/payments/{payment_id}",
    response_model=AdminPaymentResponse,
)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_payment_by_id(
        db=db,
        payment_id=payment_id,
    )

@router.post(
    "/payments/{payment_id}/refund",
    response_model=PaymentRefundResponse,
)
def refund_payment(
    payment_id: int,
    data: PaymentRefundRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.refund_payment(
        db=db,
        payment_id=payment_id,
        amount=data.amount,
        reason=data.reason,
    )

# =====================================================
# DOCUMENT MANAGEMENT
# =====================================================

@router.get(
    "/documents",
    response_model=PaginatedDocumentsResponse,
)
def get_documents(
    skip: int = 0,
    limit: int = 20,
    category: DocumentCategory | None = None,
    uploaded_by: int | None = None,
    case_id: int | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_documents(
        db=db,
        skip=skip,
        limit=limit,
        category=category,
        uploaded_by=uploaded_by,
        case_id=case_id,
    )

@router.get(
    "/documents/{document_id}",
    response_model=AdminDocumentResponse,
)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_document_by_id(
        db=db,
        document_id=document_id,
    )

@router.delete(
    "/documents/{document_id}",
)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.delete_document(
        db=db,
        document_id=document_id,
    )

# =====================================================
# NOTIFICATION MANAGEMENT
# =====================================================

@router.get(
    "/notifications",
    response_model=PaginatedNotificationsResponse,
)
def get_notifications(
    skip: int = 0,
    limit: int = 20,
    user_id: int | None = None,
    notification_type: NotificationType | None = None,
    is_read: bool | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_notifications(
        db=db,
        skip=skip,
        limit=limit,
        user_id=user_id,
        notification_type=notification_type,
        is_read=is_read,
    )

@router.get(
    "/notifications/stats",
    response_model=NotificationStatsResponse,
)
def get_notification_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_notification_stats(
        db=db,
    )

@router.get(
    "/notifications/{notification_id}",
    response_model=AdminNotificationResponse,
)
def get_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_notification_by_id(
        db=db,
        notification_id=notification_id,
    )

@router.delete(
    "/notifications/{notification_id}",
)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.delete_notification(
        db=db,
        notification_id=notification_id,
    )

# =====================================================
# VIDEO CALL MANAGEMENT
# =====================================================

@router.get(
    "/video-calls",
    response_model=PaginatedVideoCallsResponse,
)
def get_video_calls(
    skip: int = 0,
    limit: int = 20,
    case_id: int | None = None,
    caller_id: int | None = None,
    receiver_id: int | None = None,
    status: CallStatus | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_video_calls(
        db=db,
        skip=skip,
        limit=limit,
        case_id=case_id,
        caller_id=caller_id,
        receiver_id=receiver_id,
        status=status,
    )
@router.get(
    "/video-calls/stats",
    response_model=VideoCallStatsResponse,
)
def get_video_call_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_video_call_stats(
        db=db,
    )

@router.get(
    "/video-calls/{call_id}",
    response_model=AdminVideoCallResponse,
)
def get_video_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_video_call_by_id(
        db=db,
        call_id=call_id,
    )

# =====================================================
# CHAT MESSAGE MANAGEMENT
# =====================================================

@router.get(
    "/messages",
    response_model=PaginatedChatMessagesResponse,
)
def get_messages(
    skip: int = 0,
    limit: int = 20,
    case_id: int | None = None,
    sender_id: int | None = None,
    receiver_id: int | None = None,
    is_read: bool | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_all_chat_messages(
        db=db,
        skip=skip,
        limit=limit,
        case_id=case_id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        is_read=is_read,
    )

@router.get(
    "/messages/stats",
    response_model=ChatMessageStatsResponse,
)
def get_chat_message_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_chat_message_stats(
        db=db,
    )

@router.get(
    "/messages/{message_id}",
    response_model=AdminChatMessageResponse,
)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_chat_message_by_id(
        db=db,
        message_id=message_id,
    )

@router.delete(
    "/messages/{message_id}",
)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.delete_chat_message(
        db=db,
        message_id=message_id,
    )

# =====================================================
# ADMIN ACTIVITY
# =====================================================

@router.get(
    "/activity",
    response_model=PaginatedActivityResponse,
)
def get_activity(
    skip: int = 0,
    limit: int = 20,
    activity_type: str | None = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(
        require_role([UserRole.ADMIN])
    ),
):

    return AdminService.get_activity(
        db=db,
        skip=skip,
        limit=limit,
        activity_type=activity_type,
    )