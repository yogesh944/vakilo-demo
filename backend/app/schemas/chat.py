from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ChatMessageCreate(BaseModel):
    case_id: int
    receiver_id: int
    message: str


class ChatMessageRead(BaseModel):
    is_read: bool


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    sender_id: int
    receiver_id: int

    message: str

    attachment_url: str | None = None
    attachment_name: str | None = None
    attachment_type: str | None = None

    is_read: bool

    created_at: datetime


class ChatHistoryResponse(BaseModel):
    messages: list[ChatMessageResponse]

    total: int
    page: int
    page_size: int