import uuid
from pathlib import Path
from typing import cast

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.supabase import supabase

from app.models.case import Case
from app.models.document import Document, DocumentCategory
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.services.notification_service import NotificationService


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


# ============================================================
# FILE CONFIGURATION
# ============================================================

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".doc",
    ".docx",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


# ============================================================
# CASE ACCESS HELPER
# ============================================================

def verify_case_access(
    case: Case,
    current_user: User,
) -> None:
    """
    Verify that the current user belongs to the case.

    Allowed:
    - Client assigned to the case
    - Lawyer assigned to the case
    """

    current_role = cast(UserRole, current_user.role)

    if current_role == UserRole.CLIENT:

        if cast(int, case.client_id) != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

    elif current_role == UserRole.LAWYER:

        if cast(int | None, case.lawyer_id) != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied.",
            )

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients and lawyers can access case documents.",
        )


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@router.post(
    "/upload",
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    case_id: int = Form(...),
    category: DocumentCategory = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document to a case.

    Both the client and assigned lawyer can upload.
    """

    # --------------------------------------------------------
    # Find case
    # --------------------------------------------------------

    case = (
        db.query(Case)
        .filter(Case.id == case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    # --------------------------------------------------------
    # Verify client/lawyer access
    # --------------------------------------------------------

    verify_case_access(case, current_user)

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename.",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Unsupported file type. "
                "Allowed types: PDF, PNG, JPG, JPEG, DOC and DOCX."
            ),
        )

    # --------------------------------------------------------
    # Read file
    # --------------------------------------------------------

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10 MB limit.",
        )

    # --------------------------------------------------------
    # Generate unique storage filename
    # --------------------------------------------------------

    unique_filename = f"{uuid.uuid4()}{extension}"

    storage_path = (
        f"cases/{case_id}/documents/{unique_filename}"
    )

    # --------------------------------------------------------
    # Upload to Supabase Storage
    # --------------------------------------------------------

    try:
        supabase.storage \
            .from_(settings.SUPABASE_BUCKET) \
            .upload(
                storage_path,
                file_bytes,
                {
                    "content-type": (
                        file.content_type
                        or "application/octet-stream"
                    )
                },
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase upload failed: {str(e)}",
        )

    # --------------------------------------------------------
    # Save document metadata
    # --------------------------------------------------------

    document = Document(
        case_id=case_id,
        uploaded_by=current_user.id,
        file_name=file.filename,
        storage_path=storage_path,
        file_type=(
            file.content_type
            or "application/octet-stream"
        ),
        file_size=len(file_bytes),
        category=category,
    )

    try:
        db.add(document)
        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        # Remove uploaded file if database insert fails
        try:
            supabase.storage \
                .from_(settings.SUPABASE_BUCKET) \
                .remove([storage_path])
        except Exception:
            pass

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save document information.",
        )

    # ========================================================
    # NOTIFY OTHER CASE PARTICIPANT
    # ========================================================

    current_role = cast(UserRole, current_user.role)

    if current_role == UserRole.CLIENT:

        lawyer_id = cast(int | None, case.lawyer_id)

        if lawyer_id is not None:
            NotificationService.create_notification(
                db=db,
                user_id=lawyer_id,
                title="New Document",
                message=(
                    "A client uploaded a new document "
                    "to your case."
                ),
                notification_type=NotificationType.DOCUMENT,
            )

    elif current_role == UserRole.LAWYER:

        client_id = cast(int, case.client_id)

        NotificationService.create_notification(
            db=db,
            user_id=client_id,
            title="New Document",
            message=(
                "Your lawyer uploaded a new document "
                "to your case."
            ),
            notification_type=NotificationType.DOCUMENT,
        )

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "message": "Document uploaded successfully.",
        "document": {
            "id": document.id,
            "case_id": document.case_id,
            "uploaded_by": document.uploaded_by,
            "file_name": document.file_name,
            "category": document.category,
            "storage_path": document.storage_path,
            "file_size": document.file_size,
            "file_type": document.file_type,
            "created_at": document.created_at,
        },
    }


# ============================================================
# GET CASE DOCUMENTS
# ============================================================

@router.get("/{case_id}")
def get_case_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all documents belonging to a case.

    Only the case client and assigned lawyer can access them.
    """

    case = (
        db.query(Case)
        .filter(Case.id == case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    # Verify client/lawyer access
    verify_case_access(case, current_user)

    documents = (
        db.query(Document)
        .filter(Document.case_id == case_id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return documents


# ============================================================
# DOWNLOAD / VIEW DOCUMENT
# ============================================================

@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a temporary signed Supabase URL.

    The URL is valid for 1 hour.
    """

    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    case = (
        db.query(Case)
        .filter(Case.id == document.case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    # Verify access to the case
    verify_case_access(case, current_user)

    try:
        signed_url = (
            supabase.storage
            .from_(settings.SUPABASE_BUCKET)
            .create_signed_url(
                cast(str, document.storage_path),
                3600,
            )
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Unable to generate document URL: "
                f"{str(e)}"
            ),
        )

    # Some Supabase client versions return:
    # {"signedURL": "..."}
    # Others may return:
    # {"signedUrl": "..."}
    if isinstance(signed_url, dict):
        download_url = (
            signed_url.get("signedURL")
            or signed_url.get("signedUrl")
        )
    else:
        download_url = signed_url

    if not download_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to generate document URL.",
        )

    return {
        "file_name": document.file_name,
        "file_type": document.file_type,
        "file_size": document.file_size,
        "download_url": download_url,
        "expires_in": 3600,
    }


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a document.

    Users can only delete documents they uploaded.
    """

    document = (
        db.query(Document)
        .filter(Document.id == document_id)
        .first()
    )

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found.",
        )

    # --------------------------------------------------------
    # Find case
    # --------------------------------------------------------

    case = (
        db.query(Case)
        .filter(Case.id == document.case_id)
        .first()
    )

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found.",
        )

    # --------------------------------------------------------
    # Verify case access
    # --------------------------------------------------------

    verify_case_access(case, current_user)

    # --------------------------------------------------------
    # Only uploader can delete
    # --------------------------------------------------------

    uploaded_by = cast(int, document.uploaded_by)

    if uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete documents that you uploaded.",
        )

    # --------------------------------------------------------
    # Remove from Supabase
    # --------------------------------------------------------

    storage_path = cast(str, document.storage_path)

    try:
        supabase.storage \
            .from_(settings.SUPABASE_BUCKET) \
            .remove([storage_path])

    except Exception:
        # We continue deleting the DB record.
        # You can later add storage cleanup logging.
        pass

    # --------------------------------------------------------
    # Remove database record
    # --------------------------------------------------------

    db.delete(document)
    db.commit()

    return {
        "message": "Document deleted successfully.",
        "document_id": document_id,
    }