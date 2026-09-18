from fastapi import APIRouter, HTTPException, Query, status

from app.services.gnews import get_legal_news


router = APIRouter(
    prefix="/news",
    tags=["News"],
)


@router.get("/legal")
def legal_news(
    limit: int = Query(default=3, ge=1, le=10),
):
    try:
        return {"articles": get_legal_news(limit)}
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error