from pydantic import BaseModel, EmailStr, Field


class RazorpayLinkedAccountCreate(BaseModel):
    legal_business_name: str = Field(min_length=4, max_length=200)
    business_type: str
    contact_name: str = Field(min_length=4, max_length=255)
    phone: str = Field(min_length=8, max_length=15)
    email: EmailStr
    category: str = "professional_services"
    subcategory: str = "legal_services"


class RazorpayLinkedAccountResponse(BaseModel):
    account_id: str
    status: str
    stakeholder_id: str | None = None
    product_id: str | None = None
    activation_status: str | None = None