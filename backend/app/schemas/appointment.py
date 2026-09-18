from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.appointment import AppointmentStatus


class AppointmentCreate(BaseModel):
    case_id: int
    appointment_time: datetime
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appointment_time: Optional[datetime] = None
    notes: Optional[str] = None


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentLawyerResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class AppointmentCaseResponse(BaseModel):
    id: int
    title: str
    case_type: str
    status: str
    model_config = ConfigDict(from_attributes=True)


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    lawyer_id: int
    case_id: int
    appointment_time: datetime
    status: AppointmentStatus
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    lawyer: Optional[AppointmentLawyerResponse] = None
    case: Optional[AppointmentCaseResponse] = None
