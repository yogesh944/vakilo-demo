from typing import cast

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user

from app.models.case import (
    Case,
    CaseStatus,
)

from app.models.case_lawyer_request import (
    CaseLawyerRequest,
    LawyerRequestStatus,
)

from app.models.lawyer_profile import LawyerProfile

from app.models.user import (
    User,
    UserRole,
)

from app.schemas.case_lawyer_request import (
    LawyerRequestCreate,
    LawyerRequestDecision,
    LawyerRequestResponse,
)

from app.services.notification_service import (
    NotificationService,
)

from app.models.notification import (
    NotificationType,
)


router = APIRouter(
    prefix="/lawyer-requests",
    tags=["Lawyer Requests"],
)


# ============================================================
# CLIENT SENDS REQUEST TO LAWYER
# ============================================================

@router.post(
    "/cases/{case_id}",
    response_model=LawyerRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lawyer_request(
    case_id: int,
    request_data: LawyerRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if cast(UserRole, current_user.role) != UserRole.CLIENT:
        raise HTTPException(
            status_code=403,
            detail="Only clients can request a lawyer.",
        )

    # --------------------------------------------------------
    # Find case
    # --------------------------------------------------------

    case = (
        db.query(Case)
        .filter(
            Case.id == case_id,
            Case.client_id == current_user.id,
        )
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    # --------------------------------------------------------
    # Case must be in lawyer matching stage
    # --------------------------------------------------------

    if case.status not in [
        CaseStatus.DRAFT,
        CaseStatus.INTAKE,
        CaseStatus.LAWYER_MATCHING,
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "A lawyer request cannot be created "
                "for this case in its current status."
            ),
        )

    # --------------------------------------------------------
    # Lawyer
    # --------------------------------------------------------

    lawyer = (
        db.query(User)
        .filter(
            User.id == request_data.lawyer_id,
            User.role == UserRole.LAWYER,
        )
        .first()
    )

    if not lawyer:
        raise HTTPException(
            status_code=404,
            detail="Lawyer not found.",
        )

    if lawyer.is_active is False:
        raise HTTPException(
            status_code=400,
            detail="Lawyer account is inactive.",
        )

    if lawyer.is_verified is False:
        raise HTTPException(
            status_code=400,
            detail="Lawyer is not verified.",
        )

    # --------------------------------------------------------
    # Lawyer profile
    # --------------------------------------------------------

    profile = (
        db.query(LawyerProfile)
        .filter(
            LawyerProfile.user_id ==
            request_data.lawyer_id
        )
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Lawyer profile not found.",
        )

    if profile.is_available is False:
        raise HTTPException(
            status_code=400,
            detail="Lawyer is currently unavailable.",
        )

    # --------------------------------------------------------
    # Already assigned?
    # --------------------------------------------------------

    if case.lawyer_id is not None:

        raise HTTPException(
            status_code=400,
            detail="A lawyer is already assigned to this case.",
        )

    # --------------------------------------------------------
    # Existing pending request
    # --------------------------------------------------------

    existing_request = (
        db.query(CaseLawyerRequest)
        .filter(
            CaseLawyerRequest.case_id == case_id,
            CaseLawyerRequest.lawyer_id ==
            request_data.lawyer_id,
            CaseLawyerRequest.status ==
            LawyerRequestStatus.PENDING,
        )
        .first()
    )

    if existing_request:

        raise HTTPException(
            status_code=400,
            detail="A request is already pending for this lawyer.",
        )

    # --------------------------------------------------------
    # Create request
    # --------------------------------------------------------

    request = CaseLawyerRequest(
        case_id=case_id,
        client_id=cast(int, current_user.id),
        lawyer_id=request_data.lawyer_id,
        status=LawyerRequestStatus.PENDING,
        client_message=request_data.client_message,
    )

    db.add(request)

    # Move case into matching stage
    setattr(case, "status", CaseStatus.LAWYER_MATCHING)

    db.commit()
    db.refresh(request)

    # --------------------------------------------------------
    # Notify lawyer
    # --------------------------------------------------------

    try:

        NotificationService.create_notification(
            db=db,
            user_id=request_data.lawyer_id,
            title="New Case Request",
            message=(
                f"A client has requested you "
                f"for Case #{case_id}."
            ),
            notification_type=NotificationType.CASE,
        )

        db.commit()

    except Exception:

        db.rollback()

    return request


# ============================================================
# CLIENT VIEW THEIR REQUESTS
# ============================================================

@router.get(
    "/my",
    response_model=list[LawyerRequestResponse],
)
def get_my_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if cast(UserRole, current_user.role) != UserRole.CLIENT:

        raise HTTPException(
            status_code=403,
            detail="Only clients can access their requests.",
        )

    return (
        db.query(CaseLawyerRequest)
        .filter(
            CaseLawyerRequest.client_id ==
            current_user.id
        )
        .order_by(
            CaseLawyerRequest.created_at.desc()
        )
        .all()
    )


# ============================================================
# LAWYER VIEW REQUESTS
# ============================================================

@router.get(
    "/incoming",
    response_model=list[LawyerRequestResponse],
)
def get_incoming_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if cast(UserRole, current_user.role) != UserRole.LAWYER:

        raise HTTPException(
            status_code=403,
            detail="Only lawyers can access incoming requests.",
        )

    return (
        db.query(CaseLawyerRequest)
        .filter(
            CaseLawyerRequest.lawyer_id ==
            current_user.id
        )
        .order_by(
            CaseLawyerRequest.created_at.desc()
        )
        .all()
    )


# ============================================================
# LAWYER VIEW CASE DETAILS BEFORE ACCEPT / REJECT
# ============================================================

@router.get(
    "/{request_id}/case",
)
def get_request_case(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Allow the lawyer who received a pending request to view the
    associated case before accepting or rejecting the request.

    This does NOT assign the lawyer to the case.
    """

    # --------------------------------------------------------
    # Only lawyers can access this endpoint
    # --------------------------------------------------------

    if cast(UserRole, current_user.role) != UserRole.LAWYER:
        raise HTTPException(
            status_code=403,
            detail="Only lawyers can view case details for incoming requests.",
        )

    # --------------------------------------------------------
    # Find request belonging to current lawyer
    # --------------------------------------------------------

    request = (
        db.query(CaseLawyerRequest)
        .filter(
            CaseLawyerRequest.id == request_id,
            CaseLawyerRequest.lawyer_id == current_user.id,
        )
        .first()
    )

    if not request:
        raise HTTPException(
            status_code=404,
            detail="Case request not found.",
        )

    # --------------------------------------------------------
    # Only allow viewing a pending request before decision
    # --------------------------------------------------------

    if cast(LawyerRequestStatus, request.status) != LawyerRequestStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail="This request has already been decided.",
        )

    # --------------------------------------------------------
    # Get associated case
    # --------------------------------------------------------

    case = (
        db.query(Case)
        .filter(Case.id == request.case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    # --------------------------------------------------------
    # Return case information
    # --------------------------------------------------------

    return {
        "id": case.id,
        "client_id": case.client_id,
        "lawyer_id": case.lawyer_id,
        "title": case.title,
        "case_type": case.case_type,
        "description": case.description,
        "urgency": case.urgency,
        "status": case.status,
        "legal_category": case.legal_category,
        "recommended_specialization": case.recommended_specialization,
        "ai_summary": getattr(case, "ai_summary", None),
        "missing_documents": getattr(case, "missing_documents", None),
        "next_steps": getattr(case, "next_steps", None),
        "incident_date": getattr(case, "incident_date", None),
        "incident_location": getattr(case, "incident_location", None),
        "created_at": case.created_at,
        "updated_at": getattr(case, "updated_at", None),
    }


# ============================================================
# LAWYER ACCEPT / REJECT
# ============================================================

@router.patch(
    "/{request_id}",
    response_model=LawyerRequestResponse,
)
def decide_lawyer_request(
    request_id: int,
    decision: LawyerRequestDecision,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    if cast(UserRole, current_user.role) != UserRole.LAWYER:

        raise HTTPException(
            status_code=403,
            detail="Only lawyers can decide case requests.",
        )

    request = (
        db.query(CaseLawyerRequest)
        .filter(
            CaseLawyerRequest.id == request_id,
            CaseLawyerRequest.lawyer_id ==
            current_user.id,
        )
        .first()
    )

    if not request:

        raise HTTPException(
            status_code=404,
            detail="Case request not found.",
        )

    if cast(LawyerRequestStatus, request.status) != LawyerRequestStatus.PENDING:

        raise HTTPException(
            status_code=400,
            detail="This request has already been decided.",
        )

    case = (
        db.query(Case)
        .filter(
            Case.id == request.case_id
        )
        .first()
    )

    if not case:

        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    # ========================================================
    # ACCEPT
    # ========================================================

    if decision.status == LawyerRequestStatus.ACCEPTED:

        if case.lawyer_id is not None:

            raise HTTPException(
                status_code=400,
                detail="Another lawyer is already assigned.",
            )

        setattr(
            request,
            "status",
            LawyerRequestStatus.ACCEPTED,
        )

        setattr(
            request,
            "lawyer_message",
            decision.lawyer_message,
        )

        case.lawyer_id = current_user.id

        setattr(
            case,
            "status",
            CaseStatus.LAWYER_ASSIGNED,
        )

        db.commit()
        db.refresh(request)

        try:

            NotificationService.create_notification(
                db=db,
                user_id=cast(int, request.client_id),
                title="Lawyer Accepted Your Case",
                message=(
                    f"The lawyer has accepted "
                    f"Case #{case.id}."
                ),
                notification_type=NotificationType.CASE,
            )

            db.commit()

        except Exception:

            db.rollback()

        return request

    # ========================================================
    # REJECT
    # ========================================================

    if decision.status == LawyerRequestStatus.REJECTED:

        setattr(
            request,
            "status",
            LawyerRequestStatus.REJECTED,
        )

        setattr(
            request,
            "lawyer_message",
            decision.lawyer_message,
        )

        db.commit()
        db.refresh(request)

        try:

            NotificationService.create_notification(
                db=db,
                user_id=cast(int, request.client_id),
                title="Lawyer Request Declined",
                message=(
                    f"The lawyer declined "
                    f"Case #{case.id}. "
                    f"You can select another lawyer."
                ),
                notification_type=NotificationType.CASE,
            )

            db.commit()

        except Exception:

            db.rollback()

        return request

    raise HTTPException(
        status_code=400,
        detail=(
            "Only ACCEPTED or REJECTED "
            "are valid decisions."
        ),
    )