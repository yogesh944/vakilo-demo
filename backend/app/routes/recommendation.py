from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role

from app.models.case import Case, CaseStatus
from app.models.user import User, UserRole

from app.services.lawyer_recommendation import (
    recommend_lawyers,
)


router = APIRouter(
    prefix="/cases",
    tags=["Lawyer Recommendation"],
)


# ==========================================================
# RECOMMENDED LAWYERS
# ==========================================================

@router.get(
    "/{case_id}/recommended-lawyers"
)
def get_recommended_lawyers(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
):

    # ------------------------------------------------------
    # Get current client ID
    # ------------------------------------------------------

    client_id = cast(
        int,
        current_user.id,
    )


    # ------------------------------------------------------
    # Get client's case
    # ------------------------------------------------------

    case = (
        db.query(Case)
        .filter(
            Case.id == case_id,
            Case.client_id == client_id,
        )
        .first()
    )


    if case is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )


    # ------------------------------------------------------
    # AI analysis must exist
    # ------------------------------------------------------

    if case.recommended_specialization is None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "AI case analysis must be completed "
                "before requesting lawyer recommendations."
            ),
        )


    # ------------------------------------------------------
    # Case must be ready for lawyer matching
    # ------------------------------------------------------

    case_status = cast(
        CaseStatus,
        case.status,
    )

    allowed_statuses = {
        CaseStatus.LAWYER_MATCHING,
        CaseStatus.LAWYER_ASSIGNED,
        CaseStatus.ACTIVE,
    }

    if case_status not in allowed_statuses:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This case is not ready for "
                "lawyer recommendations."
            ),
        )


    # ------------------------------------------------------
    # Get recommended lawyers
    # ------------------------------------------------------

    try:

        lawyers = recommend_lawyers(
            db,
            case,
        )

    except Exception as error:

        print(
            f"Lawyer recommendation error: {error}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Unable to generate lawyer "
                "recommendations."
            ),
        )


    # ------------------------------------------------------
    # Return recommendations
    # ------------------------------------------------------

    return {
        "case_id": case_id,
        "legal_category": (
            case.legal_category
        ),
        "recommended_specialization": (
            case.recommended_specialization
        ),
        "lawyers": lawyers,
    }