from typing import cast

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageRead,
    ChatMessageResponse,
    ChatHistoryResponse,
)
from app.services.chat_service import ChatService


router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.post(
    "/send",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    message_data: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ChatService.create_message(
        db=db,
        case_id=message_data.case_id,
        sender_id=cast(int, current_user.id),
        receiver_id=message_data.receiver_id,
        message=message_data.message,
    )


@router.get(
    "/{case_id}",
    response_model=ChatHistoryResponse,
)
def get_messages(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ChatService.get_chat_history(
        db=db,
        case_id=case_id,
        user_id=cast(int, current_user.id),
    )


@router.patch(
    "/{message_id}/read",
    response_model=ChatMessageResponse,
)
def mark_as_read(
    message_id: int,
    read_data: ChatMessageRead,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return ChatService.mark_message_read(
        db=db,
        message_id=message_id,
        user_id=cast(int, current_user.id),
        is_read=read_data.is_read,
    )


@router.delete(
    "/{message_id}"
)
def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ChatService.delete_message(
        db=db,
        message_id=message_id,
        user_id=cast(int, current_user.id),
    )

    return {
        "message": "Message deleted successfully."
    }