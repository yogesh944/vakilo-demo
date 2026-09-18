import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class CaseType(str, enum.Enum):
    CRIMINAL = "criminal"
    CIVIL = "civil"
    FAMILY = "family"
    PROPERTY = "property"
    CONSUMER = "consumer"
    CYBER = "cyber"
    CORPORATE = "corporate"
    OTHER = "other"


class CaseUrgency(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EMERGENCY = "emergency"


class CaseStatus(str, enum.Enum):
    DRAFT = "draft"
    INTAKE = "intake"
    LAWYER_MATCHING = "lawyer_matching"
    LAWYER_ASSIGNED = "lawyer_assigned"
    ACTIVE = "active"
    CLOSED = "closed"


class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)

    client_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    lawyer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    title = Column(
        String(200),
        nullable=False
    )

    case_type = Column(
        Enum(CaseType),
        nullable=False
    )

    description = Column(
        Text,
        nullable=False
    )

    ai_summary = Column(
         Text,
         nullable=True
    )

    legal_category = Column(
        String(100),
        nullable=True
    )

    recommended_specialization = Column(
        String(100),
        nullable=True
    )

    missing_documents = Column(
         Text,
         nullable=True
    )

    next_steps = Column(
        Text,
        nullable=True
    )

    urgency = Column(
        Enum(CaseUrgency),
        default=CaseUrgency.MEDIUM,
        nullable=False
    )

    status = Column(
        Enum(CaseStatus),
        default=CaseStatus.DRAFT,
        nullable=False
    )

    incident_date = Column(
        DateTime(timezone=True),
        nullable=True
    )

    incident_location = Column(
        String(255),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    

    client = relationship(
        "User",
        foreign_keys=[client_id]
    )

    lawyer = relationship(
        "User",
        foreign_keys=[lawyer_id]
    )

    messages = relationship(
        "ChatMessage",
        back_populates="case",
        cascade="all, delete-orphan",
    )