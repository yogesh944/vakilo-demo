from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.case_intake import IntakeSender


class IntakeMessageCreate(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=5000
    )


class IntakeMessageResponse(BaseModel):
    id: int
    case_id: int
    sender: IntakeSender
    message: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

class IntakeConversationResponse(BaseModel):
    user_message: IntakeMessageResponse
    ai_message: IntakeMessageResponse | None
    intake_complete: bool