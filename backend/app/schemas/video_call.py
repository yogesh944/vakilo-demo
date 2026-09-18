from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.video_call import CallStatus


class VideoCallCreate(BaseModel):
    case_id: int
    receiver_id: int


class VideoCallResponse(BaseModel):
    id: int
    case_id: int
    caller_id: int
    receiver_id: int
    room_id: str
    status: CallStatus
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EndCallRequest(BaseModel):
    status: CallStatus = CallStatus.ENDED