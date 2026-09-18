from fastapi import APIRouter, HTTPException, Query, status

from app.services.ecourts import (
    EcourtsConfigurationError,
    EcourtsLookupError,
    get_case_by_cnr,
)


router = APIRouter(prefix="/ecourts", tags=["eCourts"])


@router.get("/cases")
def lookup_case(cnr: str = Query(..., min_length=8, max_length=32)):
    clean_cnr = cnr.strip().upper()
    if not clean_cnr.replace("-", "").isalnum():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Enter a valid CNR number.",
        )

    try:
        return get_case_by_cnr(clean_cnr)
    except EcourtsConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error
    except EcourtsLookupError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error