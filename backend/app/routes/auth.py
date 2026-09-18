from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    require_role,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.user import (
    UserLogin,
    UserRegister,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# ==========================================================
# REGISTER
# ==========================================================

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    # ------------------------------------------------------
    # Check existing email
    # ------------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(
            User.email == user_data.email
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # ------------------------------------------------------
    # Prevent public admin registration
    # ------------------------------------------------------

    if user_data.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin accounts cannot be created "
                "through public registration"
            ),
        )

    # ------------------------------------------------------
    # Create user
    # ------------------------------------------------------

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        phone=user_data.phone,
        hashed_password=hash_password(
            user_data.password
        ),
        role=user_data.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # ------------------------------------------------------
    # Create JWT immediately after registration
    # ------------------------------------------------------

    user_id = cast(
        int,
        new_user.id,
    )

    user_role = cast(
        UserRole,
        new_user.role,
    )

    access_token = create_access_token(
        data={
            "sub": str(user_id),
            "role": user_role.value,
        }
    )

    # ------------------------------------------------------
    # Return token + user
    # ------------------------------------------------------

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "full_name": cast(
                str,
                new_user.full_name,
            ),
            "email": cast(
                str,
                new_user.email,
            ),
            "phone": new_user.phone,
            "role": user_role.value,
            "is_active": cast(
                bool,
                new_user.is_active,
            ),
            "is_verified": cast(
                bool,
                new_user.is_verified,
            ),
        },
    }


# ==========================================================
# LOGIN
# ==========================================================

@router.post(
    "/login",
)
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db),
):
    # ------------------------------------------------------
    # Find user
    # ------------------------------------------------------

    normalized_email = login_data.email.strip().lower()
    user = (
        db.query(User)
        .filter(
            (User.email == normalized_email) | (User.email == login_data.email)
        )
        .first()
    )

    print(f"--> [LOGIN ATTEMPT] incoming_email='{login_data.email}', user_found={user is not None}")
    if user:
        pwd_match = verify_password(login_data.password, cast(str, user.hashed_password))
        print(f"--> [LOGIN ATTEMPT] user_id={user.id}, role={user.role}, is_active={user.is_active}, password_match={pwd_match}, input_len={len(login_data.password)}, input_repr={repr(login_data.password)}")

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Verify password
    # ------------------------------------------------------

    is_valid = verify_password(
        login_data.password,
        cast(
            str,
            user.hashed_password,
        ),
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # ------------------------------------------------------
    # Check active status
    # ------------------------------------------------------

    if user.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # ------------------------------------------------------
    # JWT
    # ------------------------------------------------------

    user_id = cast(
        int,
        user.id,
    )

    user_role = cast(
        UserRole,
        user.role,
    )

    access_token = create_access_token(
        data={
            "sub": str(user_id),
            "role": user_role.value,
        }
    )

    # ------------------------------------------------------
    # Response
    # ------------------------------------------------------

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "full_name": cast(
                str,
                user.full_name,
            ),
            "email": cast(
                str,
                user.email,
            ),
            "phone": user.phone,
            "role": user_role.value,
            "is_active": cast(
                bool,
                user.is_active,
            ),
            "is_verified": cast(
                bool,
                user.is_verified,
            ),
        },
    }


# ==========================================================
# CURRENT USER
# ==========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_my_profile(
    current_user: User = Depends(
        get_current_user
    ),
):
    return current_user


# ==========================================================
# CLIENT ONLY
# ==========================================================

@router.get(
    "/client-only",
)
def client_only(
    current_user: User = Depends(
        require_role(
            [UserRole.CLIENT]
        )
    ),
):
    return {
        "message": "Welcome Client",
        "user_id": current_user.id,
    }


# ==========================================================
# LAWYER ONLY
# ==========================================================

@router.get(
    "/lawyer-only",
)
def lawyer_only(
    current_user: User = Depends(
        require_role(
            [UserRole.LAWYER]
        )
    ),
):
    return {
        "message": "Welcome Lawyer",
        "user_id": current_user.id,
    }


# ==========================================================
# ADMIN ONLY
# ==========================================================

@router.get(
    "/admin-only",
)
def admin_only(
    current_user: User = Depends(
        require_role(
            [UserRole.ADMIN]
        )
    ),
):
    return {
        "message": "Welcome Admin",
        "user_id": current_user.id,
    }


# ==========================================================
# CLIENT + LAWYER
# ==========================================================

@router.get(
    "/client-lawyer-only",
)
def client_lawyer_only(
    current_user: User = Depends(
        require_role(
            [
                UserRole.CLIENT,
                UserRole.LAWYER,
            ]
        )
    ),
):
    return {
        "message": "Welcome",
        "user_id": current_user.id,
        "role": current_user.role.value,
    }