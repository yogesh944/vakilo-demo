from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.case import (
    CaseStatus,
    CaseType,
    CaseUrgency,
)


# ==========================================================
# CREATE CASE
# ==========================================================

class CaseCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=200,
    )

    case_type: CaseType

    description: str = Field(
        min_length=10,
    )

    urgency: CaseUrgency = CaseUrgency.MEDIUM

    incident_date: datetime | None = None

    incident_location: str | None = None


# ==========================================================
# UPDATE CASE
# ==========================================================

class CaseUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=3,
        max_length=200,
    )

    case_type: CaseType | None = None

    description: str | None = Field(
        default=None,
        min_length=10,
    )

    urgency: CaseUrgency | None = None

    incident_date: datetime | None = None

    incident_location: str | None = None


# ==========================================================
# CASE RESPONSE
# ==========================================================

class CaseResponse(BaseModel):
    id: int

    client_id: int

    lawyer_id: int | None

    title: str

    case_type: CaseType

    description: str

    urgency: CaseUrgency

    status: CaseStatus

    # ------------------------------------------------------
    # AI ANALYSIS
    # ------------------------------------------------------

    ai_summary: str | None = None

    legal_category: str | None = None

    recommended_specialization: str | None = None

    missing_documents: str | None = None

    next_steps: str | None = None

    # ------------------------------------------------------
    # INCIDENT INFORMATION
    # ------------------------------------------------------

    incident_date: datetime | None

    incident_location: str | None

    # ------------------------------------------------------
    # TIMESTAMPS
    # ------------------------------------------------------

    created_at: datetime

    updated_at: datetime | None

    model_config = ConfigDict(
        from_attributes=True
    )