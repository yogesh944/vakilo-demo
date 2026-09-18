from enum import Enum

from sqlalchemy import (
    Column,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class DocumentCategory(str, Enum):
    ID_PROOF = "id_proof"
    PROPERTY = "property"
    EVIDENCE = "evidence"
    AGREEMENT = "agreement"
    FIR = "fir"
    COURT_ORDER = "court_order"
    OTHER = "other"


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(
        Integer,
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )

    uploaded_by = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    file_name = Column(
        String(255),
        nullable=False,
    )

    storage_path = Column(
        String(500),
        nullable=False,
        unique=True,
    )

    file_type = Column(
        String(100),
        nullable=False,
    )

    file_size = Column(
        Integer,
        nullable=False,
    )

    category = Column(
        SQLEnum(DocumentCategory),
        nullable=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    case = relationship("Case")
    uploader = relationship("User")