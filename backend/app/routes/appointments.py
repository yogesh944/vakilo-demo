from datetime import datetime, timezone
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.appointment import Appointment, AppointmentStatus
from app.models.case import Case
from app.models.user import User, UserRole
from app.models.notification import NotificationType
from app.services.notification_service import NotificationService
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    AppointmentResponse,
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


def normalize_datetime(value: datetime) -> datetime:
    """Store appointment times as naive UTC datetimes."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def ensure_future(value: datetime) -> None:
    if value <= datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Appointment time must be in the future.",
        )


def get_appointment_or_404(db: Session, appointment_id: int) -> Appointment:
    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found.")
    return appointment


def ensure_participant(appointment: Appointment, user: User) -> int:
    user_id = cast(int, user.id)
    if user.role is UserRole.ADMIN:
        return user_id
    if user_id not in [cast(int, appointment.client_id), cast(int, appointment.lawyer_id)]:
        raise HTTPException(status_code=403, detail="You are not a participant in this consultation.")
    return user_id


def check_double_booking(
    db: Session,
    appointment: Appointment,
    appointment_time: datetime,
) -> None:
    active = [AppointmentStatus.SCHEDULED, AppointmentStatus.ONGOING]

    lawyer_busy = (
        db.query(Appointment)
        .filter(
            Appointment.id != appointment.id,
            Appointment.lawyer_id == appointment.lawyer_id,
            Appointment.appointment_time == appointment_time,
            Appointment.status.in_(active),
        )
        .first()
    )
    if lawyer_busy:
        raise HTTPException(status_code=400, detail="The lawyer already has an appointment at this time.")

    client_busy = (
        db.query(Appointment)
        .filter(
            Appointment.id != appointment.id,
            Appointment.client_id == appointment.client_id,
            Appointment.appointment_time == appointment_time,
            Appointment.status.in_(active),
        )
        .first()
    )
    if client_busy:
        raise HTTPException(status_code=400, detail="The client already has an appointment at this time.")


def notify_both(
    db: Session,
    appointment: Appointment,
    title: str,
    message: str,
) -> None:
    for user_id in [cast(int, appointment.client_id), cast(int, appointment.lawyer_id)]:
        NotificationService.create_notification(
            db=db,
            user_id=user_id,
            title=title,
            message=message,
            notification_type=NotificationType.APPOINTMENT,
        )


@router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_appointment(
    appointment_data: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lawyer schedules a consultation after agreeing on the time in chat."""
    if current_user.role is not UserRole.LAWYER:
        raise HTTPException(status_code=403, detail="Only the assigned lawyer can schedule a consultation.")

    lawyer_id = cast(int, current_user.id)
    case = db.query(Case).filter(Case.id == appointment_data.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    assigned_lawyer_id = cast(int | None, case.lawyer_id)
    if assigned_lawyer_id is None:
        raise HTTPException(status_code=400, detail="No lawyer has been assigned to this case yet.")
    if assigned_lawyer_id != lawyer_id:
        raise HTTPException(status_code=403, detail="Only the assigned lawyer can schedule this consultation.")

    appointment_time = normalize_datetime(appointment_data.appointment_time)
    ensure_future(appointment_time)

    existing = (
        db.query(Appointment)
        .filter(
            Appointment.case_id == appointment_data.case_id,
            Appointment.status.in_([AppointmentStatus.SCHEDULED, AppointmentStatus.ONGOING]),
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="An active consultation already exists for this case.")

    appointment = Appointment(
        client_id=cast(int, case.client_id),
        lawyer_id=lawyer_id,
        case_id=appointment_data.case_id,
        appointment_time=appointment_time,
        status=AppointmentStatus.SCHEDULED,
        notes=appointment_data.notes,
    )
    check_double_booking(db, appointment, appointment_time)

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    formatted = appointment_time.strftime("%d %b %Y at %I:%M %p")
    notify_both(
        db,
        appointment,
        "Virtual Consultation Scheduled",
        f"Your virtual consultation is scheduled for {formatted}.",
    )
    return appointment


@router.get("", response_model=list[AppointmentResponse])
def get_my_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = cast(int, current_user.id)
    query = db.query(Appointment)

    if current_user.role is UserRole.CLIENT:
        query = query.filter(Appointment.client_id == user_id)
    elif current_user.role is UserRole.LAWYER:
        query = query.filter(Appointment.lawyer_id == user_id)

    return query.order_by(Appointment.appointment_time.asc()).all()


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = get_appointment_or_404(db, appointment_id)
    ensure_participant(appointment, current_user)
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    data: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lawyer can reschedule; either participant can update notes."""
    appointment = get_appointment_or_404(db, appointment_id)
    user_id = ensure_participant(appointment, current_user)

    if appointment.status in [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="This consultation can no longer be modified.")

    if data.appointment_time is not None:
        if current_user.role is not UserRole.LAWYER or user_id != cast(int, appointment.lawyer_id):
            raise HTTPException(status_code=403, detail="Only the assigned lawyer can reschedule the consultation.")
        new_time = normalize_datetime(data.appointment_time)
        ensure_future(new_time)
        check_double_booking(db, appointment, new_time)
        setattr(appointment, "appointment_time", new_time)

    if data.notes is not None:
        setattr(appointment, "notes", data.notes)

    db.commit()
    db.refresh(appointment)

    if data.appointment_time is not None:
        formatted = appointment.appointment_time.strftime("%d %b %Y at %I:%M %p")
        notify_both(
            db,
            appointment,
            "Consultation Rescheduled",
            f"Your virtual consultation has been rescheduled to {formatted}.",
        )

    return appointment


@router.patch("/{appointment_id}/status", response_model=AppointmentResponse)
def update_status(
    appointment_id: int,
    data: AppointmentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = get_appointment_or_404(db, appointment_id)
    user_id = cast(int, current_user.id)
    current = AppointmentStatus(appointment.status)
    new = data.status

    if current_user.role is UserRole.LAWYER:
        if user_id != cast(int, appointment.lawyer_id):
            raise HTTPException(status_code=403, detail="Only the assigned lawyer can manage this consultation.")
    elif current_user.role is UserRole.CLIENT:
        if user_id != cast(int, appointment.client_id):
            raise HTTPException(status_code=403, detail="Only the client for this consultation can manage it.")
        if new is not AppointmentStatus.CANCELLED:
            raise HTTPException(status_code=403, detail="Clients can only cancel a consultation.")
    elif current_user.role is not UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized.")

    allowed = {
        AppointmentStatus.SCHEDULED: [AppointmentStatus.ONGOING, AppointmentStatus.CANCELLED],
        AppointmentStatus.ONGOING: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
        AppointmentStatus.COMPLETED: [],
        AppointmentStatus.CANCELLED: [],
    }
    if new not in allowed[current]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {current.value} to {new.value}.",
        )

    setattr(appointment, "status", new)
    db.commit()
    db.refresh(appointment)

    title_map = {
        AppointmentStatus.ONGOING: "Consultation Started",
        AppointmentStatus.COMPLETED: "Consultation Completed",
        AppointmentStatus.CANCELLED: "Consultation Cancelled",
    }
    message_map = {
        AppointmentStatus.ONGOING: "The virtual consultation has started.",
        AppointmentStatus.COMPLETED: "The virtual consultation has been completed.",
        AppointmentStatus.CANCELLED: "The virtual consultation has been cancelled.",
    }
    if new in title_map:
        notify_both(db, appointment, title_map[new], message_map[new])

    return appointment
