from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, cast

import razorpay
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user

from app.models.case import Case
from app.models.lawyer_profile import LawyerProfile
from app.models.notification import NotificationType
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole

from app.schemas.payment import (
    PaymentDueCreate,
    PaymentListResponse,
    PaymentOrderResponse,
    PaymentResponse,
    PaymentSummary,
    PaymentVerify,
)

from app.services.notification_service import NotificationService


router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


razorpay_client = razorpay.Client(
    auth=(
        settings.RAZORPAY_KEY_ID,
        settings.RAZORPAY_KEY_SECRET,
    )
)


PLATFORM_FEE_PERCENT = Decimal("3.00")
LAWYER_SHARE_PERCENT = Decimal("97.00")


def _to_decimal(value: Any) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise HTTPException(
            status_code=400,
            detail="Invalid payment amount.",
        )


def _calculate_split(amount: Decimal) -> tuple[Decimal, Decimal]:
    if amount <= Decimal("0"):
        raise HTTPException(
            status_code=400,
            detail="Payment amount must be greater than zero.",
        )

    platform_fee = (
        amount * PLATFORM_FEE_PERCENT / Decimal("100")
    ).quantize(Decimal("0.01"))

    lawyer_amount = (
        amount - platform_fee
    ).quantize(Decimal("0.01"))

    if lawyer_amount <= Decimal("0"):
        raise HTTPException(
            status_code=400,
            detail="Payment amount is too small.",
        )

    return platform_fee, lawyer_amount


def _get_case_for_lawyer(
    db: Session,
    case_id: int,
    lawyer_id: int,
) -> Case:
    case = (
        db.query(Case)
        .filter(Case.id == case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    # Supports the common Vakilo case ownership field.
    # If your Case model uses a different assignment field,
    # change only this validation block.
    assigned_lawyer_id = getattr(case, "lawyer_id", None)

    if assigned_lawyer_id is not None:
        if int(assigned_lawyer_id) != int(lawyer_id):
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this case.",
            )

    return case


def _get_client_id_from_case(case: Case) -> int:
    client_id = getattr(case, "client_id", None)

    if client_id is None:
        raise HTTPException(
            status_code=400,
            detail="This case is not associated with a client.",
        )

    return int(client_id)


def _get_payment_for_client(
    db: Session,
    payment_id: int,
    client_id: int,
) -> Payment:
    payment = (
        db.query(Payment)
        .filter(
            Payment.id == payment_id,
            Payment.client_id == client_id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    return payment


@router.post(
    "/due",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_due(
    payment_data: PaymentDueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lawyer creates a payment due for a client.

    Scheduling is intentionally independent from payment.
    """

    if current_user.role is not UserRole.LAWYER:
        raise HTTPException(
            status_code=403,
            detail="Only lawyers can create payment dues.",
        )

    lawyer_id = cast(int, current_user.id)

    case = _get_case_for_lawyer(
        db=db,
        case_id=payment_data.case_id,
        lawyer_id=lawyer_id,
    )

    client_id = _get_client_id_from_case(case)

    amount = _to_decimal(payment_data.amount)
    platform_fee, lawyer_amount = _calculate_split(amount)

    description = payment_data.description.strip()

    if not description:
        raise HTTPException(
            status_code=400,
            detail="Payment description is required.",
        )

    # Prevent multiple unpaid dues with the same case/client/lawyer.
    existing_due = (
        db.query(Payment)
        .filter(
            Payment.case_id == payment_data.case_id,
            Payment.client_id == client_id,
            Payment.lawyer_id == lawyer_id,
            Payment.status.in_(
                [
                    PaymentStatus.PENDING.value,
                ]
            ),
        )
        .first()
    )

    if existing_due:
        raise HTTPException(
            status_code=400,
            detail="An active payment already exists for this case.",
        )

    payment = Payment(
        case_id=payment_data.case_id,
        appointment_id=None,
        client_id=client_id,
        lawyer_id=lawyer_id,
        amount=amount,
        currency="INR",
        description=description,
        due_date=payment_data.due_date,
        platform_fee_percent=PLATFORM_FEE_PERCENT,
        platform_fee_amount=platform_fee,
        lawyer_amount=lawyer_amount,
        status=PaymentStatus.PENDING.value,
        transfer_status="not_created",
    )

    db.add(payment)

    try:
        db.commit()
        db.refresh(payment)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Unable to create the payment due: {str(e)}"
        )

    NotificationService.create_notification(
        db=db,
        user_id=client_id,
        title="Payment Due",
        message=(
            f"A payment of ₹{amount:.2f} is due for your case. "
            f"Description: {description}"
        ),
        notification_type=NotificationType.PAYMENT,
    )

    return payment


@router.get("/mine", response_model=PaymentListResponse)
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role.lower() == "client":
        payments = (
            db.query(Payment)
            .filter(Payment.client_id == current_user.id)
            .order_by(Payment.created_at.desc())
            .all()
        )

    elif current_user.role.lower() == "lawyer":
        payments = (
            db.query(Payment)
            .filter(Payment.lawyer_id == current_user.id)
            .order_by(Payment.created_at.desc())
            .all()
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="Only clients and lawyers can view payments."
        )

    total_due = sum(
        (_to_decimal(p.amount) for p in payments
        if str(p.status) == PaymentStatus.PENDING.value),
        Decimal("0.00"),
    )

    total_paid = sum(
        (_to_decimal(p.amount) for p in payments
        if str(p.status) == PaymentStatus.SUCCESS.value),
        Decimal("0.00"),
    )

    total_platform_fee = sum(
        (_to_decimal(p.platform_fee_amount) for p in payments
        if str(p.status) == PaymentStatus.SUCCESS.value),
        Decimal("0.00"),
    )

    total_lawyer_amount = sum(
        (_to_decimal(p.lawyer_amount) for p in payments
        if str(p.status) == PaymentStatus.SUCCESS.value),
        Decimal("0.00"),
    )

    summary = PaymentSummary(
        total_due=total_due,
        total_paid=total_paid,
        total_platform_fee=total_platform_fee,
        total_lawyer_amount=total_lawyer_amount,
        transaction_count=len(payments),
    )

    return PaymentListResponse(
        payments=[PaymentResponse.model_validate(payment) for payment in payments],
        summary=summary,
    )

@router.post(
    "/{payment_id}/create-order",
    response_model=PaymentOrderResponse,
)
def create_payment_order(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role is not UserRole.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Only clients can create payment orders.",
        )

    client_id = cast(int, current_user.id)

    payment = _get_payment_for_client(
        db=db,
        payment_id=payment_id,
        client_id=client_id,
    )

    if str(payment.status) == PaymentStatus.SUCCESS.value:
        raise HTTPException(
            status_code=400,
            detail="This payment has already been completed.",
        )

    if str(payment.status) not in {
        PaymentStatus.PENDING.value,
    }:
        raise HTTPException(
            status_code=400,
            detail="This payment is not available for checkout.",
        )

    lawyer_profile = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.user_id == payment.lawyer_id
        )
        .first()
    )

    if not lawyer_profile:
        raise HTTPException(
            status_code=404,
            detail="Lawyer profile not found.",
        )

    linked_account_id = getattr(
        lawyer_profile,
        "razorpay_linked_account_id",
        None,
    )

    account_status = getattr(
        lawyer_profile,
        "razorpay_account_status",
        "not_connected",
    )

    if not linked_account_id:
        raise HTTPException(
            status_code=400,
            detail="The lawyer has not connected a Razorpay Linked Account.",
        )

    if account_status not in {"active", "activated", "approved"}:
        raise HTTPException(
            status_code=400,
            detail="The lawyer's Razorpay Linked Account is not active.",
        )

    amount = _to_decimal(payment.amount)

    # Reuse an existing local Razorpay order if one already exists.
    existing_order_id = getattr(
        payment,
        "razorpay_order_id",
        None,
    )

    if existing_order_id:
        return PaymentOrderResponse(
            payment_id=cast(int, payment.id),
            razorpay_order_id=existing_order_id,
            amount=amount,
            currency=cast(str, payment.currency) or "INR",
            razorpay_key_id=settings.RAZORPAY_KEY_ID,
        )

    lawyer_amount = _to_decimal(payment.lawyer_amount)

    order_payload = {
        "amount": int(amount * 100),
        "currency": "INR",
        "receipt": f"vakilo_payment_{payment.id}",
        "payment_capture": 1,
        "notes": {
            "vakilo_payment_id": str(payment.id),
            "case_id": str(payment.case_id),
            "client_id": str(payment.client_id),
            "lawyer_id": str(payment.lawyer_id),
        },
        "transfers": [
            {
                "account": linked_account_id,
                "amount": int(lawyer_amount * 100),
                "currency": "INR",
                "on_hold": False,
                "notes": {
                    "vakilo_payment_id": str(payment.id),
                    "case_id": str(payment.case_id),
                },
            }
        ],
    }

    try:
        razorpay_order = cast(
            Any,
            razorpay_client,
        ).order.create(order_payload)

    except Exception:
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to create the Razorpay payment order. "
                "Please try again."
            ),
        )

    razorpay_order_id = razorpay_order.get("id")

    if not razorpay_order_id:
        raise HTTPException(
            status_code=502,
            detail="Razorpay returned an invalid payment order.",
        )

    payment.razorpay_order_id = razorpay_order_id

    try:
        db.commit()
        db.refresh(payment)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save the Razorpay payment order.",
        )

    return PaymentOrderResponse(
        payment_id=cast(int, payment.id),
        razorpay_order_id=razorpay_order_id,
        amount=amount,
        currency="INR",
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
    )


def _get_transfer_from_payment(
    razorpay_payment_id: str,
) -> Any:
    """
    Fetch transfer information after the Razorpay payment is captured.

    The Razorpay Python SDK versions expose Route transfer retrieval
    differently. The payment verification itself does not depend on
    this helper; transfer reconciliation can be retried safely.
    """
    payment_api = cast(Any, razorpay_client).payment

    # Common SDK form.
    transfer_method = getattr(
        payment_api,
        "transfer",
        None,
    )

    if callable(transfer_method):
        return transfer_method(razorpay_payment_id)

    # Some SDK versions expose transfers through request().
    request_method = getattr(
        razorpay_client,
        "request",
        None,
    )

    if callable(request_method):
        return request_method(
            "GET",
            f"/v1/payments/{razorpay_payment_id}/transfers",
        )

    return None


def _extract_transfer(
    transfer_response: Any,
) -> tuple[str | None, str | None]:
    if not transfer_response:
        return None, None

    items = []

    if isinstance(transfer_response, dict):
        if isinstance(
            transfer_response.get("items"),
            list,
        ):
            items = transfer_response["items"]
        elif isinstance(
            transfer_response.get("transfers"),
            list,
        ):
            items = transfer_response["transfers"]
        elif transfer_response.get("id"):
            items = [transfer_response]

    elif isinstance(transfer_response, list):
        items = transfer_response

    if not items:
        return None, None

    transfer = items[0]

    if not isinstance(transfer, dict):
        return None, None

    transfer_id = transfer.get("id")
    transfer_status = transfer.get("status")

    return (
        str(transfer_id) if transfer_id else None,
        str(transfer_status) if transfer_status else None,
    )


@router.post("/verify")
def verify_payment(
    payment_data: PaymentVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role is not UserRole.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Only clients can verify payments.",
        )

    client_id = cast(int, current_user.id)

    payment = (
        db.query(Payment)
        .filter(
            Payment.razorpay_order_id
            == payment_data.razorpay_order_id,
            Payment.client_id == client_id,
        )
        .first()
    )

    if not payment:
        raise HTTPException(
            status_code=404,
            detail="Payment not found.",
        )

    if str(payment.status) == PaymentStatus.SUCCESS.value:
        return {
            "message": "Payment has already been verified.",
            "payment_id": payment.id,
            "status": PaymentStatus.SUCCESS.value,
            "transfer_id": payment.razorpay_transfer_id,
            "transfer_status": payment.transfer_status,
        }

    if str(payment.status) != PaymentStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail="This payment cannot be verified in its current state.",
        )

    # Verify the Razorpay checkout signature.
    try:
        cast(
            Any,
            razorpay_client,
        ).utility.verify_payment_signature(
            {
                "razorpay_order_id": payment_data.razorpay_order_id,
                "razorpay_payment_id": payment_data.razorpay_payment_id,
                "razorpay_signature": payment_data.razorpay_signature,
            }
        )
    except Exception:
        setattr(payment, "status", PaymentStatus.FAILED.value)

        try:
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Payment verification failed.",
        )

    # Verify that Razorpay actually captured the payment.
    try:
        razorpay_payment = cast(
            Any,
            razorpay_client,
        ).payment.fetch(
            payment_data.razorpay_payment_id
        )
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=(
                "Payment signature was valid, but the payment "
                "could not be confirmed with Razorpay."
            ),
        )

    razorpay_status = str(
        razorpay_payment.get("status", "")
    ).lower()

    if razorpay_status != "captured":
        setattr(payment, "status", PaymentStatus.FAILED.value)

        try:
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Razorpay payment has not been captured.",
        )

    # Confirm that the payment amount matches our local record.
    razorpay_amount = razorpay_payment.get("amount")

    if razorpay_amount is not None:
        expected_amount_paise = int(
            _to_decimal(payment.amount) * 100
        )

        if int(razorpay_amount) != expected_amount_paise:
            raise HTTPException(
                status_code=400,
                detail="Razorpay payment amount does not match the payment due.",
            )

    verified_at = datetime.utcnow()

    setattr(
        payment,
        "razorpay_payment_id",
        payment_data.razorpay_payment_id,
    )
    setattr(
        payment,
        "razorpay_signature",
        payment_data.razorpay_signature,
    )
    setattr(payment, "status", PaymentStatus.SUCCESS.value)
    setattr(payment, "paid_at", verified_at)

    # Route transfer information is recorded for reconciliation.
    transfer_id = None
    transfer_status = None

    try:
        transfer_response = _get_transfer_from_payment(
            payment_data.razorpay_payment_id
        )

        transfer_id, transfer_status = _extract_transfer(
            transfer_response
        )

    except Exception:
        # Payment remains successful even if transfer lookup temporarily
        # fails. A later reconciliation process can fetch the transfer.
        pass

    if transfer_id:
        setattr(payment, "razorpay_transfer_id", transfer_id)

    setattr(
        payment,
        "transfer_status",
        transfer_status or "created",
    )

    try:
        db.commit()
        db.refresh(payment)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Payment was verified but could not be finalized.",
        )

    NotificationService.create_notification(
        db=db,
        user_id=client_id,
        title="Payment Successful",
        message=(
            f"Your payment of ₹{_to_decimal(payment.amount):.2f} "
            "was verified successfully."
        ),
        notification_type=NotificationType.PAYMENT,
    )

    NotificationService.create_notification(
        db=db,
        user_id=cast(int, payment.lawyer_id),
        title="Payment Received",
        message=(
            f"The client completed a payment of "
            f"₹{_to_decimal(payment.amount):.2f}. "
            f"Your 97% share is ₹"
            f"{_to_decimal(payment.lawyer_amount):.2f}."
        ),
        notification_type=NotificationType.PAYMENT,
    )

    return {
        "message": "Payment verified successfully.",
        "payment_id": payment.id,
        "status": payment.status,
        "amount": payment.amount,
        "platform_fee": payment.platform_fee_amount,
        "lawyer_amount": payment.lawyer_amount,
        "razorpay_payment_id": payment.razorpay_payment_id,
        "razorpay_transfer_id": payment.razorpay_transfer_id,
        "transfer_status": payment.transfer_status,
        "paid_at": payment.paid_at,
    }
