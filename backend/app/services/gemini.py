import json
import time

from google import genai

from app.core.config import settings


# ==========================================================
# GEMINI CLIENT
# ==========================================================

if not settings.GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY is not set in the environment"
    )


client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


# ==========================================================
# GENERATE AI INTAKE QUESTION
# ==========================================================

def generate_intake_question(
    case_title: str,
    case_type: str,
    case_description: str,
    conversation_history: list[dict[str, str]],
    question_number: int,
) -> str:

    conversation_text = "\n".join(
        [
            f"{message['sender']}: {message['message']}"
            for message in conversation_history
        ]
    )

    # ------------------------------------------------------
    # HARD SAFETY LIMIT
    # ------------------------------------------------------

    if question_number > 10:
        return "INTAKE_COMPLETE"

    prompt = f"""
You are the AI legal intake assistant for Vakilo.

Your job is to collect factual information from a client
before their case is reviewed by a qualified lawyer.

You are NOT a lawyer.

============================================================
STRICT INTAKE RULES
============================================================

1. Ask ONLY ONE question in your response.

2. Ask a maximum of 10 questions during the entire intake.

3. The current question number is:

   {question_number} / 10

4. NEVER ask question 11 or any question after question 10.

5. Do NOT repeat information that the client has already
   provided.

6. Use the client's initial description and previous answers
   before deciding what to ask.

7. Ask only questions that are genuinely useful to a lawyer.

8. Prioritize facts such as:

   - people/parties involved
   - relationship between parties
   - important dates and timeline
   - what happened
   - ownership or relevant background
   - documents/evidence available
   - notices, complaints, or previous legal action
   - current situation
   - harm or risk
   - desired outcome

9. Adapt the question to the case type.

10. Do not ask generic questions when a case-specific
    question would be more useful.

11. Do not provide definitive legal advice.

12. Do not predict the outcome of the case.

13. Do not tell the client what legal action they definitely
    should take.

14. Keep the question concise and easy to understand.

15. Ask for one piece of information at a time.

============================================================
CASE TYPE GUIDANCE
============================================================

PROPERTY:
- ownership history
- legal heirs
- will
- property documents
- possession
- mutation/revenue records
- dispute with other claimant
- notices/legal proceedings
- desired outcome

FAMILY:
- relationship
- marriage/divorce/separation history
- children
- important dates
- financial/support issues
- previous proceedings
- desired outcome

CRIMINAL:
- incident
- date/location
- people involved
- evidence
- police complaint/FIR
- injuries/loss
- notices/arrest
- current situation

CYBER:
- incident
- platform/account
- date
- financial loss
- screenshots/evidence
- complaint/report
- identity of suspected person if known
- current risk

CONSUMER:
- product/service
- purchase date
- seller/service provider
- amount paid
- defect/problem
- communications
- refund/replacement attempts
- desired resolution

CIVIL:
- parties
- agreement/relationship
- events
- dates
- documents
- notices
- financial/property impact
- previous proceedings
- desired outcome

CORPORATE:
- company/business relationship
- agreement
- transaction
- parties
- obligations
- breach/dispute
- documents
- notices
- desired outcome

============================================================
WHEN TO COMPLETE
============================================================

If the available information is already sufficient to
understand the important facts, return exactly:

INTAKE_COMPLETE

However, do not complete the intake unnecessarily early.

The system allows up to 10 questions.

If this is question 10, return ONE final relevant question.

The backend will finish the intake after the client answers
question 10.

============================================================
CASE INFORMATION
============================================================

Title:
{case_title}

Case Type:
{case_type}

Initial Description:
{case_description}

============================================================
CONVERSATION HISTORY
============================================================

{conversation_text if conversation_text else "No previous conversation."}

============================================================
CURRENT QUESTION
============================================================

This is question {question_number} of 10.

Based on the complete case information and conversation
history, ask the single most important missing factual
question.

Return ONLY:

- the question

OR

- INTAKE_COMPLETE

Do not return explanations.
Do not number the question.
Do not provide multiple questions.
"""

    last_error: Exception | None = None

    # ======================================================
    # GEMINI RETRY
    # ======================================================

    for attempt in range(3):

        try:

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )

            if not response.text:
                raise ValueError(
                    "Gemini returned an empty response"
                )

            result = response.text.strip()

            if not result:
                raise ValueError(
                    "Gemini returned an empty response"
                )

            if question_number > 10:
                return "INTAKE_COMPLETE"

            return result

        except Exception as error:

            last_error = error

            if attempt < 2:

                wait_time = 2 ** attempt

                print(
                    f"Gemini request failed. "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

    raise RuntimeError(
        "Gemini request failed after 3 attempts: "
        f"{last_error}"
    )


# ==========================================================
# GENERATE AI CASE ANALYSIS
# ==========================================================

def generate_case_analysis(
    case_title: str,
    case_type: str,
    case_description: str,
    conversation_history: list[dict[str, str]],
) -> dict:

    conversation_text = "\n".join(
        [
            f"{message['sender']}: {message['message']}"
            for message in conversation_history
        ]
    )

    prompt = f"""
You are the AI case analysis assistant for Vakilo.

Your job is to analyze the factual information collected
during a legal intake and prepare a structured preliminary
case assessment for the client and a qualified lawyer.

You are NOT a lawyer.

============================================================
IMPORTANT SAFETY RULES
============================================================

1. Do not claim to be a lawyer.

2. Do not provide definitive legal advice.

3. Do not guarantee any legal outcome.

4. Do not predict whether the client will win or lose.

5. Do not invent facts that the client did not provide.

6. Clearly base the analysis only on the information supplied.

7. If information is uncertain, say that it is uncertain.

8. Do not invent documents, dates, people, events, or evidence.

9. Keep the analysis practical and understandable.

10. The recommended specialization must be based on the
    actual case facts.

============================================================
CASE INFORMATION
============================================================

Title:
{case_title}

Case Type:
{case_type}

Initial Description:
{case_description}

============================================================
COMPLETE INTAKE CONVERSATION
============================================================

{conversation_text}

============================================================
ANALYSIS REQUIREMENTS
============================================================

Analyze the entire case and return the following:

1. ai_summary

Provide a concise factual summary of the client's situation.

2. legal_category

Identify the most appropriate legal category.

Examples:

- Property Law / Succession Law
- Family Law
- Criminal Law
- Civil Law
- Consumer Law
- Cyber Law
- Corporate Law
- Employment Law
- Contract Law

Use the most specific reasonable category.

3. recommended_specialization

Identify the type of lawyer who would be most suitable.

Examples:

- Property and Inheritance Lawyer
- Family and Divorce Lawyer
- Criminal Defense Lawyer
- Cyber Crime Lawyer
- Consumer Dispute Lawyer
- Corporate Lawyer
- Employment Lawyer

4. missing_documents

List documents or evidence that may be useful based on
the information provided.

Do NOT invent documents that are definitely required.

5. next_steps

Provide practical preliminary steps for organizing the
matter and preparing it for lawyer review.

Do not give definitive legal advice.

6. urgency

Classify the matter as one of:

- low
- medium
- high
- emergency

Base this only on facts provided by the client.

============================================================
OUTPUT FORMAT
============================================================

Return ONLY valid JSON.

Use exactly this structure:

{{
    "ai_summary": "...",
    "legal_category": "...",
    "recommended_specialization": "...",
    "missing_documents": [
        "...",
        "..."
    ],
    "next_steps": [
        "...",
        "..."
    ],
    "urgency": "medium"
}}

Do not use Markdown.

Do not include ```json.

Do not include any explanation outside the JSON.
"""

    last_error: Exception | None = None

    # ======================================================
    # GEMINI RETRY
    # ======================================================

    for attempt in range(3):

        try:

            response = client.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
            )

            if not response.text:
                raise ValueError(
                    "Gemini returned an empty analysis response"
                )

            raw_result = response.text.strip()

            if not raw_result:
                raise ValueError(
                    "Gemini returned an empty analysis response"
                )

            # ------------------------------------------------
            # Remove accidental Markdown fences
            # ------------------------------------------------

            if raw_result.startswith("```json"):

                raw_result = raw_result[
                    len("```json"):
                ].strip()

            elif raw_result.startswith("```"):

                raw_result = raw_result[
                    len("```"):
                ].strip()

            if raw_result.endswith("```"):

                raw_result = raw_result[
                    :-3
                ].strip()

            # ------------------------------------------------
            # Parse JSON
            # ------------------------------------------------

            analysis = json.loads(
                raw_result
            )

            if not isinstance(
                analysis,
                dict,
            ):
                raise ValueError(
                    "Gemini analysis is not a JSON object"
                )

            # ------------------------------------------------
            # Validate required fields
            # ------------------------------------------------

            required_fields = [
                "ai_summary",
                "legal_category",
                "recommended_specialization",
                "missing_documents",
                "next_steps",
                "urgency",
            ]

            for field in required_fields:

                if field not in analysis:

                    raise ValueError(
                        f"Gemini analysis is missing "
                        f"required field: {field}"
                    )

            # ------------------------------------------------
            # Normalize list fields
            # ------------------------------------------------

            if not isinstance(
                analysis["missing_documents"],
                list,
            ):
                analysis["missing_documents"] = [
                    str(
                        analysis["missing_documents"]
                    )
                ]

            if not isinstance(
                analysis["next_steps"],
                list,
            ):
                analysis["next_steps"] = [
                    str(
                        analysis["next_steps"]
                    )
                ]

            # ------------------------------------------------
            # Normalize urgency
            # ------------------------------------------------

            urgency = str(
                analysis["urgency"]
            ).lower().strip()

            allowed_urgencies = {
                "low",
                "medium",
                "high",
                "emergency",
            }

            if urgency not in allowed_urgencies:

                urgency = "medium"

            analysis["urgency"] = urgency

            return analysis

        except Exception as error:

            last_error = error

            if attempt < 2:

                wait_time = 2 ** attempt

                print(
                    f"Gemini case analysis failed. "
                    f"Retrying in {wait_time} seconds..."
                )

                time.sleep(wait_time)

    raise RuntimeError(
        "Gemini case analysis failed after 3 attempts: "
        f"{last_error}"
    )