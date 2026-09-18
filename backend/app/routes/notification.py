from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import cast

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"],
)


@router.get(
    "/",
    response_model=list[NotificationResponse],
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    return NotificationService.get_notifications(
        db=db,
        user_id=cast(int, current_user.id),
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    return NotificationService.mark_as_read(
        db=db,
        notification_id=notification_id,
        user_id=cast(int, current_user.id),
    )


@router.get("/unread-count")
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    return {
        "unread": NotificationService.unread_count(
            db=db,
            user_id=cast(int, current_user.id),
        )
    }


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    NotificationService.delete_notification(
        db=db,
        notification_id=notification_id,
        user_id=cast(int, current_user.id),
    )

    return {
        "message": "Notification deleted successfully."
    }