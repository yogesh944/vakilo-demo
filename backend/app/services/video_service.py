import uuid
from datetime import datetime, timedelta
from typing import Any, cast

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus
from app.models.case import Case
from app.models.notification import NotificationType
from app.models.video_call import CallStatus, VideoCall
from app.services.notification_service import NotificationService




class VideoService:

    # ==========================================================
    # FIND SCHEDULED CONSULTATION
    # ==========================================================

    @staticmethod
    def get_active_consultation(
        db: Session,
        case_id: int,
        user_id: int,
    ) -> Appointment:
        """
        Return the active appointment for the case and participant.

        Payment is intentionally NOT checked here. Video access is tied
        only to the scheduled consultation appointment.
        """
        appointment = (
            db.query(Appointment)
            .filter(
                Appointment.case_id == case_id,
                Appointment.status.in_(
                    [
                        AppointmentStatus.SCHEDULED,
                        AppointmentStatus.ONGOING,
                    ]
                ),
            )
            .order_by(Appointment.appointment_time.asc())
            .first()
        )

        if not appointment:
            raise HTTPException(
                status_code=403,
                detail=(
                    "No active consultation is scheduled for this case."
                ),
            )

        client_id = cast(int, appointment.client_id)
        lawyer_id = cast(int, appointment.lawyer_id)

        if user_id not in [client_id, lawyer_id]:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this consultation.",
            )

        return appointment

    # ==========================================================
    # CREATE VIDEO CALL
    # ==========================================================

    @staticmethod
    def create_call(
        db: Session,
        case_id: int,
        caller_id: int,
        receiver_id: int,
    ) -> VideoCall:

        case = db.query(Case).filter(Case.id == case_id).first()

        if not case:
            raise HTTPException(
                status_code=404,
                detail="Case not found.",
            )

        client_id = cast(int, case.client_id)
        lawyer_id = cast(int, case.lawyer_id)

        if caller_id not in [client_id, lawyer_id]:
            raise HTTPException(
                status_code=403,
                detail="Not authorized.",
            )

        if receiver_id not in [client_id, lawyer_id]:
            raise HTTPException(
                status_code=400,
                detail="Receiver is not part of this case.",
            )

        if caller_id == receiver_id:
            raise HTTPException(
                status_code=400,
                detail="You cannot create a video call with yourself.",
            )

        appointment = VideoService.get_active_consultation(
            db=db,
            case_id=case_id,
            user_id=caller_id,
        )

        existing_call = (
            db.query(VideoCall)
            .filter(
                VideoCall.case_id == case_id,
                VideoCall.status.in_(
                    [CallStatus.CREATED, CallStatus.ONGOING]
                ),
            )
            .order_by(VideoCall.created_at.desc())
            .first()
        )

        if existing_call:
            if caller_id not in [
                cast(int, existing_call.caller_id),
                cast(int, existing_call.receiver_id),
            ]:
                raise HTTPException(
                    status_code=403,
                    detail="You are not a participant in this video call.",
                )

            return existing_call

        room_id = f"case-{case_id}-{uuid.uuid4().hex[:8]}"

        call = VideoCall(
            case_id=case_id,
            caller_id=caller_id,
            receiver_id=receiver_id,
            room_id=room_id,
            status=CallStatus.CREATED,
        )

        db.add(call)
        db.commit()
        db.refresh(call)

        NotificationService.create_notification(
            db=db,
            user_id=receiver_id,
            title="Video Consultation",
            message="The scheduled video consultation is now available to join.",
            notification_type=NotificationType.VIDEO_CALL,
        )

        return call

    # ==========================================================
    # START CALL
    # ==========================================================

    @staticmethod
    def start_call(
        db: Session,
        room_id: str,
        user_id: int,
    ) -> VideoCall:

        call = (
            db.query(VideoCall)
            .filter(VideoCall.room_id == room_id)
            .first()
        )

        if not call:
            raise HTTPException(
                status_code=404,
                detail="Call not found.",
            )

        caller_id = cast(int, call.caller_id)
        receiver_id = cast(int, call.receiver_id)

        if user_id not in [caller_id, receiver_id]:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this video call.",
            )

        appointment = VideoService.get_active_consultation(
            db=db,
            case_id=cast(int, call.case_id),
            user_id=user_id,
        )

        call_status = cast(CallStatus, call.status)

        if call_status == CallStatus.ONGOING:
            return call

        if call_status != CallStatus.CREATED:
            raise HTTPException(
                status_code=400,
                detail="This video call cannot be started in its current state.",
            )

        call_any = cast(Any, call)
        call_any.status = CallStatus.ONGOING
        call_any.started_at = datetime.utcnow()

        # First participant starting the video consultation moves the
        # appointment from SCHEDULED to ONGOING.
        appointment_any = cast(Any, appointment)
        if cast(AppointmentStatus, appointment.status) == AppointmentStatus.SCHEDULED:
            appointment_any.status = AppointmentStatus.ONGOING

        db.commit()
        db.refresh(call)

        return call

    # ==========================================================
    # END CALL
    # ==========================================================

    @staticmethod
    def end_call(
        db: Session,
        room_id: str,
        user_id: int,
        status: CallStatus,
    ) -> VideoCall:

        call = (
            db.query(VideoCall)
            .filter(VideoCall.room_id == room_id)
            .first()
        )

        if not call:
            raise HTTPException(
                status_code=404,
                detail="Call not found.",
            )

        caller_id = cast(int, call.caller_id)
        receiver_id = cast(int, call.receiver_id)

        if user_id not in [caller_id, receiver_id]:
            raise HTTPException(
                status_code=403,
                detail="You are not a participant in this video call.",
            )

        if status not in [CallStatus.ENDED, CallStatus.MISSED]:
            raise HTTPException(
                status_code=400,
                detail="Invalid ending status.",
            )

        call_status = cast(CallStatus, call.status)
        if call_status not in [CallStatus.CREATED, CallStatus.ONGOING]:
            raise HTTPException(
                status_code=400,
                detail="This video call has already ended.",
            )

        appointment = VideoService.get_active_consultation(
            db=db,
            case_id=cast(int, call.case_id),
            user_id=user_id,
        )

        call_any = cast(Any, call)
        call_any.status = status
        call_any.ended_at = datetime.utcnow()

        # A normal ended consultation completes the appointment.
        # A missed call is left as ONGOING so it can be handled by the
        # appointment workflow rather than incorrectly marking it completed.
        if status == CallStatus.ENDED:
            appointment_any = cast(Any, appointment)
            appointment_any.status = AppointmentStatus.COMPLETED

            NotificationService.create_notification(
                db=db,
                user_id=(
                    receiver_id
                    if user_id == caller_id
                    else caller_id
                ),
                title="Consultation Completed",
                message="The video consultation has been completed.",
                notification_type=NotificationType.VIDEO_CALL,
            )

        db.commit()
        db.refresh(call)

        return call
