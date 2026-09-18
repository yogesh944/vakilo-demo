from typing import Any, cast

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.notification import (
    Notification,
    NotificationType,
)
from app.models.user import User
from app.services.email_service import send_notification_email


class NotificationService:

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        title: str,
        message: str,
        notification_type: NotificationType,
    ) -> Notification:

        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        user = db.query(User).filter(User.id == user_id).first()
        if user is not None:
            send_notification_email(
                recipient=str(user.email),
                title=title,
                message=message,
            )

        return notification

    @staticmethod
    def get_notifications(
        db: Session,
        user_id: int,
    ):

        return (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .all()
        )

    @staticmethod
    def mark_as_read(
        db: Session,
        notification_id: int,
        user_id: int,
    ) -> Notification:

        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found."
            )

        if cast(int, notification.user_id) != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied."
            )

        setattr(notification, "is_read", True)

        db.commit()
        db.refresh(notification)

        return notification

    @staticmethod
    def unread_count(
        db: Session,
        user_id: int,
    ) -> int:

        return (
            db.query(Notification)
            .filter(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .count()
        )

    @staticmethod
    def delete_notification(
        db: Session,
        notification_id: int,
        user_id: int,
    ):

        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id)
            .first()
        )

        if not notification:
            raise HTTPException(
                status_code=404,
                detail="Notification not found."
            )

        if cast(int, notification.user_id) != user_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied."
            )

        db.delete(notification)
        db.commit()