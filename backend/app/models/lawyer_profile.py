from sqlalchemy import (
    Boolean,
    Column,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class LawyerProfile(Base):
    __tablename__ = "lawyer_profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    bar_registration_number = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    specialization = Column(
        String(255),
        nullable=False,
    )

    experience_years = Column(
        Integer,
        default=0,
    )

    consultation_fee = Column(
        Float,
        nullable=True,
    )

    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)

    languages = Column(
        String(255),
        nullable=True,
    )

    bio = Column(Text, nullable=True)

    rating = Column(
        Float,
        default=0.0,
    )

    total_reviews = Column(
        Integer,
        default=0,
    )

    is_available = Column(
        Boolean,
        default=True,
    )

    is_verified = Column(
        Boolean,
        default=False,
    )

    # Razorpay Route / Linked Account
    razorpay_linked_account_id = Column(
        String(100),
        unique=True,
        nullable=True,
    )

    razorpay_account_status = Column(
        String(50),
        default="not_connected",
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="lawyer_profile",
    )
