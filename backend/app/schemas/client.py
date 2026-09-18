from pydantic import BaseModel, ConfigDict


class ClientProfileCreate(BaseModel):
    address: str | None = None
    city: str | None = None
    state: str | None = None
    preferred_language: str | None = None
    bio: str | None = None


class ClientProfileUpdate(BaseModel):
    address: str | None = None
    city: str | None = None
    state: str | None = None
    preferred_language: str | None = None
    bio: str | None = None


class ClientProfileResponse(BaseModel):
    id: int
    user_id: int
    address: str | None
    city: str | None
    state: str | None
    preferred_language: str | None
    bio: str | None

    model_config = ConfigDict(from_attributes=True)