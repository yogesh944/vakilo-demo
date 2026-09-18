from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.models.client_profile import ClientProfile
from app.models.user import User, UserRole
from app.schemas.client import (
    ClientProfileCreate,
    ClientProfileResponse,
    ClientProfileUpdate,
)


router = APIRouter(
    prefix="/clients",
    tags=["Clients"]
)


@router.post(
    "/profile",
    response_model=ClientProfileResponse,
    status_code=status.HTTP_201_CREATED
)
def create_client_profile(
    profile_data: ClientProfileCreate,
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    existing_profile = (
        db.query(ClientProfile)
        .filter(ClientProfile.user_id == current_user.id)
        .first()
    )

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Client profile already exists"
        )

    profile = ClientProfile(
        user_id=current_user.id,
        address=profile_data.address,
        city=profile_data.city,
        state=profile_data.state,
        preferred_language=profile_data.preferred_language,
        bio=profile_data.bio,
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile


@router.get(
    "/profile",
    response_model=ClientProfileResponse
)
def get_client_profile(
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    profile = (
        db.query(ClientProfile)
        .filter(ClientProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found"
        )

    return profile


@router.put(
    "/profile",
    response_model=ClientProfileResponse
)
def update_client_profile(
    profile_data: ClientProfileUpdate,
    current_user: User = Depends(
        require_role([UserRole.CLIENT])
    ),
    db: Session = Depends(get_db)
):
    profile = (
        db.query(ClientProfile)
        .filter(ClientProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client profile not found"
        )

    update_data = profile_data.model_dump(
        exclude_unset=True
    )

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return profile