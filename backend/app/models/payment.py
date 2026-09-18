from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    DateTime,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)

    case_id = Column(
        Integer,
        ForeignKey("cases.id"),
        nullable=False,
        index=True,
    )

    appointment_id = Column(
        Integer,
        ForeignKey("appointments.id"),
        nullable=True,
        index=True,
    )

    client_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    lawyer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
    )

    currency = Column(
        String(3),
        nullable=False,
        default="INR",
    )

    description = Column(
        Text,
        nullable=False,
    )

    due_date = Column(
        DateTime,
        nullable=True,
    )

    platform_fee_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("3.00"),
    )

    platform_fee_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    lawyer_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    status = Column(
        String(32),
        nullable=False,
        default="pending",
        index=True,
    )

    razorpay_order_id = Column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )

    razorpay_payment_id = Column(
        String(100),
        unique=True,
        nullable=True,
        index=True,
    )

    razorpay_signature = Column(
        String(255),
        nullable=True,
    )

    razorpay_transfer_id = Column(
        String(100),
        nullable=True,
        index=True,
    )

    transfer_status = Column(
        String(32),
        nullable=False,
        default="not_created",
    )

    paid_at = Column(
        DateTime,
        nullable=True,
    )

    settled_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )