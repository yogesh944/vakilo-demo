from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role

from app.models.case import Case, CaseStatus
from app.models.lawyer_profile import LawyerProfile
from app.models.user import User, UserRole


router = APIRouter(
    prefix="/cases",
    tags=["Case Assignment"],
)


# ==========================================================
# CLIENT SELECTS LAWYER
# ==========================================================

@router.post(
    "/{case_id}/select-lawyer/{lawyer_id}"
)
def select_lawyer(
    case_id: int,
    lawyer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
):
    client_id = cast(
        int,
        current_user.id,
    )

    # ------------------------------------------------------
    # Find client's case
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
    # Make sure AI analysis is complete
    # ------------------------------------------------------

    recommended_specialization = cast(
        str | None,
        case.recommended_specialization,
    )

    if recommended_specialization is None or recommended_specialization == "":

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Complete the AI case analysis "
                "before selecting a lawyer."
            ),
        )

    # ------------------------------------------------------
    # Don't allow reassignment
    # ------------------------------------------------------

    if case.lawyer_id is not None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A lawyer has already been selected "
                "for this case."
            ),
        )

    # ------------------------------------------------------
    # Find lawyer user
    # ------------------------------------------------------

    lawyer = (
        db.query(User)
        .filter(
            User.id == lawyer_id,
            User.role == UserRole.LAWYER,
            User.is_active.is_(True),
        )
        .first()
    )

    if lawyer is None:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer not found.",
        )

    # ------------------------------------------------------
    # Find lawyer profile
    # ------------------------------------------------------

    lawyer_profile = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.user_id == lawyer_id
        )
        .first()
    )

    if lawyer_profile is None:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This lawyer has not completed "
                "their professional profile."
            ),
        )

    # ------------------------------------------------------
    # Check availability
    # ------------------------------------------------------

    if lawyer_profile.is_available is False:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "This lawyer is currently "
                "not accepting new cases."
            ),
        )

    # ------------------------------------------------------
    # Assign lawyer
    # ------------------------------------------------------

    db.query(Case).filter(Case.id == case_id).update({
        Case.lawyer_id: lawyer_id,
        Case.status: CaseStatus.LAWYER_ASSIGNED.value
    })

    db.commit()
    db.refresh(case)

    # ------------------------------------------------------
    # Response
    # ------------------------------------------------------

    return {
        "message": (
            "Lawyer selected successfully."
        ),
        "case_id": case.id,
        "lawyer_id": lawyer_id,
        "status": case.status,
    }