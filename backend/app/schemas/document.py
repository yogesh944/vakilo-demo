from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.document import DocumentCategory


class DocumentUpload(BaseModel):
    case_id: int
    category: DocumentCategory


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    case_id: int
    uploaded_by: int

    file_name: str
    storage_path: str
    file_type: str
    file_size: int

    category: DocumentCategory

    created_at: datetime