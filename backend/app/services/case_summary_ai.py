import json

from google import genai

from app.core.config import settings
from app.schemas.case_summary import CaseSummary

client = genai.Client(api_key=settings.GEMINI_API_KEY)


def generate_case_summary(conversation: str) -> CaseSummary:
    prompt = f"""
You are an experienced Indian legal assistant.

Analyze the following legal intake conversation.

Return ONLY valid JSON.

Required JSON format:

{{
    "case_summary": "...",
    "legal_category": "...",
    "urgency": "...",
    "recommended_specialization": "...",
    "missing_documents": [],
    "next_steps": []
}}

Conversation:
{conversation}
"""

    model_name = settings.GEMINI_MODEL.strip()

    if model_name.startswith("models/"):
        model_name = model_name.removeprefix("models/")

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=prompt,
        )

        text = (response.text or "").strip()

        if not text:
            raise ValueError("Gemini returned an empty response.")

        # Remove markdown code fences
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        elif text.startswith("```"):
            text = text.replace("```", "").strip()

        data = json.loads(text)

        return CaseSummary.model_validate(data)

    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini returned invalid JSON: {e}")

    except Exception as e:
        raise RuntimeError(f"Failed to generate case summary: {e}")