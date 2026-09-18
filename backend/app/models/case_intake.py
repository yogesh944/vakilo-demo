import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
from sqlalchemy.sql import func

from app.core.database import Base


class IntakeSender(str, enum.Enum):
    USER = "user"
    AI = "ai"


class CaseIntakeMessage(Base):
    __tablename__ = "case_intake_messages"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(
        Integer,
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    sender = Column(
        Enum(IntakeSender),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )