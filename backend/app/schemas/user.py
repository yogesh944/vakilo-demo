from pydantic import BaseModel, EmailStr
from app.models.user import UserRole


class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    phone: str | None = None
    password: str
    role: UserRole = UserRole.CLIENT


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True