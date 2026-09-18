from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.lawyer_profile import LawyerProfile
from app.models.user import User
from app.schemas.razorpay_route_schema import (
    RazorpayLinkedAccountCreate,
    RazorpayLinkedAccountResponse,
)
from app.services.razorpay_route_service import RazorpayRouteService
from app.core.security import get_current_user


router = APIRouter(
    prefix="/lawyers/razorpay",
    tags=["Razorpay Route"],
)


@router.post(
    "/create-linked-account",
    response_model=RazorpayLinkedAccountResponse,
)
def create_linked_account(
    data: RazorpayLinkedAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.lower() != "lawyer":
        raise HTTPException(
            status_code=403,
            detail="Only lawyers can create a Razorpay Linked Account.",
        )

    profile = (
        db.query(LawyerProfile)
        .filter(LawyerProfile.user_id == current_user.id)
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Lawyer profile not found.",
        )

    if profile.razorpay_linked_account_id is not None:
        raise HTTPException(
            status_code=400,
            detail="Razorpay Linked Account already exists.",
        )

    # 1. Create Linked Account
    account = RazorpayRouteService.create_linked_account(
        email=data.email,
        phone=data.phone,
        reference_id=f"lawyer_{current_user.id}",
        legal_business_name=data.legal_business_name,
        business_type=data.business_type,
        contact_name=data.contact_name,
        category=data.category,
        subcategory=data.subcategory,
    )

    account_id = account["id"]

    # 2. Create Stakeholder
    stakeholder = RazorpayRouteService.create_stakeholder(
        account_id,
        name=data.contact_name,
        email=data.email,
        phone=data.phone,
    )

    # 3. Request Route product configuration
    product = RazorpayRouteService.request_route_product(
        account_id
    )

    profile.razorpay_linked_account_id = account_id
    setattr(profile, "razorpay_account_status", (
        product.get("activation_status")
        or account.get("status")
        or "created"
    ))

    db.commit()
    db.refresh(profile)

    return RazorpayLinkedAccountResponse(
        account_id=account_id,
        status=account.get("status", "created"),
        stakeholder_id=stakeholder.get("id"),
        product_id=product.get("id"),
        activation_status=product.get("activation_status"),
    )