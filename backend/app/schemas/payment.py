from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PaymentDueCreate(BaseModel):
    case_id: int
    amount: Decimal
    description: str
    due_date: Optional[datetime] = None


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    appointment_id: Optional[int]

    client_id: int
    lawyer_id: int

    amount: Decimal
    currency: str

    description: str
    due_date: Optional[datetime]

    platform_fee_percent: Decimal
    platform_fee_amount: Decimal
    lawyer_amount: Decimal

    razorpay_order_id: Optional[str]
    razorpay_payment_id: Optional[str]
    razorpay_signature: Optional[str]

    razorpay_transfer_id: Optional[str]
    transfer_status: str

    status: str

    paid_at: Optional[datetime]
    settled_at: Optional[datetime]

    created_at: datetime
    updated_at: datetime


class PaymentOrderResponse(BaseModel):
    payment_id: int
    razorpay_order_id: str
    amount: Decimal
    currency: str
    razorpay_key_id: str


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentSummary(BaseModel):
    total_due: Decimal
    total_paid: Decimal
    total_platform_fee: Decimal
    total_lawyer_amount: Decimal
    transaction_count: int


class PaymentListResponse(BaseModel):
    payments: list[PaymentResponse]
    summary: PaymentSummary
