from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.case import Case
from app.models.user import User, UserRole
from app.schemas.case import (
    CaseCreate,
    CaseResponse,
    CaseUpdate,
)


router = APIRouter(
    prefix="/cases",
    tags=["Cases"]
)


@router.post(
    "",
    response_model=CaseResponse,
    status_code=status.HTTP_201_CREATED
)
def create_case(
    case_data: CaseCreate,
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    new_case = Case(
        client_id=current_user.id,
        title=case_data.title,
        case_type=case_data.case_type,
        description=case_data.description,
        urgency=case_data.urgency,
        incident_date=case_data.incident_date,
        incident_location=case_data.incident_location,
    )

    db.add(new_case)
    db.commit()
    db.refresh(new_case)

    return new_case


@router.get(
    "",
    response_model=list[CaseResponse]
)
def get_my_cases(
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    return (
        db.query(Case)
        .filter(Case.client_id == current_user.id)
        .order_by(Case.created_at.desc())
        .all()
    )


@router.get(
    "/{case_id}",
    response_model=CaseResponse
)
def get_case(
    case_id: int,
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    case = (
        db.query(Case)
        .filter(
            Case.id == case_id,
            Case.client_id == current_user.id
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    return case


@router.put(
    "/{case_id}",
    response_model=CaseResponse
)
def update_case(
    case_id: int,
    case_data: CaseUpdate,
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    case = (
        db.query(Case)
        .filter(
            Case.id == case_id,
            Case.client_id == current_user.id
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    update_data = case_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(case, field, value)

    db.commit()
    db.refresh(case)

    return case