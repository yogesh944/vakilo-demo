from pydantic import BaseModel, Field


class CaseAnalysisResponse(BaseModel):
    ai_summary: str = Field(
        min_length=1
    )

    legal_category: str = Field(
        min_length=1
    )

    recommended_specialization: str = Field(
        min_length=1
    )

    missing_documents: list[str] = []

    next_steps: list[str] = []

    urgency: str