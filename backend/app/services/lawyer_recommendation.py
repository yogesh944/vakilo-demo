from typing import Any, cast

from sqlalchemy.orm import Session

from app.models.case import Case
from app.models.lawyer_profile import LawyerProfile
from app.models.user import User, UserRole


# ==========================================================
# HELPER
# ==========================================================

def normalize(value: str | None) -> str:
    if not value:
        return ""

    return (
        value
        .lower()
        .strip()
    )


def get_words(value: str) -> set[str]:
    """
    Convert text into useful words for matching.
    Very short words are ignored.
    """

    stop_words = {
        "law",
        "lawyer",
        "and",
        "the",
        "of",
        "for",
        "in",
        "with",
        "legal",
    }

    return {
        word
        for word in value.replace(
            "/",
            " "
        ).replace(
            ",",
            " "
        ).split()
        if len(word) > 2
        and word not in stop_words
    }


# ==========================================================
# LAWYER RECOMMENDATION
# ==========================================================

def recommend_lawyers(
    db: Session,
    case: Case,
) -> list[dict[str, Any]]:
    """
    Recommend lawyers based on:

    1. AI recommended specialization
    2. Legal category
    3. Case type
    4. Case location
    5. Verification
    6. Availability
    7. Experience
    8. Rating
    """

    specialization = normalize(
        cast(
            str | None,
            case.recommended_specialization,
        )
    )

    legal_category = normalize(
        cast(
            str | None,
            case.legal_category,
        )
    )

    case_type = normalize(
        cast(
            str,
            case.case_type.value,
        )
    )

    incident_location = normalize(
        cast(
            str | None,
            case.incident_location,
        )
    )


    # ------------------------------------------------------
    # Analysis must exist
    # ------------------------------------------------------

    if not specialization:
        return []


    # ------------------------------------------------------
    # Extract location
    # ------------------------------------------------------

    location_parts = {
        part.strip()
        for part in incident_location.split(",")
        if part.strip()
    }


    # ------------------------------------------------------
    # Get lawyers
    # ------------------------------------------------------

    lawyer_rows = (
        db.query(
            LawyerProfile,
            User,
        )
        .join(
            User,
            LawyerProfile.user_id == User.id,
        )
        .filter(
            User.role == UserRole.LAWYER,
            User.is_active.is_(True),
            LawyerProfile.is_available.is_(True),
        )
        .all()
    )


    recommendations: list[
        dict[str, Any]
    ] = []


    # ======================================================
    # SCORE EACH LAWYER
    # ======================================================

    for profile, user in lawyer_rows:

        lawyer_specialization = normalize(
            cast(
                str | None,
                profile.specialization,
            )
        )

        lawyer_city = normalize(
            cast(
                str | None,
                profile.city,
            )
        )

        lawyer_state = normalize(
            cast(
                str | None,
                profile.state,
            )
        )


        score = 0

        reasons: list[str] = []


        # ==================================================
        # 1. SPECIALIZATION MATCH
        # Maximum: 50
        # ==================================================

        specialization_words = get_words(
            specialization
        )

        lawyer_words = get_words(
            lawyer_specialization
        )

        common_words = (
            specialization_words
            & lawyer_words
        )


        if (
            specialization
            and lawyer_specialization
        ):

            # Exact / near exact match
            if (
                specialization
                in lawyer_specialization
                or lawyer_specialization
                in specialization
            ):

                score += 50

                reasons.append(
                    "Specialization strongly matches your case"
                )

            elif common_words:

                word_score = min(
                    40,
                    len(common_words) * 15,
                )

                score += word_score

                reasons.append(
                    "Lawyer has a related specialization"
                )


        # ==================================================
        # 2. LEGAL CATEGORY
        # Maximum: 20
        # ==================================================

        category_words = get_words(
            legal_category
        )


        if category_words:

            category_match = (
                category_words
                & lawyer_words
            )

            if category_match:

                score += min(
                    20,
                    len(category_match) * 10,
                )

                reasons.append(
                    "Legal category matches the lawyer's expertise"
                )


        # ==================================================
        # 3. CASE TYPE
        # Maximum: 10
        # ==================================================

        if case_type:

            if case_type in lawyer_specialization:

                score += 10

                reasons.append(
                    "Case type matches specialization"
                )


        # ==================================================
        # 4. LOCATION
        # Maximum: 10
        # ==================================================

        if location_parts:

            location_match = False

            for location in location_parts:

                if (
                    location in lawyer_city
                    or location in lawyer_state
                ):

                    location_match = True
                    break


            if location_match:

                score += 10

                reasons.append(
                    "Lawyer is located in the relevant area"
                )


        # ==================================================
        # 5. VERIFIED
        # Maximum: 5
        # ==================================================

        if profile.is_verified:

            score += 5

            reasons.append(
                "Verified lawyer"
            )


        # ==================================================
        # 6. AVAILABILITY
        # Maximum: 5
        # ==================================================

        if profile.is_available:

            score += 5

            reasons.append(
                "Currently accepting cases"
            )


        # ==================================================
        # 7. EXPERIENCE
        # Maximum: 5
        # ==================================================

        experience = int(
            profile.experience_years or 0
        )

        if experience >= 10:

            score += 5

            reasons.append(
                "10+ years of experience"
            )

        elif experience >= 5:

            score += 3

            reasons.append(
                "5+ years of experience"
            )


        # ==================================================
        # 8. RATING
        # Maximum: 5
        # ==================================================

        rating = float(
            profile.rating or 0
        )

        if rating >= 4.5:

            score += 5

            reasons.append(
                "Highly rated"
            )

        elif rating >= 4.0:

            score += 3

            reasons.append(
                "Good client rating"
            )


        # ==================================================
        # SKIP COMPLETELY UNRELATED LAWYERS
        # ==================================================

        if score < 15:
            continue


        # ==================================================
        # BUILD RESULT
        # ==================================================

        recommendations.append(
            {
                "user_id": cast(
                    int,
                    user.id,
                ),

                "lawyer_profile_id": cast(
                    int,
                    profile.id,
                ),

                "full_name": cast(
                    str,
                    user.full_name,
                ),

                "email": cast(
                    str,
                    user.email,
                ),

                "phone": (
                    cast(
                        str,
                        user.phone,
                    )
                    if user.phone
                    else None
                ),

                "specialization": (
                    lawyer_specialization
                ),

                "experience_years": experience,

                "consultation_fee": (
                    float(
                        profile.consultation_fee
                    )
                    if profile.consultation_fee
                    is not None
                    else None
                ),

                "city": (
                    cast(
                        str,
                        profile.city,
                    )
                    if profile.city
                    else None
                ),

                "state": (
                    cast(
                        str,
                        profile.state,
                    )
                    if profile.state
                    else None
                ),

                "languages": (
                    cast(
                        str,
                        profile.languages,
                    )
                    if profile.languages
                    else None
                ),

                "bio": (
                    cast(
                        str,
                        profile.bio,
                    )
                    if profile.bio
                    else None
                ),

                "rating": rating,

                "total_reviews": int(
                    profile.total_reviews or 0
                ),

                "is_available": bool(
                    profile.is_available
                ),

                "is_verified": bool(
                    profile.is_verified
                ),

                "match_score": min(
                    score,
                    100,
                ),

                "match_reasons": reasons,
            }
        )


    # ======================================================
    # SORT BEST LAWYERS FIRST
    # ======================================================

    recommendations.sort(
        key=lambda lawyer: (
            lawyer["match_score"],
            lawyer["is_verified"],
            lawyer["rating"],
            lawyer["experience_years"],
        ),
        reverse=True,
    )


    # ======================================================
    # RETURN TOP 5
    # ======================================================

    return recommendations[:5]