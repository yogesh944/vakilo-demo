from typing import cast

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.chat import ChatMessage
from app.models.user import User, UserRole


class ChatService:

    # ==========================================================
    # VALIDATE CASE ACCESS
    # ==========================================================

    @staticmethod
    def validate_case(
        db: Session,
        case_id: int,
        user_id: int,
    ) -> Case:

        case = (
            db.query(Case)
            .filter(
                Case.id == case_id
            )
            .first()
        )

        if not case:
            raise HTTPException(
                status_code=404,
                detail="Case not found."
            )

        client_id = cast(
            int,
            case.client_id
        )

        lawyer_id = cast(
            int | None,
            case.lawyer_id
        )

        # ------------------------------------------------------
        # A chat requires an assigned lawyer
        # ------------------------------------------------------

        if lawyer_id is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Chat is unavailable because "
                    "no lawyer has been assigned to this case."
                )
            )

        # ------------------------------------------------------
        # Only assigned client or assigned lawyer
        # ------------------------------------------------------

        if user_id not in {
            client_id,
            lawyer_id,
        }:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You are not authorized to access "
                    "this case conversation."
                )
            )

        return case


    # ==========================================================
    # CREATE MESSAGE
    # ==========================================================

    @staticmethod
    def create_message(
        db: Session,
        case_id: int,
        sender_id: int,
        receiver_id: int,
        message: str,
        attachment_url: str | None = None,
        attachment_name: str | None = None,
        attachment_type: str | None = None,
    ) -> ChatMessage:

        # ------------------------------------------------------
        # Validate case + sender access
        # ------------------------------------------------------

        case = ChatService.validate_case(
            db=db,
            case_id=case_id,
            user_id=sender_id,
        )

        client_id = cast(
            int,
            case.client_id
        )

        lawyer_id = cast(
            int,
            case.lawyer_id
        )

        # ------------------------------------------------------
        # Validate message
        # ------------------------------------------------------

        if not message or not message.strip():

            raise HTTPException(
                status_code=400,
                detail="Message cannot be empty."
            )

        cleaned_message = message.strip()

        # ------------------------------------------------------
        # Sender must be one of the two case participants
        # ------------------------------------------------------

        if sender_id not in {
            client_id,
            lawyer_id,
        }:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Sender is not a participant "
                    "in this case."
                )
            )

        # ------------------------------------------------------
        # Receiver must be the other participant
        # ------------------------------------------------------

        if receiver_id not in {
            client_id,
            lawyer_id,
        }:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Receiver is not part "
                    "of this case."
                )
            )

        # ------------------------------------------------------
        # Prevent self messaging
        # ------------------------------------------------------

        if receiver_id == sender_id:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Cannot send a message to yourself."
                )
            )

        # ------------------------------------------------------
        # Make sure the receiver is actually the other party
        # ------------------------------------------------------

        expected_receiver_id = (
            lawyer_id
            if sender_id == client_id
            else client_id
        )

        if receiver_id != expected_receiver_id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "You can only message the "
                    "other participant in this case."
                )
            )

        # ------------------------------------------------------
        # Verify receiver still exists
        # ------------------------------------------------------

        receiver = (
            db.query(User)
            .filter(
                User.id == receiver_id
            )
            .first()
        )

        if not receiver:

            raise HTTPException(
                status_code=404,
                detail="Receiver not found."
            )

        # ------------------------------------------------------
        # Verify roles
        # ------------------------------------------------------

        sender = (
            db.query(User)
            .filter(
                User.id == sender_id
            )
            .first()
        )

        if not sender:

            raise HTTPException(
                status_code=404,
                detail="Sender not found."
            )

        valid_roles = {
            UserRole.CLIENT,
            UserRole.LAWYER,
        }

        if (
            sender.role not in valid_roles
            or receiver.role not in valid_roles
        ):

            raise HTTPException(
                status_code=403,
                detail=(
                    "Only clients and lawyers can "
                    "participate in case conversations."
                )
            )

        # ------------------------------------------------------
        # Create message
        # ------------------------------------------------------

        chat = ChatMessage(
            case_id=case_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=cleaned_message,
            attachment_url=attachment_url,
            attachment_name=attachment_name,
            attachment_type=attachment_type,
        )

        db.add(chat)
        db.commit()
        db.refresh(chat)

        return chat


    # ==========================================================
    # GET CHAT HISTORY
    # ==========================================================

    @staticmethod
    def get_chat_history(
        db: Session,
        case_id: int,
        user_id: int,
        page: int = 1,
        page_size: int = 20,
    ):

        if page < 1:
            page = 1

        if page_size < 1:
            page_size = 20

        if page_size > 100:
            page_size = 100

        # ------------------------------------------------------
        # Verify user can access case
        # ------------------------------------------------------

        ChatService.validate_case(
            db=db,
            case_id=case_id,
            user_id=user_id,
        )

        # ------------------------------------------------------
        # Total messages
        # ------------------------------------------------------

        total = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.case_id == case_id
            )
            .count()
        )

        # ------------------------------------------------------
        # Paginated messages
        # ------------------------------------------------------

        messages = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.case_id == case_id
            )
            .order_by(
                ChatMessage.created_at.desc()
            )
            .offset(
                (page - 1) * page_size
            )
            .limit(
                page_size
            )
            .all()
        )

        # Return chronological order
        messages.reverse()

        return {
            "messages": messages,
            "total": total,
            "page": page,
            "page_size": page_size,
        }


    # ==========================================================
    # MARK MESSAGE AS READ
    # ==========================================================

    @staticmethod
    def mark_message_read(
        db: Session,
        message_id: int,
        user_id: int,
        is_read: bool,
    ) -> ChatMessage:

        message = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.id == message_id
            )
            .first()
        )

        if not message:

            raise HTTPException(
                status_code=404,
                detail="Message not found."
            )

        receiver_id = cast(
            int,
            message.receiver_id
        )

        # ------------------------------------------------------
        # Only receiver can mark message as read
        # ------------------------------------------------------

        if receiver_id != user_id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Only the receiver can "
                    "mark the message as read."
                )
            )

        setattr(
            message,
            "is_read",
            is_read
        )

        db.commit()
        db.refresh(message)

        return message


    # ==========================================================
    # DELETE MESSAGE
    # ==========================================================

    @staticmethod
    def delete_message(
        db: Session,
        message_id: int,
        user_id: int,
    ):

        message = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.id == message_id
            )
            .first()
        )

        if not message:

            raise HTTPException(
                status_code=404,
                detail="Message not found."
            )

        sender_id = cast(
            int,
            message.sender_id
        )

        # ------------------------------------------------------
        # Only sender can delete
        # ------------------------------------------------------

        if sender_id != user_id:

            raise HTTPException(
                status_code=403,
                detail=(
                    "Only the sender can "
                    "delete this message."
                )
            )

        db.delete(message)
        db.commit()


    # ==========================================================
    # GET UNREAD COUNT
    # ==========================================================

    @staticmethod
    def get_unread_count(
        db: Session,
        user_id: int,
    ) -> int:

        return (
            db.query(ChatMessage)
            .filter(
                ChatMessage.receiver_id == user_id,
                ChatMessage.is_read.is_(False),
            )
            .count()
        )