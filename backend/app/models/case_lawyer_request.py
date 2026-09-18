import enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.sql import func

from app.core.database import Base


class LawyerRequestStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class CaseLawyerRequest(Base):
    __tablename__ = "case_lawyer_requests"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    case_id = Column(
        Integer,
        ForeignKey(
            "cases.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    client_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    lawyer_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    status = Column(
        Enum(LawyerRequestStatus),
        default=LawyerRequestStatus.PENDING,
        nullable=False,
        index=True,
    )

    client_message = Column(
        Text,
        nullable=True,
    )

    lawyer_message = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )