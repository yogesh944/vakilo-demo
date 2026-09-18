from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
    Boolean,
)

from app.core.database import Base


class NotificationType(str, Enum):
    CHAT = "chat"
    APPOINTMENT = "appointment"
    PAYMENT = "payment"
    DOCUMENT = "document"
    VIDEO_CALL = "video_call"
    CASE = "case"
    SYSTEM = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    title = Column(
        String,
        nullable=False,
    )

    message = Column(
        String,
        nullable=False,
    )

    notification_type = Column(
        SqlEnum(NotificationType),
        nullable=False,
    )

    is_read = Column(
        Boolean,
        default=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )