from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role

from app.models.case import (
    Case,
    CaseStatus,
    CaseUrgency,
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
    generate_case_analysis,
)

from app.schemas.case_analysis import (
    CaseAnalysisResponse,
)


router = APIRouter(
    prefix="/cases",
    tags=["AI Case Analysis"],
)


MAX_INTAKE_QUESTIONS = 10


# ==========================================================
# CLIENT CASE
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
            detail="Case not found.",
        )

    return case


# ==========================================================
# ANALYZE CASE
# ==========================================================

@router.post(
    "/{case_id}/analyze",
    response_model=CaseAnalysisResponse,
)
def analyze_case(
    case_id: int,
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
    # Get case
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
    # Get AI intake questions
    # ------------------------------------------------------

    ai_messages = (
        db.query(CaseIntakeMessage)
        .filter(
            CaseIntakeMessage.case_id == case_id_value,
            CaseIntakeMessage.sender == IntakeSender.AI,
        )
        .count()
    )


    # ------------------------------------------------------
    # Intake must have at least one question
    # ------------------------------------------------------

    if ai_messages == 0:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "AI intake has not started yet."
            ),
        )


    # ------------------------------------------------------
    # Prevent analysis before the maximum intake is done
    #
    # We normally expect 10 questions.
    #
    # However, Gemini may return INTAKE_COMPLETE earlier
    # if enough information was collected.
    #
    # Therefore we do not strictly require 10 here.
    # The frontend should only call this after intake_complete.
    # ------------------------------------------------------


    # ------------------------------------------------------
    # Get complete conversation
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
    # Generate AI analysis
    # ------------------------------------------------------

    try:

        analysis = generate_case_analysis(
            case_title=cast(
                str,
                case.title,
            ),

            case_type=cast(
                str,
                case.case_type.value,
            ),

            case_description=cast(
                str,
                case.description,
            ),

            conversation_history=conversation_history,
        )

    except Exception as error:

        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "AI case analysis service unavailable: "
                f"{str(error)}"
            ),
        )


    # ======================================================
    # SAVE AI ANALYSIS
    # ======================================================

    ai_summary = str(
        analysis["ai_summary"]
    )

    legal_category = str(
        analysis["legal_category"]
    )

    recommended_specialization = str(
        analysis[
            "recommended_specialization"
        ]
    )


    # ------------------------------------------------------
    # Convert document list to database Text
    # ------------------------------------------------------

    missing_documents_list = analysis[
        "missing_documents"
    ]

    missing_documents = "\n".join(
        [
            f"- {str(document)}"
            for document in missing_documents_list
        ]
    )


    # ------------------------------------------------------
    # Convert next steps list to database Text
    # ------------------------------------------------------

    next_steps_list = analysis[
        "next_steps"
    ]

    next_steps = "\n".join(
        [
            f"{index}. {str(step)}"
            for index, step in enumerate(
                next_steps_list,
                start=1,
            )
        ]
    )


    # ------------------------------------------------------
    # Urgency
    # ------------------------------------------------------

    urgency_value = str(
        analysis["urgency"]
    ).lower().strip()


    allowed_urgencies = {
        "low",
        "medium",
        "high",
        "emergency",
    }

    if urgency_value not in allowed_urgencies:

        urgency_value = "medium"


    # ======================================================
    # UPDATE CASE
    # ======================================================

    setattr(case, "ai_summary", ai_summary)
    setattr(case, "legal_category", legal_category)
    setattr(
        case,
        "recommended_specialization",
        recommended_specialization,
    )
    setattr(case, "missing_documents", missing_documents)
    setattr(case, "next_steps", next_steps)
    setattr(case, "urgency", CaseUrgency(urgency_value))


    # ------------------------------------------------------
    # Move case forward
    # ------------------------------------------------------

    current_status = cast(
        CaseStatus,
        case.status,
    )

    if current_status in {
        CaseStatus.DRAFT,
        CaseStatus.INTAKE,
    }:

        setattr(
            case,
            "status",
            CaseStatus.LAWYER_MATCHING,
        )


    db.commit()
    db.refresh(case)


    # ======================================================
    # RETURN ANALYSIS
    # ======================================================

    return {
        "ai_summary": ai_summary,

        "legal_category": (
            legal_category
        ),

        "recommended_specialization": (
            recommended_specialization
        ),

        "missing_documents": (
            missing_documents_list
        ),

        "next_steps": (
            next_steps_list
        ),

        "urgency": urgency_value,
    }