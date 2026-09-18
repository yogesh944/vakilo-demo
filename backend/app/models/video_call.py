from datetime import datetime
from enum import Enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
)

from app.core.database import Base


class CallStatus(str, Enum):
    CREATED = "created"
    ONGOING = "ongoing"
    ENDED = "ended"
    MISSED = "missed"


class VideoCall(Base):
    __tablename__ = "video_calls"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(
        Integer,
        ForeignKey("cases.id"),
        nullable=False,
    )

    caller_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    receiver_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    room_id = Column(
        String,
        unique=True,
        nullable=False,
    )

    status = Column(
        SqlEnum(CallStatus),
        default=CallStatus.CREATED,
        nullable=False,
    )

    started_at = Column(
        DateTime,
        nullable=True,
    )

    ended_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )