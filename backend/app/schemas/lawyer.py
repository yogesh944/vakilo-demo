from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# CREATE LAWYER PROFILE
# ==========================================================

class LawyerProfileCreate(BaseModel):
    bar_registration_number: str = Field(
        min_length=2,
        max_length=100
    )

    specialization: str = Field(
        min_length=2,
        max_length=255
    )

    experience_years: int = Field(
        default=0,
        ge=0
    )

    consultation_fee: float | None = Field(
        default=None,
        ge=0
    )

    city: str | None = None
    state: str | None = None
    languages: str | None = None
    bio: str | None = None


# ==========================================================
# UPDATE LAWYER PROFILE
# ==========================================================

class LawyerProfileUpdate(BaseModel):

    # User information
    full_name: str | None = Field(
        default=None,
        min_length=2,
        max_length=100
    )

    email: str | None = Field(
        default=None,
        min_length=5,
        max_length=255
    )

    phone: str | None = Field(
        default=None,
        max_length=20
    )

    # Lawyer information
    specialization: str | None = None

    experience_years: int | None = Field(
        default=None,
        ge=0
    )

    consultation_fee: float | None = Field(
        default=None,
        ge=0
    )

    city: str | None = None
    state: str | None = None
    languages: str | None = None
    bio: str | None = None

    is_available: bool | None = None


# ==========================================================
# LAWYER PROFILE RESPONSE
# ==========================================================

class LawyerProfileResponse(BaseModel):

    id: int
    user_id: int

    # User
    full_name: str
    email: str
    phone: str | None

    # Lawyer
    bar_registration_number: str
    specialization: str
    experience_years: int
    consultation_fee: float | None

    city: str | None
    state: str | None
    languages: str | None
    bio: str | None

    # System controlled / status
    is_available: bool
    is_verified: bool

    rating: float
    total_reviews: int

    model_config = ConfigDict(
        from_attributes=True
    )

# ==========================================================
# RECOMMENDED LAWYER
# ==========================================================

class RecommendedLawyerResponse(BaseModel):
    user_id: int

    lawyer_profile_id: int

    full_name: str

    email: str

    phone: str | None

    specialization: str

    experience_years: int

    consultation_fee: float | None

    city: str | None

    state: str | None

    languages: str | None

    bio: str | None

    rating: float

    total_reviews: int

    is_available: bool

    is_verified: bool

    match_score: int

    match_reasons: list[str]