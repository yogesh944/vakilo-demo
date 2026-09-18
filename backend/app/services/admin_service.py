from math import ceil

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
import razorpay
from datetime import datetime

from app.core.config import settings
from app.core.supabase import supabase

from app.models.appointment import Appointment, AppointmentStatus
from app.models.case import Case, CaseStatus
from app.models.chat import ChatMessage
from app.models.document import (
    Document,
    DocumentCategory,
)
from app.models.notification import Notification, NotificationType
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from app.models.video_call import (
    CallStatus,
    VideoCall,
)
from app.models.lawyer_profile import LawyerProfile
from app.services.notification_service import NotificationService
from app.schemas.admin import (
    AdminCaseResponse,
    AdminUserResponse,
    DashboardResponse,
    AdminPaymentResponse,
    PaginatedCasesResponse,
    PaginatedLawyersResponse,
    PaginatedUsersResponse,
    AdminUserDetailResponse,
    AdminCaseUpdate,
    CaseAssignRequest,
    AdminAppointmentResponse,
    PaymentStatsResponse,
    PaymentRefundResponse,
    PaginatedAppointmentsResponse,
    PaginatedPaymentsResponse,
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


class AdminService:

    # =====================================================
    # DASHBOARD
    # =====================================================

    @staticmethod
    def dashboard(db: Session) -> DashboardResponse:

        # -----------------------------
        # Users
        # -----------------------------
        total_users = db.query(User).count()

        total_clients = (
            db.query(User)
            .filter(User.role == UserRole.CLIENT)
            .count()
        )

        total_lawyers = (
            db.query(User)
            .filter(User.role == UserRole.LAWYER)
            .count()
        )

        # -----------------------------
        # Cases
        # -----------------------------
        total_cases = db.query(Case).count()

        pending_cases = (
            db.query(Case)
            .filter(
                Case.status.in_(
                    [
                        CaseStatus.DRAFT,
                        CaseStatus.INTAKE,
                        CaseStatus.LAWYER_MATCHING,
                        CaseStatus.LAWYER_ASSIGNED,
                    ]
                )
            )
            .count()
        )

        active_cases = (
            db.query(Case)
            .filter(Case.status == CaseStatus.ACTIVE)
            .count()
        )

        closed_cases = (
            db.query(Case)
            .filter(Case.status == CaseStatus.CLOSED)
            .count()
        )

        # -----------------------------
        # Appointments
        # -----------------------------
        total_appointments = db.query(Appointment).count()

        pending_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.status.in_(
                    [
                        AppointmentStatus.SCHEDULED,
                        AppointmentStatus.ONGOING,
                    ]
                )
            )
            .count()
        )

        completed_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.status == AppointmentStatus.COMPLETED
            )
            .count()
        )

        cancelled_appointments = (
            db.query(Appointment)
            .filter(
                Appointment.status == AppointmentStatus.CANCELLED
            )
            .count()
        )

        # -----------------------------
        # Payments
        # -----------------------------
        total_payments = db.query(Payment).count()

        successful_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.SUCCESS.value
            )
            .count()
        )

        failed_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.FAILED.value
            )
            .count()
        )

        total_revenue = (
            db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == PaymentStatus.SUCCESS.value
            )
            .scalar()
        )

        # -----------------------------
        # Other Modules
        # -----------------------------
        total_documents = db.query(Document).count()

        total_messages = db.query(ChatMessage).count()

        total_video_calls = db.query(VideoCall).count()

        total_notifications = db.query(Notification).count()

        # -----------------------------
        # Dashboard Response
        # -----------------------------
        return DashboardResponse(
            total_users=total_users,
            total_clients=total_clients,
            total_lawyers=total_lawyers,

            total_cases=total_cases,
            pending_cases=pending_cases,
            active_cases=active_cases,
            closed_cases=closed_cases,

            total_appointments=total_appointments,
            pending_appointments=pending_appointments,
            completed_appointments=completed_appointments,
            cancelled_appointments=cancelled_appointments,

            total_payments=total_payments,
            successful_payments=successful_payments,
            failed_payments=failed_payments,
            total_revenue=float(total_revenue or 0),

            total_documents=total_documents,
            total_messages=total_messages,
            total_video_calls=total_video_calls,
            total_notifications=total_notifications,
        )

    # =====================================================
    # USER MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_users(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        role: UserRole | None = None,
        active: bool | None = None,
    ) -> PaginatedUsersResponse:

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0."
            )

        query = db.query(User)

        # -----------------------------
        # Search
        # -----------------------------
        if search:

            query = query.filter(
                (User.full_name.ilike(f"%{search}%"))
                | (User.email.ilike(f"%{search}%"))
                | (User.phone.ilike(f"%{search}%"))
            )

        # -----------------------------
        # Role Filter
        # -----------------------------
        if role:

            query = query.filter(
                User.role == role
            )

        # -----------------------------
        # Active Filter
        # -----------------------------
        if active is not None:

            query = query.filter(
                User.is_active == active
            )

        total = query.count()

        users = (
            query
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        user_items = [
            AdminUserResponse.model_validate(user)
            for user in users
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedUsersResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=user_items,
        )

    # =====================================================
    # CASE MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_cases(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        status: CaseStatus | None = None,
        case_type: str | None = None,
        lawyer_id: int | None = None,
        client_id: int | None = None,
    ) -> PaginatedCasesResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(Case)

        # -----------------------------
        # Search
        # -----------------------------
        if search:
            query = query.filter(
                Case.title.ilike(f"%{search}%")
                | Case.description.ilike(f"%{search}%")
                | Case.legal_category.ilike(f"%{search}%")
            )

        # -----------------------------
        # Status Filter
        # -----------------------------
        if status is not None:
            query = query.filter(
                Case.status == status
            )

        # -----------------------------
        # Case Type Filter
        # -----------------------------
        if case_type is not None:
            query = query.filter(
                Case.case_type == case_type
            )

        # -----------------------------
        # Lawyer Filter
        # -----------------------------
        if lawyer_id is not None:
            query = query.filter(
                Case.lawyer_id == lawyer_id
            )

        # -----------------------------
        # Client Filter
        # -----------------------------
        if client_id is not None:
            query = query.filter(
                Case.client_id == client_id
            )

        total = query.count()

        cases = (
            query
            .order_by(Case.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        case_items = [
            AdminCaseResponse.model_validate(case)
            for case in cases
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedCasesResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=case_items,
        )

    @staticmethod
    def get_case_by_id(
        db: Session,
        case_id: int,
    ) -> AdminCaseResponse:

        case = (
            db.query(Case)
            .filter(Case.id == case_id)
            .first()
        )

        if not case:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        return AdminCaseResponse.model_validate(case)

    @staticmethod
    def get_user_by_id(
        db: Session,
        user_id: int,
    ):

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        return AdminUserDetailResponse.model_validate(user)

    @staticmethod
    def update_user(
        db: Session,
        user_id: int,
        data,
    ) -> AdminUserResponse:

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(user, field, value)

        db.commit()
        db.refresh(user)

        return AdminUserResponse.model_validate(user)

    @staticmethod
    def assign_lawyer(
        db: Session,
        case_id: int,
        lawyer_id: int,
    ) -> AdminCaseResponse:

        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        lawyer = (
            db.query(User)
            .filter(User.id == lawyer_id, User.role == UserRole.LAWYER)
            .first()
        )
        if not lawyer:
            raise HTTPException(status_code=404, detail="Lawyer not found.")
        if lawyer.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="Cannot assign case to an inactive lawyer.",
            )
        if lawyer.is_verified is False:
            raise HTTPException(
                status_code=400,
                detail="Cannot assign case to an unverified lawyer.",
            )

        setattr(case, "lawyer_id", lawyer_id)
        setattr(case, "status", CaseStatus.LAWYER_ASSIGNED)
        db.commit()
        db.refresh(case)

        NotificationService.create_notification(
            db=db,
            user_id=lawyer_id,
            title="New Case Assigned",
            message=f"You have been assigned case #{case.id}.",
            notification_type=NotificationType.SYSTEM,
        )

        return AdminCaseResponse.model_validate(case)

    @staticmethod
    def update_case_status(
        db: Session,
        case_id: int,
        status: CaseStatus,
    ) -> AdminCaseResponse:

        case = db.query(Case).filter(Case.id == case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found.")

        if status == CaseStatus.LAWYER_ASSIGNED and case.lawyer_id is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot set status to lawyer_assigned without assigning a lawyer.",
            )
        if status == CaseStatus.ACTIVE and case.lawyer_id is None:
            raise HTTPException(
                status_code=400,
                detail="Cannot activate a case without an assigned lawyer.",
            )

        setattr(
            case,
            "status",
            status.value if isinstance(status, CaseStatus) else str(status),
        )
        db.commit()
        db.refresh(case)

        return AdminCaseResponse.model_validate(case)

    @staticmethod
    def delete_user(
        db: Session,
        user_id: int,
        current_admin: User,
    ):
        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        current_admin_id = getattr(current_admin, "id", None)

        if user.id == current_admin_id:
            raise HTTPException(
                status_code=400,
                detail="You cannot delete your own account."
            )

        if user.role is UserRole.ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Admin accounts cannot be deleted."
            )

        db.delete(user)
        db.commit()

        return {
            "message": "User deleted successfully."
        }

    @staticmethod
    def get_all_lawyers(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        search: str | None = None,
        active: bool | None = None,
        verified: bool | None = None,
    ) -> PaginatedLawyersResponse:

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0."
            )

        query = (
            db.query(User)
            .filter(User.role == UserRole.LAWYER)
        )

        # -----------------------------
        # Search
        # -----------------------------
        if search:

            query = query.filter(
                (User.full_name.ilike(f"%{search}%"))
                | (User.email.ilike(f"%{search}%"))
                | (User.phone.ilike(f"%{search}%"))
            )

        # -----------------------------
        # Active Filter
        # -----------------------------
        if active is not None:

            query = query.filter(
                User.is_active == active
            )

        # -----------------------------
        # Verified Filter
        # -----------------------------
        if verified is not None:

            query = query.filter(
                User.is_verified == verified
            )

        total = query.count()

        lawyers = (
            query
            .order_by(User.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedLawyersResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=[
                AdminUserResponse.model_validate(
                    lawyer
                )
                for lawyer in lawyers
            ],
        )

    @staticmethod
    def get_lawyer_by_id(
        db: Session,
        lawyer_id: int,
    ) -> AdminUserDetailResponse:

        lawyer = (
            db.query(User)
            .filter(
                User.id == lawyer_id,
                User.role == UserRole.LAWYER,
            )
            .first()
        )

        if not lawyer:
            raise HTTPException(
                status_code=404,
                detail="Lawyer not found."
            )

        profile = (
            db.query(LawyerProfile)
            .filter(LawyerProfile.user_id == lawyer_id)
            .first()
        )

        response = AdminUserDetailResponse.model_validate(lawyer)
        return response.model_copy(
            update={
                "bar_registration_number": (
                    profile.bar_registration_number
                    if profile
                    else None
                )
            }
        )

    @staticmethod
    def update_user_status(
        db: Session,
        user_id: int,
        is_active: bool,
    ):

        user = (
            db.query(User)
            .filter(User.id == user_id)
            .first()
        )

        if not user:
            raise HTTPException(
                status_code=404,
                detail="User not found."
            )

        if user.role is UserRole.ADMIN:
            raise HTTPException(
                status_code=400,
                detail="Admin accounts cannot be deactivated."
            )

        setattr(user, "is_active", is_active)

        db.commit()
        db.refresh(user)

        return user

    @staticmethod
    def update_lawyer(
        db: Session,
        lawyer_id: int,
        data,
    ) -> AdminUserDetailResponse:

        lawyer = (
            db.query(User)
            .filter(
                User.id == lawyer_id,
                User.role == UserRole.LAWYER,
            )
            .first()
        )

        if not lawyer:
            raise HTTPException(
                status_code=404,
                detail="Lawyer not found.",
            )

        profile = (
            db.query(LawyerProfile)
            .filter(
                LawyerProfile.user_id == lawyer_id
            )
            .first()
        )

        if not profile:
            raise HTTPException(
                status_code=404,
                detail="Lawyer profile not found.",
            )

        update_data = data.model_dump(
            exclude_unset=True
        )

        user_fields = {
            "full_name",
            "phone",
        }

        profile_fields = {
            "specialization",
            "experience_years",
            "consultation_fee",
            "city",
            "state",
            "languages",
            "bio",
            "is_available",
            "is_verified",
        }

        for field, value in update_data.items():

            if field in user_fields:
                setattr(lawyer, field, value)

            elif field in profile_fields:
                setattr(profile, field, value)

        db.commit()

        db.refresh(lawyer)
        db.refresh(profile)

        response = AdminUserDetailResponse.model_validate(lawyer)
        return response.model_copy(
            update={
                "bar_registration_number": profile.bar_registration_number
            }
        )

    @staticmethod
    def verify_lawyer(
        db: Session,
        lawyer_id: int,
        is_verified: bool,
    ) -> AdminUserDetailResponse:

        lawyer = (
            db.query(User)
            .filter(
                User.id == lawyer_id,
                User.role == UserRole.LAWYER,
            )
            .first()
        )

        if not lawyer:
            raise HTTPException(
                status_code=404,
                detail="Lawyer not found.",
            )

        profile = (
            db.query(LawyerProfile)
            .filter(
                LawyerProfile.user_id == lawyer_id
            )
            .first()
        )

        if not profile:
            raise HTTPException(
                status_code=404,
                detail="Lawyer profile not found.",
            )

        if is_verified and not (profile.bar_registration_number or "").strip():
            raise HTTPException(
                status_code=400,
                detail="A Bar Council registration number is required before verification.",
            )

        setattr(lawyer, "is_verified", is_verified)
        setattr(profile, "is_verified", is_verified)

        db.commit()

        db.refresh(lawyer)
        db.refresh(profile)

        response = AdminUserDetailResponse.model_validate(lawyer)
        return response.model_copy(
            update={
                "bar_registration_number": profile.bar_registration_number
            }
        )

    @staticmethod
    def delete_lawyer(
        db: Session,
        lawyer_id: int,
        current_admin: User,
    ):

        lawyer = (
            db.query(User)
            .filter(
                User.id == lawyer_id,
                User.role == UserRole.LAWYER,
            )
            .first()
        )

        if not lawyer:
            raise HTTPException(
                status_code=404,
                detail="Lawyer not found.",
            )

        current_admin_id = getattr(current_admin, "id", None)

        if lawyer.id is not None and current_admin_id is not None and lawyer.id == current_admin_id:
            raise HTTPException(
                status_code=400,
                detail="You cannot delete your own account.",
            )

        db.delete(lawyer)
        db.commit()

        return {"message": "Lawyer deleted successfully."}

    @staticmethod
    def update_case(
        db: Session,
        case_id: int,
        data,
    ) -> AdminCaseResponse:

        case = (
            db.query(Case)
            .filter(Case.id == case_id)
            .first()
        )

        if not case:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        update_data = data.model_dump(
            exclude_unset=True
        )

        for field, value in update_data.items():
            setattr(case, field, value)

        db.commit()
        db.refresh(case)

        return AdminCaseResponse.model_validate(case)

    # =====================================================
    # APPOINTMENT MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_appointments(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        status: AppointmentStatus | None = None,
        lawyer_id: int | None = None,
        client_id: int | None = None,
        case_id: int | None = None,
    ) -> PaginatedAppointmentsResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(Appointment)

        # -----------------------------
        # Status Filter
        # -----------------------------
        if status is not None:
            query = query.filter(
                Appointment.status == status
            )

        # -----------------------------
        # Lawyer Filter
        # -----------------------------
        if lawyer_id is not None:
            query = query.filter(
                Appointment.lawyer_id == lawyer_id
            )

        # -----------------------------
        # Client Filter
        # -----------------------------
        if client_id is not None:
            query = query.filter(
                Appointment.client_id == client_id
            )

        # -----------------------------
        # Case Filter
        # -----------------------------
        if case_id is not None:
            query = query.filter(
                Appointment.case_id == case_id
            )

        total = query.count()

        appointments = (
            query
            .order_by(
                Appointment.appointment_time.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        appointment_items = [
            AdminAppointmentResponse.model_validate(
                appointment
            )
            for appointment in appointments
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedAppointmentsResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=appointment_items,
        )

    @staticmethod
    def get_appointment_by_id(
        db: Session,
        appointment_id: int,
    ) -> AdminAppointmentResponse:

        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.id == appointment_id
            )
            .first()
        )

        if not appointment:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found.",
            )

        return AdminAppointmentResponse.model_validate(
            appointment
        )

    @staticmethod
    def update_appointment_status(
        db: Session,
        appointment_id: int,
        status: AppointmentStatus,
    ) -> AdminAppointmentResponse:

        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.id == appointment_id
            )
            .first()
        )

        if not appointment:
            raise HTTPException(
                status_code=404,
                detail="Appointment not found.",
            )

        old_status = getattr(appointment, "status", None)
        old_status_value = str(old_status.value if isinstance(old_status, AppointmentStatus) else old_status or "")

        # -----------------------------------------
        # Prevent changing completed appointment
        # -----------------------------------------
        if (
            old_status_value == AppointmentStatus.COMPLETED.value
            and status != AppointmentStatus.COMPLETED
        ):
            raise HTTPException(
                status_code=400,
                detail="A completed appointment cannot be changed.",
            )

        # -----------------------------------------
        # Prevent changing cancelled appointment
        # -----------------------------------------
        if (
            old_status_value == AppointmentStatus.CANCELLED.value
            and status != AppointmentStatus.CANCELLED
        ):
            raise HTTPException(
                status_code=400,
                detail="A cancelled appointment cannot be changed.",
            )

        # -----------------------------------------
        # Update status
        # -----------------------------------------
        setattr(
            appointment,
            "status",
            status,
        )

        db.commit()
        db.refresh(appointment)

        # -----------------------------------------
        # Notifications
        # -----------------------------------------

        # Appointment confirmed
        if status in [AppointmentStatus.CONFIRMED, AppointmentStatus.SCHEDULED]:

            NotificationService.create_notification(
                db=db,
                user_id=int(getattr(appointment, "client_id")),
                title="Appointment Confirmed",
                message=(
                    "Your appointment with the lawyer "
                    "has been confirmed."
                ),
                notification_type=NotificationType.APPOINTMENT,
            )

        # Appointment cancelled
        elif status == AppointmentStatus.CANCELLED:

            NotificationService.create_notification(
                db=db,
                user_id=int(getattr(appointment, "client_id")),
                title="Appointment Cancelled",
                message=(
                    "Your appointment has been cancelled."
                ),
                notification_type=NotificationType.APPOINTMENT,
            )

            NotificationService.create_notification(
                db=db,
                user_id=int(getattr(appointment, "lawyer_id")),
                title="Appointment Cancelled",
                message=(
                    "An appointment assigned to you "
                    "has been cancelled."
                ),
                notification_type=NotificationType.APPOINTMENT,
            )

        # Appointment completed
        elif status == AppointmentStatus.COMPLETED:

            NotificationService.create_notification(
                db=db,
                user_id=int(getattr(appointment, "client_id")),
                title="Appointment Completed",
                message=(
                    "Your appointment has been marked "
                    "as completed."
                ),
                notification_type=NotificationType.APPOINTMENT,
            )

        return AdminAppointmentResponse.model_validate(
            appointment
        )

    # =====================================================
    # PAYMENT MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_payments(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        status: PaymentStatus | None = None,
        client_id: int | None = None,
        appointment_id: int | None = None,
    ) -> PaginatedPaymentsResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(Payment)

        # -----------------------------------------
        # Payment Status Filter
        # -----------------------------------------
        if status is not None:
            query = query.filter(
                Payment.status == status.value
            )

        # -----------------------------------------
        # Client Filter
        # -----------------------------------------
        if client_id is not None:
            query = query.filter(
                Payment.client_id == client_id
            )

        # -----------------------------------------
        # Appointment Filter
        # -----------------------------------------
        if appointment_id is not None:
            query = query.filter(
                Payment.appointment_id == appointment_id
            )

        total = query.count()

        payments = (
            query
            .order_by(Payment.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        payment_items = [
            AdminPaymentResponse.model_validate(payment)
            for payment in payments
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedPaymentsResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=payment_items,
        )

    @staticmethod
    def get_payment_by_id(
        db: Session,
        payment_id: int,
    ) -> AdminPaymentResponse:
        payment = (
            db.query(Payment)
            .filter(Payment.id == payment_id)
            .first()
        )

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Payment not found.",
            )

        return AdminPaymentResponse.model_validate(
            payment
        )

    @staticmethod
    def get_payment_stats(
        db: Session,
    ) -> PaymentStatsResponse:

        total_payments = (
            db.query(Payment)
            .count()
        )

        successful_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.SUCCESS.value
            )
            .count()
        )

        pending_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.PENDING.value
            )
            .count()
        )

        failed_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.FAILED.value
            )
            .count()
        )

        refunded_payments = (
            db.query(Payment)
            .filter(
                Payment.status == PaymentStatus.REFUNDED.value
            )
            .count()
        )

        total_revenue = (
            db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == PaymentStatus.SUCCESS.value
            )
            .scalar()
        )

        average_successful_payment = (
            db.query(
                func.coalesce(
                    func.avg(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == PaymentStatus.SUCCESS.value
            )
            .scalar()
        )

        return PaymentStatsResponse(
            total_payments=total_payments,
            successful_payments=successful_payments,
            pending_payments=pending_payments,
            failed_payments=failed_payments,
            refunded_payments=refunded_payments,
            total_revenue=float(total_revenue or 0),
            average_successful_payment=float(average_successful_payment or 0),
        )

    # =====================================================
    # PAYMENT REFUND
    # =====================================================

    @staticmethod
    def refund_payment(
        db: Session,
        payment_id: int,
        amount: float | None = None,
        reason: str | None = None,
    ) -> PaymentRefundResponse:
        payment = (
            db.query(Payment)
            .filter(Payment.id == payment_id)
            .first()
        )

        if not payment:
            raise HTTPException(
                status_code=404,
                detail="Payment not found.",
            )

        if getattr(payment, "status", None) != PaymentStatus.SUCCESS.value:
            raise HTTPException(
                status_code=400,
                detail="Only successful payments can be refunded.",
            )

        razorpay_payment_id = getattr(payment, "razorpay_payment_id", None)
        if not razorpay_payment_id:
            raise HTTPException(
                status_code=400,
                detail="Razorpay payment ID is missing.",
            )

        payment_amount = float(getattr(payment, "amount", 0))

        if amount is not None:
            if amount <= 0:
                raise HTTPException(
                    status_code=400,
                    detail="Refund amount must be greater than zero.",
                )

            if amount > payment_amount:
                raise HTTPException(
                    status_code=400,
                    detail="Refund amount cannot exceed the payment amount.",
                )

        client = razorpay.Client(
            auth=(
                settings.RAZORPAY_KEY_ID,
                settings.RAZORPAY_KEY_SECRET,
            )
        )

        refund_data = {}
        if amount is not None:
            refund_data["amount"] = int(round(amount * 100))
        if reason:
            refund_data["notes"] = {"reason": reason}

        try:
            payment_api = getattr(client, "payment")
            refund_method = getattr(payment_api, "refund")
            refund = refund_method(
                razorpay_payment_id,
                refund_data,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Razorpay refund failed: {str(exc)}",
            ) from exc

        refund_amount = float(refund.get("amount", 0)) / 100

        if refund_amount >= payment_amount:
            setattr(
                payment,
                "status",
                PaymentStatus.REFUNDED.value,
            )

        db.commit()
        db.refresh(payment)

        currency = getattr(payment, "currency", "INR")

        return PaymentRefundResponse(
            payment_id=int(getattr(payment, "id")),
            razorpay_payment_id=razorpay_payment_id,
            refund_id=refund.get("id"),
            refund_amount=refund_amount,
            currency=currency,
            status=refund.get("status", "pending"),
            message="Refund initiated successfully.",
        )
    # =====================================================
    # DOCUMENT MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_documents(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        category: DocumentCategory | None = None,
        uploaded_by: int | None = None,
        case_id: int | None = None,
    ) -> PaginatedDocumentsResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(Document)

        # -----------------------------------------
        # Category filter
        # -----------------------------------------

        if category is not None:
            query = query.filter(
                Document.category == category
            )

        # -----------------------------------------
        # Uploader filter
        # -----------------------------------------

        if uploaded_by is not None:
            query = query.filter(
                Document.uploaded_by == uploaded_by
            )

        # -----------------------------------------
        # Case filter
        # -----------------------------------------

        if case_id is not None:
            query = query.filter(
                Document.case_id == case_id
            )

        # -----------------------------------------
        # Total
        # -----------------------------------------

        total = query.count()

        # -----------------------------------------
        # Pagination
        # -----------------------------------------

        documents = (
            query
            .order_by(
                Document.created_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        # -----------------------------------------
        # Response items
        # -----------------------------------------

        document_items = [
            AdminDocumentResponse.model_validate(
                document
            )
            for document in documents
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedDocumentsResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=document_items,
        )

    @staticmethod
    def get_document_by_id(
        db: Session,
        document_id: int,
    ) -> AdminDocumentResponse:

        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found.",
            )

        return AdminDocumentResponse.model_validate(
            document
        )

    @staticmethod
    def delete_document(
        db: Session,
        document_id: int,
    ) -> dict:

        # -----------------------------------------
        # Find document
        # -----------------------------------------

        document = (
            db.query(Document)
            .filter(Document.id == document_id)
            .first()
        )

        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found.",
            )

        storage_path = getattr(
            document,
            "storage_path",
            None,
        )

        document_id_value = getattr(
            document,
            "id",
            document_id,
        )

        file_name = getattr(
            document,
            "file_name",
            "document",
        )

        # -----------------------------------------
        # Delete file from Supabase Storage
        # -----------------------------------------

        if storage_path:

            try:
                supabase.storage.from_(
                    settings.SUPABASE_BUCKET
                ).remove(
                    [storage_path]
                )

            except Exception as exc:

                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Failed to delete document "
                        f"from storage: {str(exc)}"
                    ),
                )

        # -----------------------------------------
        # Delete database record
        # -----------------------------------------

        db.delete(document)
        db.commit()

        return {
            "message": "Document deleted successfully.",
            "document_id": document_id_value,
            "file_name": file_name,
        }
    # =====================================================
    # NOTIFICATION MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_notifications(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        user_id: int | None = None,
        notification_type: NotificationType | None = None,
        is_read: bool | None = None,
    ) -> PaginatedNotificationsResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(Notification)

        # -----------------------------------------
        # User filter
        # -----------------------------------------

        if user_id is not None:
            query = query.filter(
                Notification.user_id == user_id
            )

        # -----------------------------------------
        # Notification type filter
        # -----------------------------------------

        if notification_type is not None:
            query = query.filter(
                Notification.notification_type
                == notification_type
            )

        # -----------------------------------------
        # Read/unread filter
        # -----------------------------------------

        if is_read is not None:
            query = query.filter(
                Notification.is_read == is_read
            )

        # -----------------------------------------
        # Total
        # -----------------------------------------

        total = query.count()

        # -----------------------------------------
        # Pagination
        # -----------------------------------------

        notifications = (
            query
            .order_by(
                Notification.created_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        # -----------------------------------------
        # Response items
        # -----------------------------------------

        notification_items = [
            AdminNotificationResponse.model_validate(
                notification
            )
            for notification in notifications
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedNotificationsResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=notification_items,
        )

    @staticmethod
    def get_notification_by_id(
        db: Session,
        notification_id: int,
    ) -> AdminNotificationResponse:

        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found.",
            )

        return AdminNotificationResponse.model_validate(
            notification
        )

    # =====================================================
    # DELETE NOTIFICATION
    # =====================================================

    @staticmethod
    def delete_notification(
        db: Session,
        notification_id: int,
    ) -> dict:

        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found.",
            )

        notification_id_value = getattr(
            notification,
            "id",
            notification_id,
        )

        db.delete(notification)
        db.commit()

        return {
            "message": "Notification deleted successfully.",
            "notification_id": notification_id_value,
        }

    # =====================================================
    # NOTIFICATION STATISTICS
    # =====================================================

    @staticmethod
    def get_notification_stats(
        db: Session,
    ) -> NotificationStatsResponse:

        total_notifications = (
            db.query(Notification).count()
        )

        read_notifications = (
            db.query(Notification)
            .filter(
                Notification.is_read.is_(True)
            )
            .count()
        )

        unread_notifications = (
            db.query(Notification)
            .filter(
                Notification.is_read.is_(False)
            )
            .count()
        )

        chat_notifications = (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == NotificationType.CHAT
            )
            .count()
        )

        appointment_notifications = (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == NotificationType.APPOINTMENT
            )
            .count()
        )

        payment_notifications = (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == NotificationType.PAYMENT
            )
            .count()
        )

        document_notifications = (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == NotificationType.DOCUMENT
            )
            .count()
        )

        video_call_notifications = (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == NotificationType.VIDEO_CALL
            )
            .count()
        )

        system_notifications = (
            db.query(Notification)
            .filter(
                Notification.notification_type
                == NotificationType.SYSTEM
            )
            .count()
        )

        return NotificationStatsResponse(
            total_notifications=total_notifications,
            read_notifications=read_notifications,
            unread_notifications=unread_notifications,
            chat_notifications=chat_notifications,
            appointment_notifications=appointment_notifications,
            payment_notifications=payment_notifications,
            document_notifications=document_notifications,
            video_call_notifications=video_call_notifications,
            system_notifications=system_notifications,
        )

    # =====================================================
    # VIDEO CALL MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_video_calls(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        case_id: int | None = None,
        caller_id: int | None = None,
        receiver_id: int | None = None,
        status: CallStatus | None = None,
    ) -> PaginatedVideoCallsResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(VideoCall)

        # -----------------------------------------
        # Case filter
        # -----------------------------------------

        if case_id is not None:
            query = query.filter(
                VideoCall.case_id == case_id
            )

        # -----------------------------------------
        # Caller filter
        # -----------------------------------------

        if caller_id is not None:
            query = query.filter(
                VideoCall.caller_id == caller_id
            )

        # -----------------------------------------
        # Receiver filter
        # -----------------------------------------

        if receiver_id is not None:
            query = query.filter(
                VideoCall.receiver_id == receiver_id
            )

        # -----------------------------------------
        # Status filter
        # -----------------------------------------

        if status is not None:
            query = query.filter(
                VideoCall.status == status
            )

        # -----------------------------------------
        # Total
        # -----------------------------------------

        total = query.count()

        # -----------------------------------------
        # Pagination
        # -----------------------------------------

        video_calls = (
            query
            .order_by(
                VideoCall.created_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        # -----------------------------------------
        # Response items
        # -----------------------------------------

        video_call_items = [
            AdminVideoCallResponse.model_validate(
                video_call
            )
            for video_call in video_calls
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedVideoCallsResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=video_call_items,
        )

    @staticmethod
    def get_video_call_by_id(
        db: Session,
        call_id: int,
    ) -> AdminVideoCallResponse:

        video_call = (
            db.query(VideoCall)
            .filter(VideoCall.id == call_id)
            .first()
        )

        if not video_call:
            raise HTTPException(
                status_code=404,
                detail="Video call not found.",
            )

        return AdminVideoCallResponse.model_validate(
            video_call
        )

    # =====================================================
    # VIDEO CALL STATISTICS
    # =====================================================

    @staticmethod
    def get_video_call_stats(
        db: Session,
    ) -> VideoCallStatsResponse:

        total_video_calls = (
            db.query(VideoCall).count()
        )

        created_calls = (
            db.query(VideoCall)
            .filter(
                VideoCall.status == CallStatus.CREATED
            )
            .count()
        )

        ongoing_calls = (
            db.query(VideoCall)
            .filter(
                VideoCall.status == CallStatus.ONGOING
            )
            .count()
        )

        ended_calls = (
            db.query(VideoCall)
            .filter(
                VideoCall.status == CallStatus.ENDED
            )
            .count()
        )

        missed_calls = (
            db.query(VideoCall)
            .filter(
                VideoCall.status == CallStatus.MISSED
            )
            .count()
        )

        return VideoCallStatsResponse(
            total_video_calls=total_video_calls,
            created_calls=created_calls,
            ongoing_calls=ongoing_calls,
            ended_calls=ended_calls,
            missed_calls=missed_calls,
        )

    # =====================================================
    # CHAT MESSAGE MANAGEMENT
    # =====================================================

    @staticmethod
    def get_all_chat_messages(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        case_id: int | None = None,
        sender_id: int | None = None,
        receiver_id: int | None = None,
        is_read: bool | None = None,
    ) -> PaginatedChatMessagesResponse:

        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        query = db.query(ChatMessage)

        # -----------------------------------------
        # Case filter
        # -----------------------------------------

        if case_id is not None:
            query = query.filter(
                ChatMessage.case_id == case_id
            )

        # -----------------------------------------
        # Sender filter
        # -----------------------------------------

        if sender_id is not None:
            query = query.filter(
                ChatMessage.sender_id == sender_id
            )

        # -----------------------------------------
        # Receiver filter
        # -----------------------------------------

        if receiver_id is not None:
            query = query.filter(
                ChatMessage.receiver_id == receiver_id
            )

        # -----------------------------------------
        # Read / unread filter
        # -----------------------------------------

        if is_read is not None:
            query = query.filter(
                ChatMessage.is_read == is_read
            )

        # -----------------------------------------
        # Total
        # -----------------------------------------

        total = query.count()

        # -----------------------------------------
        # Pagination
        # -----------------------------------------

        messages = (
            query
            .order_by(
                ChatMessage.created_at.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        # -----------------------------------------
        # Response items
        # -----------------------------------------

        message_items = [
            AdminChatMessageResponse.model_validate(
                message
            )
            for message in messages
        ]

        page = (skip // limit) + 1
        pages = ceil(total / limit) if total else 1

        return PaginatedChatMessagesResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=message_items,
        )

    @staticmethod
    def get_chat_message_by_id(
        db: Session,
        message_id: int,
    ) -> AdminChatMessageResponse:

        message = (
            db.query(ChatMessage)
            .filter(ChatMessage.id == message_id)
            .first()
        )

        if not message:
            raise HTTPException(
                status_code=404,
                detail="Chat message not found.",
            )

        return AdminChatMessageResponse.model_validate(
            message
        )

    # =====================================================
    # DELETE CHAT MESSAGE
    # =====================================================

    @staticmethod
    def delete_chat_message(
        db: Session,
        message_id: int,
    ) -> dict:

        # -----------------------------------------
        # Find message
        # -----------------------------------------

        message = (
            db.query(ChatMessage)
            .filter(ChatMessage.id == message_id)
            .first()
        )

        if not message:
            raise HTTPException(
                status_code=404,
                detail="Chat message not found.",
            )

        # -----------------------------------------
        # Get attachment URL/path
        # -----------------------------------------

        attachment_url = getattr(
            message,
            "attachment_url",
            None,
        )

        # -----------------------------------------
        # Delete attachment if present
        # -----------------------------------------

        if attachment_url:

            try:
                # Your chat upload implementation may
                # store either a storage path or a URL.
                #
                # Only attempt removal when the value
                # can be treated as a storage path.
                storage_path = attachment_url

                supabase.storage.from_(
                    settings.SUPABASE_BUCKET
                ).remove(
                    [storage_path]
                )

            except Exception as exc:

                raise HTTPException(
                    status_code=502,
                    detail=(
                        "Failed to delete chat "
                        f"attachment from storage: {str(exc)}"
                    ),
                )

        # -----------------------------------------
        # Delete database message
        # -----------------------------------------

        message_id_value = getattr(
            message,
            "id",
            message_id,
        )

        db.delete(message)
        db.commit()

        return {
            "message": "Chat message deleted successfully.",
            "message_id": message_id_value,
        }

    # =====================================================
    # CHAT MESSAGE STATISTICS
    # =====================================================

    @staticmethod
    def get_chat_message_stats(
        db: Session,
    ) -> ChatMessageStatsResponse:

        total_messages = (
            db.query(ChatMessage).count()
        )

        read_messages = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.is_read.is_(True)
            )
            .count()
        )

        unread_messages = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.is_read.is_(False)
            )
            .count()
        )

        messages_with_attachments = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.attachment_url.isnot(None)
            )
            .count()
        )

        messages_without_attachments = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.attachment_url.is_(None)
            )
            .count()
        )

        return ChatMessageStatsResponse(
            total_messages=total_messages,
            read_messages=read_messages,
            unread_messages=unread_messages,
            messages_with_attachments=messages_with_attachments,
            messages_without_attachments=messages_without_attachments,
        )

    @staticmethod
    def get_activity(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        activity_type: str | None = None,
    ) -> PaginatedActivityResponse:
        if skip < 0:
            raise HTTPException(
                status_code=400,
                detail="skip cannot be negative.",
            )

        if limit <= 0:
            raise HTTPException(
                status_code=400,
                detail="limit must be greater than 0.",
            )

        allowed_types = {
            "user",
            "case",
            "appointment",
            "payment",
            "document",
            "notification",
            "message",
            "video_call",
        }

        if activity_type is not None and activity_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid activity_type. Allowed values: "
                    + ", ".join(sorted(allowed_types))
                ),
            )

        activities: list[dict] = []

        # =================================================
        # USERS
        # =================================================
        if activity_type is None or activity_type == "user":
            users = (
                db.query(User)
                .order_by(User.created_at.desc())
                .all()
            )

            for user in users:
                role_value = (
                    user.role.value
                    if isinstance(user.role, UserRole)
                    else str(user.role)
                )

                activities.append(
                    {
                        "id": user.id,
                        "activity_type": "user",
                        "title": "New User",
                        "description": (
                            f"{user.full_name} registered as {role_value}"
                        ),
                        "reference_id": user.id,
                        "user_id": user.id,
                        "created_at": user.created_at,
                    }
                )

        # =================================================
        # CASES
        # =================================================
        if activity_type is None or activity_type == "case":
            cases = (
                db.query(Case)
                .order_by(Case.created_at.desc())
                .all()
            )

            for case in cases:
                activities.append(
                    {
                        "id": case.id,
                        "activity_type": "case",
                        "title": "Case Created",
                        "description": case.title,
                        "reference_id": case.id,
                        "user_id": case.client_id,
                        "created_at": case.created_at,
                    }
                )

        # =================================================
        # APPOINTMENTS
        # =================================================
        if activity_type is None or activity_type == "appointment":
            appointments = (
                db.query(Appointment)
                .order_by(Appointment.created_at.desc())
                .all()
            )

            for appointment in appointments:
                status_value = (
                    appointment.status.value
                    if isinstance(appointment.status, AppointmentStatus)
                    else str(appointment.status)
                )

                activities.append(
                    {
                        "id": appointment.id,
                        "activity_type": "appointment",
                        "title": "Appointment",
                        "description": (
                            f"Appointment status: {status_value}"
                        ),
                        "reference_id": appointment.id,
                        "user_id": appointment.client_id,
                        "created_at": appointment.created_at,
                    }
                )

        # =================================================
        # PAYMENTS
        # =================================================
        if activity_type is None or activity_type == "payment":
            payments = (
                db.query(Payment)
                .order_by(Payment.created_at.desc())
                .all()
            )

            for payment in payments:
                activities.append(
                    {
                        "id": payment.id,
                        "activity_type": "payment",
                        "title": "Payment",
                        "description": (
                            f"Payment {payment.status} - "
                            f"{payment.amount} {payment.currency}"
                        ),
                        "reference_id": payment.id,
                        "user_id": payment.client_id,
                        "created_at": payment.created_at,
                    }
                )

        # =================================================
        # DOCUMENTS
        # =================================================
        if activity_type is None or activity_type == "document":
            documents = (
                db.query(Document)
                .order_by(Document.created_at.desc())
                .all()
            )

            for document in documents:
                category_value = (
                    document.category.value
                    if isinstance(document.category, DocumentCategory)
                    else str(document.category)
                )

                activities.append(
                    {
                        "id": document.id,
                        "activity_type": "document",
                        "title": "Document Uploaded",
                        "description": (
                            f"{document.file_name} ({category_value})"
                        ),
                        "reference_id": document.id,
                        "user_id": document.uploaded_by,
                        "created_at": document.created_at,
                    }
                )

        # =================================================
        # NOTIFICATIONS
        # =================================================
        if activity_type is None or activity_type == "notification":
            notifications = (
                db.query(Notification)
                .order_by(Notification.created_at.desc())
                .all()
            )

            for notification in notifications:
                activities.append(
                    {
                        "id": notification.id,
                        "activity_type": "notification",
                        "title": notification.title,
                        "description": notification.message,
                        "reference_id": notification.id,
                        "user_id": notification.user_id,
                        "created_at": notification.created_at,
                    }
                )

        # =================================================
        # CHAT MESSAGES
        # =================================================
        if activity_type is None or activity_type == "message":
            messages = (
                db.query(ChatMessage)
                .order_by(ChatMessage.created_at.desc())
                .all()
            )

            for message in messages:

                attachment_name = getattr(
                    message,
                    "attachment_name",
                    None,
                )

                if attachment_name:
                    description = (
                        "Message with attachment: "
                        f"{attachment_name}"
                    )
                else:
                    description = "Chat message exchanged"

                activities.append(
                    {
                        "id": message.id,
                        "activity_type": "message",
                        "title": "Chat Message",
                        "description": description,
                        "reference_id": message.id,
                        "user_id": message.sender_id,
                        "created_at": message.created_at,
                    }
                )

        # =================================================
        # VIDEO CALLS
        # =================================================
        if activity_type is None or activity_type == "video_call":
            video_calls = (
                db.query(VideoCall)
                .order_by(VideoCall.created_at.desc())
                .all()
            )

            for video_call in video_calls:
                status_value = (
                    video_call.status.value
                    if isinstance(video_call.status, CallStatus)
                    else str(video_call.status)
                )

                activities.append(
                    {
                        "id": video_call.id,
                        "activity_type": "video_call",
                        "title": "Video Call",
                        "description": (
                            f"Video call status: {status_value}"
                        ),
                        "reference_id": video_call.id,
                        "user_id": video_call.caller_id,
                        "created_at": video_call.created_at,
                    }
                )

        # =================================================
        # SORT ALL ACTIVITIES SAFELY
        # =================================================
        def activity_timestamp(activity: dict) -> float:
            
            value = activity.get("created_at")

            if value is None:
                return float("-inf")

            try:
                return value.timestamp()
            except (AttributeError, OSError, OverflowError):
                return float("-inf")

        activities.sort(
            key=activity_timestamp,
            reverse=True,
        )

        # =================================================
        # PAGINATION
        # =================================================
        total = len(activities)

        paginated_activities = activities[skip: skip + limit]

        page = (skip // limit) + 1

        pages = ceil(total / limit) if total > 0 else 1

        activity_items = [
            AdminActivityResponse(**activity)
            for activity in paginated_activities
        ]

        return PaginatedActivityResponse(
            total=total,
            page=page,
            size=limit,
            pages=pages,
            items=activity_items,
        )
