import socketio
from typing import cast
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal

from app.models.chat import ChatMessage

from app.services.chat_service import ChatService
from app.services.notification_service import NotificationService
from app.services.socket_service import SocketService

from app.models.notification import NotificationType

from app.sockets.socket_manager import (
    sio,
    socket_app,
    connected_users,
)


# ==========================================================
# JWT
# ==========================================================

def verify_token(token: str):

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )

        return payload

    except JWTError:

        return None


# ==========================================================
# DATABASE
# ==========================================================

def get_db() -> Session:

    return SessionLocal()


# ==========================================================
# GET SOCKET USER
# ==========================================================

def get_socket_user_id(
    data: dict | None,
):

    if not data:

        return None

    token = data.get("token")

    if not token:

        return None

    payload = verify_token(token)

    if not payload:

        return None

    try:

        return int(payload["sub"])

    except (
        KeyError,
        TypeError,
        ValueError,
    ):

        return None


# ==========================================================
# CONNECT
# ==========================================================

@sio.event
async def connect(
    sid,
    environ,
    auth,
):

    if not auth:

        return False

    token = auth.get("token")

    if not token:

        return False

    payload = verify_token(token)

    if not payload:

        return False

    try:

        user_id = int(
            payload["sub"]
        )

    except (
        KeyError,
        TypeError,
        ValueError,
    ):

        return False

    connected_users[user_id] = {
        "sid": sid,
        "online": True,
    }

    print(
        f"User {user_id} connected"
    )

    return True


# ==========================================================
# DISCONNECT
# ==========================================================

@sio.event
async def disconnect(
    sid,
):

    for user_id, socket_data in list(
        connected_users.items()
    ):

        if socket_data.get("sid") == sid:

            connected_users[user_id][
                "online"
            ] = False

            del connected_users[user_id]

            print(
                f"User {user_id} disconnected"
            )

            break


# ==========================================================
# PING
# ==========================================================

@sio.event
async def ping(
    sid,
    data,
):

    await sio.emit(
        "pong",
        {
            "message":
                "Connected successfully"
        },
        room=sid,
    )


# ==========================================================
# SEND MESSAGE
# ==========================================================

@sio.event
async def send_message(
    sid,
    data,
):

    if not data:

        await sio.emit(
            "error",
            {
                "message":
                    "Message data is required"
            },
            room=sid,
        )

        return

    sender_id = get_socket_user_id(
        data
    )

    if sender_id is None:

        await sio.emit(
            "error",
            {
                "message":
                    "Invalid or missing token"
            },
            room=sid,
        )

        return

    case_id = data.get(
        "case_id"
    )

    receiver_id = data.get(
        "receiver_id"
    )

    message = data.get(
        "message"
    )

    if not case_id:

        await sio.emit(
            "error",
            {
                "message":
                    "case_id is required"
            },
            room=sid,
        )

        return

    if not receiver_id:

        await sio.emit(
            "error",
            {
                "message":
                    "receiver_id is required"
            },
            room=sid,
        )

        return

    if not message:

        await sio.emit(
            "error",
            {
                "message":
                    "message is required"
            },
            room=sid,
        )

        return

    db = get_db()

    try:

        # --------------------------------------------------
        # CREATE MESSAGE
        # --------------------------------------------------

        chat = ChatService.create_message(
            db=db,
            case_id=int(case_id),
            sender_id=sender_id,
            receiver_id=int(receiver_id),
            message=message,
        )

        # --------------------------------------------------
        # NOTIFICATION
        # --------------------------------------------------

        notification = (
            NotificationService.create_notification(
                db=db,
                user_id=int(receiver_id),
                title="New Message",
                message=(
                    f"You received a new message "
                    f"in Case #{chat.case_id}."
                ),
                notification_type=(
                    NotificationType.CHAT
                ),
            )
        )

        # --------------------------------------------------
        # SEND NOTIFICATION
        # --------------------------------------------------

        await SocketService.notify(
            user_id=int(receiver_id),
            payload={
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "type": (
                    notification
                    .notification_type
                    .value
                ),
                "is_read": notification.is_read,
                "created_at": (
                    notification
                    .created_at
                    .isoformat()
                ),
            },
        )

        # --------------------------------------------------
        # MESSAGE PAYLOAD
        # --------------------------------------------------

        message_payload = {

            "id": chat.id,

            "case_id":
                chat.case_id,

            "sender_id":
                chat.sender_id,

            "receiver_id":
                chat.receiver_id,

            "message":
                chat.message,

            "attachment_url":
                chat.attachment_url,

            "attachment_name":
                chat.attachment_name,

            "attachment_type":
                chat.attachment_type,

            "is_read":
                chat.is_read,

            "created_at":
                chat.created_at.isoformat(),
        }

        room_name = (
            f"case_{chat.case_id}"
        )

        # --------------------------------------------------
        # BROADCAST TO CASE
        # --------------------------------------------------

        await sio.emit(
            "new_message",
            message_payload,
            room=room_name,
        )

        # --------------------------------------------------
        # CONFIRM TO SENDER
        # --------------------------------------------------

        await sio.emit(
            "message_sent",
            message_payload,
            room=sid,
        )

    except Exception as error:

        print(
            f"Socket message error: {error}"
        )

        await sio.emit(
            "error",
            {
                "message": str(error)
            },
            room=sid,
        )

    finally:

        db.close()


# ==========================================================
# JOIN CASE
# ==========================================================

@sio.event
async def join_case(
    sid,
    data,
):

    user_id = get_socket_user_id(
        data
    )

    if user_id is None:

        await sio.emit(
            "error",
            {
                "message":
                    "Invalid or missing token"
            },
            room=sid,
        )

        return

    if not data or "case_id" not in data:

        await sio.emit(
            "error",
            {
                "message":
                    "case_id is required"
            },
            room=sid,
        )

        return

    db = get_db()

    try:

        case_id = int(
            data["case_id"]
        )

        # --------------------------------------------------
        # CENTRALIZED AUTHORIZATION
        # --------------------------------------------------

        ChatService.validate_case(
            db=db,
            case_id=case_id,
            user_id=user_id,
        )

        room_name = (
            f"case_{case_id}"
        )

        await sio.enter_room(
            sid,
            room_name,
        )

        print(
            f"User {user_id} joined {room_name}"
        )

    except Exception as error:

        await sio.emit(
            "error",
            {
                "message":
                    str(error)
            },
            room=sid,
        )

    finally:

        db.close()


# ==========================================================
# LEAVE CASE
# ==========================================================

@sio.event
async def leave_case(
    sid,
    data,
):

    if not data or "case_id" not in data:

        return

    try:

        case_id = int(
            data["case_id"]
        )

    except (
        TypeError,
        ValueError,
    ):

        return

    room_name = (
        f"case_{case_id}"
    )

    await sio.leave_room(
        sid,
        room_name,
    )


# ==========================================================
# TYPING
# ==========================================================

@sio.event
async def typing(
    sid,
    data,
):

    user_id = get_socket_user_id(
        data
    )

    if user_id is None:

        await sio.emit(
            "error",
            {
                "message":
                    "Invalid or missing token"
            },
            room=sid,
        )

        return

    if not data or "case_id" not in data:

        return

    try:

        case_id = int(
            data["case_id"]
        )

    except (
        TypeError,
        ValueError,
    ):

        return

    db = get_db()

    try:

        # Make sure this user belongs
        # to this case.

        ChatService.validate_case(
            db=db,
            case_id=case_id,
            user_id=user_id,
        )

        room_name = (
            f"case_{case_id}"
        )

        await sio.emit(
            "user_typing",
            {
                "user_id":
                    user_id
            },
            room=room_name,
            skip_sid=sid,
        )

    except Exception:

        return

    finally:

        db.close()


# ==========================================================
# STOP TYPING
# ==========================================================

@sio.event
async def stop_typing(
    sid,
    data,
):

    user_id = get_socket_user_id(
        data
    )

    if user_id is None:

        return

    if not data or "case_id" not in data:

        return

    try:

        case_id = int(
            data["case_id"]
        )

    except (
        TypeError,
        ValueError,
    ):

        return

    db = get_db()

    try:

        ChatService.validate_case(
            db=db,
            case_id=case_id,
            user_id=user_id,
        )

        room_name = (
            f"case_{case_id}"
        )

        await sio.emit(
            "user_stop_typing",
            {
                "user_id":
                    user_id
            },
            room=room_name,
            skip_sid=sid,
        )

    except Exception:

        return

    finally:

        db.close()


# ==========================================================
# MARK READ
# ==========================================================

@sio.event
async def mark_read(
    sid,
    data,
):

    user_id = get_socket_user_id(
        data
    )

    if user_id is None:

        await sio.emit(
            "error",
            {
                "message":
                    "Invalid or missing token"
            },
            room=sid,
        )

        return

    if not data or "message_id" not in data:

        await sio.emit(
            "error",
            {
                "message":
                    "message_id is required"
            },
            room=sid,
        )

        return

    db = get_db()

    try:

        message = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.id ==
                int(data["message_id"])
            )
            .first()
        )

        if not message:

            await sio.emit(
                "error",
                {
                    "message":
                        "Message not found"
                },
                room=sid,
            )

            return

        # --------------------------------------------------
        # ONLY RECEIVER CAN MARK AS READ
        # --------------------------------------------------

        if cast(int, message.receiver_id) != user_id:

            await sio.emit(
                "error",
                {
                    "message":
                        "Only the receiver can "
                        "mark this message as read."
                },
                room=sid,
            )

            return

        setattr(
            message,
            "is_read",
            True,
        )

        db.commit()
        db.refresh(message)

        room_name = (
            f"case_{message.case_id}"
        )

        await sio.emit(
            "message_read",
            {
                "message_id":
                    message.id,
                "is_read":
                    True,
            },
            room=room_name,
        )

    except Exception as error:

        await sio.emit(
            "error",
            {
                "message":
                    str(error)
            },
            room=sid,
        )

    finally:

        db.close()


# ==========================================================
# USER STATUS
# ==========================================================

@sio.event
async def user_status(
    sid,
    data,
):

    if not data or "user_id" not in data:

        await sio.emit(
            "error",
            {
                "message":
                    "user_id is required"
            },
            room=sid,
        )

        return

    try:

        user_id = int(
            data["user_id"]
        )

    except (
        TypeError,
        ValueError,
    ):

        await sio.emit(
            "error",
            {
                "message":
                    "Invalid user_id"
            },
            room=sid,
        )

        return

    user = connected_users.get(
        user_id
    )

    await sio.emit(
        "status",
        {
            "user_id":
                user_id,
            "online":
                user is not None,
        },
        room=sid,
    )