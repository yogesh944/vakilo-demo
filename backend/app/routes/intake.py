from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role

from app.models.case import (
    Case,
    CaseStatus,
    CaseType,
)
from app.models.case_intake import (
    CaseIntakeMessage,
    IntakeSender,
)
from app.models.user import (
    User,
    UserRole,
)

from app.services.gemini import (
    generate_intake_question,
)

from app.schemas.intake import (
    IntakeConversationResponse,
    IntakeMessageCreate,
)


router = APIRouter(
    prefix="/cases",
    tags=["AI Legal Intake"],
)


# ==========================================================
# CONFIGURATION
# ==========================================================

MAX_INTAKE_QUESTIONS = 10


# ==========================================================
# GET CLIENT CASE
# ==========================================================

def get_client_case(
    case_id: int,
    user_id: int,
    db: Session,
) -> Case:

    case = (
        db.query(Case)
        .filter(
            Case.id == case_id,
            Case.client_id == user_id,
        )
        .first()
    )

    if case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found",
        )

    return case


# ==========================================================
# SEND INTAKE MESSAGE
# ==========================================================

@router.post(
    "/{case_id}/intake/messages",
    response_model=IntakeConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_intake_message(
    case_id: int,
    message_data: IntakeMessageCreate,
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db),
):

    user_id = cast(
        int,
        current_user.id,
    )

    # ------------------------------------------------------
    # Validate case ownership
    # ------------------------------------------------------

    case = get_client_case(
        case_id=case_id,
        user_id=user_id,
        db=db,
    )

    case_id_value = cast(
        int,
        case.id,
    )


    # ------------------------------------------------------
    # Check how many AI questions have already been asked
    # ------------------------------------------------------

    ai_question_count = (
        db.query(CaseIntakeMessage)
        .filter(
            CaseIntakeMessage.case_id == case_id_value,
            CaseIntakeMessage.sender == IntakeSender.AI,
        )
        .count()
    )


    # ------------------------------------------------------
    # HARD LIMIT
    #
    # If 10 questions have already been asked, don't allow
    # Gemini to generate Question 11.
    # ------------------------------------------------------

    if ai_question_count >= MAX_INTAKE_QUESTIONS:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The 10-question intake has already "
                "been completed."
            ),
        )


    # ------------------------------------------------------
    # Validate client message
    # ------------------------------------------------------

    client_message = (
        message_data.message.strip()
    )

    if not client_message:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty.",
        )


    # ------------------------------------------------------
    # Save client's answer
    # ------------------------------------------------------

    user_message = CaseIntakeMessage(
        case_id=case_id_value,
        sender=IntakeSender.USER,
        message=client_message,
    )

    db.add(user_message)


    # ------------------------------------------------------
    # Move case from DRAFT → INTAKE
    # ------------------------------------------------------

    current_status = cast(
        CaseStatus,
        case.status,
    )

    if current_status == CaseStatus.DRAFT:

        setattr(
            case,
            "status",
            CaseStatus.INTAKE,
        )


    db.commit()
    db.refresh(user_message)


    # ------------------------------------------------------
    # Count question AFTER saving the answer
    #
    # Example:
    #
    # Before answer:
    # AI questions = 0
    #
    # Gemini should now generate Question 1.
    #
    # If AI questions = 9:
    # Gemini should generate Question 10.
    # ------------------------------------------------------

    question_number = (
        ai_question_count + 1
    )


    # ------------------------------------------------------
    # If this is the answer to Question 10,
    #
    # DON'T ask Question 11.
    #
    # The client has just answered the 10th AI question.
    #
    # However, there is an important distinction:
    #
    # ai_question_count == 9
    #
    # means Gemini still needs to generate Question 10.
    #
    # Therefore we allow Gemini to generate Q10 here.
    # After the client answers Q10, the next request sees
    # ai_question_count == 10 and completes the intake.
    # ------------------------------------------------------


    # ------------------------------------------------------
    # Load complete conversation
    # ------------------------------------------------------

    messages = (
        db.query(CaseIntakeMessage)
        .filter(
            CaseIntakeMessage.case_id
            == case_id_value
        )
        .order_by(
            CaseIntakeMessage.created_at.asc()
        )
        .all()
    )


    conversation_history = [
        {
            "sender": cast(
                IntakeSender,
                message.sender,
            ).value,

            "message": cast(
                str,
                message.message,
            ),
        }
        for message in messages
    ]


    # ------------------------------------------------------
    # Ask Gemini
    # ------------------------------------------------------

    try:

        ai_response = generate_intake_question(
            case_title=cast(
                str,
                case.title,
            ),

            case_type=cast(
                CaseType,
                case.case_type,
            ).value,

            case_description=cast(
                str,
                case.description,
            ),

            conversation_history=conversation_history,

            question_number=question_number,
        )

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "AI intake service unavailable: "
                f"{str(error)}"
            ),
        )


    # ------------------------------------------------------
    # Gemini says intake is complete
    # ------------------------------------------------------

    if (
        ai_response.strip().upper()
        == "INTAKE_COMPLETE"
    ):

        return {
            "user_message": user_message,
            "ai_message": None,
            "intake_complete": True,
        }


    # ------------------------------------------------------
    # Extra safety:
    #
    # If Gemini somehow returns a question when this is
    # beyond the allowed limit, stop the intake.
    # ------------------------------------------------------

    if question_number > MAX_INTAKE_QUESTIONS:

        return {
            "user_message": user_message,
            "ai_message": None,
            "intake_complete": True,
        }


    # ------------------------------------------------------
    # Save Gemini question
    # ------------------------------------------------------

    ai_message = CaseIntakeMessage(
        case_id=case_id_value,
        sender=IntakeSender.AI,
        message=ai_response,
    )

    db.add(ai_message)

    db.commit()
    db.refresh(ai_message)


    # ------------------------------------------------------
    # Return conversation response
    # ------------------------------------------------------

    return {
        "user_message": user_message,
        "ai_message": ai_message,
        "intake_complete": False,
    }