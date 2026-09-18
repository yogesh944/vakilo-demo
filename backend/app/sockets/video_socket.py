from typing import Any, cast

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.video_call import VideoCall
from app.sockets.chat_socket import sio
from app.services.video_service import VideoService


def get_db() -> Session:
    return SessionLocal()


def verify_token(token: str | None):
    if not token:
        return None
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return None


def get_user_id(token: str | None) -> int | None:
    payload = verify_token(token)
    if not payload:
        return None
    try:
        return int(payload["sub"])
    except (KeyError, TypeError, ValueError):
        return None


def verify_room_participant(
    db: Session,
    room_id: str,
    user_id: int,
) -> VideoCall | None:
    call = (
        db.query(VideoCall)
        .filter(VideoCall.room_id == room_id)
        .first()
    )
    if not call:
        return None

    caller_id = cast(int, call.caller_id)
    receiver_id = cast(int, call.receiver_id)
    if user_id not in [caller_id, receiver_id]:
        return None

    # Authorization is based only on the active consultation and participant.
    # There is intentionally no appointment time-window restriction.
    try:
        VideoService.get_active_consultation(
            db=db,
            case_id=cast(int, call.case_id),
            user_id=user_id,
        )
    except Exception:
        return None

    return call


async def emit_video_error(sid: str, message: str) -> None:
    await sio.emit("video_error", {"message": message}, room=sid)


@sio.event
async def join_video(sid, data):
    if not data:
        await emit_video_error(sid, "Video connection data is required.")
        return

    token = data.get("token")
    room_id = data.get("room_id")
    user_id = get_user_id(token)

    if user_id is None:
        await emit_video_error(sid, "Invalid or missing token.")
        return
    if not room_id:
        await emit_video_error(sid, "room_id is required.")
        return

    db = get_db()
    try:
        call = verify_room_participant(db, room_id, user_id)
        if call is None:
            await emit_video_error(
                sid,
                "Video consultation is unavailable. Make sure you are a participant in an active consultation.",
            )
            return

        await sio.enter_room(sid, room_id)
        await sio.emit(
            "user_joined",
            {"sid": sid, "user_id": user_id},
            room=room_id,
            skip_sid=sid,
        )
    finally:
        db.close()


async def authorize_signaling(
    sid: str,
    data: Any,
) -> tuple[int | None, str | None]:
    if not data:
        await emit_video_error(sid, "Video request data is required.")
        return None, None

    token = data.get("token")
    room_id = data.get("room_id")
    user_id = get_user_id(token)

    if user_id is None or not room_id:
        await emit_video_error(sid, "Invalid video request.")
        return None, None

    db = get_db()
    try:
        call = verify_room_participant(db, room_id, user_id)
        if call is None:
            await emit_video_error(
                sid,
                "Video consultation is unavailable. Make sure you are a participant in an active consultation.",
            )
            return None, None

        return user_id, room_id
    finally:
        db.close()


@sio.event
async def offer(sid, data):
    user_id, room_id = await authorize_signaling(sid, data)
    if user_id is None or room_id is None:
        return
    await sio.emit("offer", data, room=room_id, skip_sid=sid)


@sio.event
async def answer(sid, data):
    user_id, room_id = await authorize_signaling(sid, data)
    if user_id is None or room_id is None:
        return
    await sio.emit("answer", data, room=room_id, skip_sid=sid)


@sio.event
async def ice_candidate(sid, data):
    user_id, room_id = await authorize_signaling(sid, data)
    if user_id is None or room_id is None:
        return
    await sio.emit("ice_candidate", data, room=room_id, skip_sid=sid)


@sio.event
async def leave_video(sid, data):
    if not data:
        return

    user_id = get_user_id(data.get("token"))
    room_id = data.get("room_id")
    if user_id is None or not room_id:
        return

    db = get_db()
    try:
        call = (
            db.query(VideoCall)
            .filter(VideoCall.room_id == room_id)
            .first()
        )
        if not call:
            return

        caller_id = cast(int, call.caller_id)
        receiver_id = cast(int, call.receiver_id)
        if user_id not in [caller_id, receiver_id]:
            return
    finally:
        db.close()

    await sio.leave_room(sid, room_id)
    await sio.emit(
        "user_left",
        {"sid": sid, "user_id": user_id},
        room=room_id,
    )
