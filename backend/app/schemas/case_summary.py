from typing import List

from pydantic import BaseModel


class CaseSummary(BaseModel):
    case_summary: str
    legal_category: str
    urgency: str
    recommended_specialization: str
    missing_documents: List[str]
    next_steps: List[str]