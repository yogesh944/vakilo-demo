from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.case import Case
from app.models.user import User, UserRole


router = APIRouter(
    prefix="/lawyer",
    tags=["Lawyer Cases"],
)


@router.get("/cases")
def get_my_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only lawyers can access this endpoint
    if current_user.role is not UserRole.LAWYER:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=403,
            detail="Only lawyers can access their cases.",
        )

    cases = (
        db.query(Case)
        .filter(
            Case.lawyer_id == current_user.id
        )
        .order_by(
            Case.updated_at.desc()
        )
        .all()
    )

    return cases