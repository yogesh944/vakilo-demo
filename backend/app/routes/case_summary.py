from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, cast

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.case import Case
from app.models.case import CaseUrgency
from app.models.case_intake import CaseIntakeMessage
from app.models.user import User
from app.services.case_summary_ai import generate_case_summary

router = APIRouter(
    prefix="/cases",
    tags=["Case Summary"]
)


@router.post("/{case_id}/summarize")
def summarize_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
        raise HTTPException(status_code=404, detail="Case not found.")

    messages = (
        db.query(CaseIntakeMessage)
        .filter(CaseIntakeMessage.case_id == case_id)
        .order_by(CaseIntakeMessage.created_at.asc())
        .all()
    )

    if not messages:
        raise HTTPException(
            status_code=400,
            detail="No intake messages found."
        )

    conversation = "\n".join(
        f"{message.sender.value}: {message.message}"
        for message in messages
    )

    summary = generate_case_summary(conversation)
    case_obj = cast(Any, case)

    case_obj.ai_summary = summary.case_summary
    case_obj.legal_category = summary.legal_category
    case_obj.recommended_specialization = summary.recommended_specialization
    case_obj.missing_documents = "\n".join(summary.missing_documents)
    case_obj.next_steps = "\n".join(summary.next_steps)

    try:
        case_obj.urgency = CaseUrgency(summary.urgency.strip().lower())
    except ValueError:
        case_obj.urgency = CaseUrgency.MEDIUM

    db.commit()
    db.refresh(case)

    return {
        "message": "Case summarized successfully.",
        "summary": summary
    }
