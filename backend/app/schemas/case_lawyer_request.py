from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.case_lawyer_request import (
    LawyerRequestStatus,
)


class LawyerRequestCreate(BaseModel):
    lawyer_id: int
    client_message: str | None = None


class LawyerRequestResponse(BaseModel):
    id: int
    case_id: int
    client_id: int
    lawyer_id: int

    status: LawyerRequestStatus

    client_message: str | None = None
    lawyer_message: str | None = None

    created_at: datetime
    updated_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class LawyerRequestDecision(BaseModel):
    status: LawyerRequestStatus
    lawyer_message: str | None = None