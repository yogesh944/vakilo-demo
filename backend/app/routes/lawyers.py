from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role

from app.models.lawyer_profile import LawyerProfile
from app.models.user import User, UserRole

from app.schemas.lawyer import (
    LawyerProfileCreate,
    LawyerProfileResponse,
    LawyerProfileUpdate,
)


router = APIRouter(
    prefix="/lawyers",
    tags=["Lawyers"]
)


# ==========================================================
# CREATE LAWYER PROFILE
# ==========================================================

@router.post(
    "/profile",
    response_model=LawyerProfileResponse,
    status_code=status.HTTP_201_CREATED
)
def create_lawyer_profile(
    profile_data: LawyerProfileCreate,
    current_user: User = Depends(
        require_role([UserRole.LAWYER])
    ),
    db: Session = Depends(get_db)
):

    existing_profile = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.user_id == current_user.id
        )
        .first()
    )

    if existing_profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Lawyer profile already exists"
        )

    existing_bar_number = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.bar_registration_number
            == profile_data.bar_registration_number
        )
        .first()
    )

    if existing_bar_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bar registration number already registered"
        )

    profile = LawyerProfile(
        user_id=current_user.id,

        bar_registration_number=(
            profile_data.bar_registration_number
        ),

        specialization=(
            profile_data.specialization
        ),

        experience_years=(
            profile_data.experience_years
        ),

        consultation_fee=(
            profile_data.consultation_fee
        ),

        city=profile_data.city,
        state=profile_data.state,
        languages=profile_data.languages,
        bio=profile_data.bio,
    )

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {
        "id": profile.id,
        "user_id": current_user.id,

        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,

        "bar_registration_number":
            profile.bar_registration_number,

        "specialization":
            profile.specialization,

        "experience_years":
            profile.experience_years,

        "consultation_fee":
            profile.consultation_fee,

        "city": profile.city,
        "state": profile.state,
        "languages": profile.languages,
        "bio": profile.bio,

        "is_available":
            profile.is_available,

        "is_verified":
            profile.is_verified,

        "rating":
            profile.rating,

        "total_reviews":
            profile.total_reviews,
    }


# ==========================================================
# GET MY LAWYER PROFILE
# ==========================================================

@router.get(
    "/profile",
    response_model=LawyerProfileResponse
)
def get_lawyer_profile(
    current_user: User = Depends(
        require_role([UserRole.LAWYER])
    ),
    db: Session = Depends(get_db)
):

    profile = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer profile not found"
        )

    return {
        "id": profile.id,
        "user_id": current_user.id,

        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,

        "bar_registration_number":
            profile.bar_registration_number,

        "specialization":
            profile.specialization,

        "experience_years":
            profile.experience_years,

        "consultation_fee":
            profile.consultation_fee,

        "city": profile.city,
        "state": profile.state,
        "languages": profile.languages,
        "bio": profile.bio,

        "is_available":
            profile.is_available,

        "is_verified":
            profile.is_verified,

        "rating":
            profile.rating,

        "total_reviews":
            profile.total_reviews,
    }


# ==========================================================
# UPDATE MY LAWYER PROFILE
# ==========================================================

@router.put(
    "/profile",
    response_model=LawyerProfileResponse
)
def update_lawyer_profile(
    profile_data: LawyerProfileUpdate,

    current_user: User = Depends(
        require_role([UserRole.LAWYER])
    ),

    db: Session = Depends(get_db)
):

    profile = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.user_id == current_user.id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer profile not found"
        )

    data = profile_data.model_dump(
        exclude_unset=True
    )

    # ======================================================
    # UPDATE USER INFORMATION
    # ======================================================

    if "full_name" in data:
        current_user.full_name = data.pop(
            "full_name"
        )

    if "email" in data:
        new_email = data.pop("email")

        existing_user = (
            db.query(User)
            .filter(
                User.email == new_email,
                User.id != current_user.id
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        current_user.email = new_email

    if "phone" in data:
        new_phone = data.pop("phone")

        existing_user = (
            db.query(User)
            .filter(
                User.phone == new_phone,
                User.id != current_user.id
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )

        current_user.phone = new_phone

    # ======================================================
    # UPDATE LAWYER PROFILE
    # ======================================================

    for field, value in data.items():

        # Don't allow these to be modified
        # through the lawyer profile endpoint.
        if field in {
            "is_verified",
            "rating",
            "total_reviews",
            "bar_registration_number",
        }:
            continue

        setattr(
            profile,
            field,
            value
        )

    db.commit()

    db.refresh(current_user)
    db.refresh(profile)

    return {
        "id": profile.id,
        "user_id": current_user.id,

        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,

        "bar_registration_number":
            profile.bar_registration_number,

        "specialization":
            profile.specialization,

        "experience_years":
            profile.experience_years,

        "consultation_fee":
            profile.consultation_fee,

        "city": profile.city,
        "state": profile.state,
        "languages": profile.languages,
        "bio": profile.bio,

        "is_available":
            profile.is_available,

        "is_verified":
            profile.is_verified,

        "rating":
            profile.rating,

        "total_reviews":
            profile.total_reviews,
    }