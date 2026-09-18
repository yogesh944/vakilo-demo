from typing import cast

from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.video_call import (
    EndCallRequest,
    VideoCallCreate,
    VideoCallResponse,
)
from app.services.video_service import VideoService


router = APIRouter(
    prefix="/video",
    tags=["Video Call"],
)


# ==========================================================
# CREATE ROOM
# ==========================================================

@router.post(
    "/create-room",
    response_model=VideoCallResponse,
)
def create_room(
    data: VideoCallCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return VideoService.create_call(
        db=db,
        case_id=data.case_id,
        caller_id=cast(int, current_user.id),
        receiver_id=data.receiver_id,
    )


# ==========================================================
# START CALL
# ==========================================================

@router.patch(
    "/{room_id}/start",
    response_model=VideoCallResponse,
)
def start_call(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return VideoService.start_call(
        db=db,
        room_id=room_id,
        user_id=cast(int, current_user.id),
    )


# ==========================================================
# END CALL
# ==========================================================

@router.patch(
    "/{room_id}/end",
    response_model=VideoCallResponse,
)
def end_call(
    room_id: str,
    data: EndCallRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return VideoService.end_call(
        db=db,
        room_id=room_id,
        user_id=cast(int, current_user.id),
        status=data.status,
    )