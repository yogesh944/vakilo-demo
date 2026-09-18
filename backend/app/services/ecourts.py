import json
from urllib.parse import quote, urlencode, urlparse
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import settings


class EcourtsConfigurationError(RuntimeError):
    pass


class EcourtsLookupError(RuntimeError):
    pass


def _first_value(payload: dict, *keys: str):
    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value
    return None


def _normalise(payload: dict, cnr_number: str) -> dict:
    data = payload.get("data", payload)
    if isinstance(data, list):
        data = data[0] if data else {}
    if not isinstance(data, dict):
        data = {}

    raw_status = _first_value(data, "status", "case_status", "caseStatus") or "Unknown"
    stages = data.get("stages") or data.get("timeline") or []
    if not isinstance(stages, list):
        stages = []
    if not stages:
        stages = [{"label": raw_status, "status": raw_status, "completed": False}]

    return {
        "cnr_number": cnr_number,
        "case_number": _first_value(data, "case_number", "caseNumber", "registration_number"),
        "title": _first_value(data, "title", "case_title", "caseTitle", "petitioner") or "Court case",
        "court": _first_value(data, "court", "court_name", "courtName"),
        "case_type": _first_value(data, "case_type", "caseType", "type"),
        "status": raw_status,
        "next_hearing_date": _first_value(data, "next_hearing_date", "nextHearingDate", "next_hearing"),
        "last_updated": _first_value(data, "last_updated", "lastUpdated", "updated_at"),
        "stages": stages,
        "source": "eCourts India",
    }


def get_case_by_cnr(cnr_number: str) -> dict:
    provider_url = settings.ECOURTS_API_URL.strip()
    parsed_url = urlparse(provider_url)
    if (
        not provider_url
        or provider_url == "your_ecourts_api_endpoint"
        or parsed_url.scheme not in {"http", "https"}
        or not parsed_url.netloc
    ):
        raise EcourtsConfigurationError(
            "Set ECOURTS_API_URL to a valid http(s) JSON endpoint in the backend .env file."
        )

    uses_path_template = "{cnr}" in provider_url
    request_url = provider_url.replace(
        "{cnr}",
        quote(cnr_number, safe=""),
    )
    query = urlencode({settings.ECOURTS_CNR_PARAM: cnr_number})
    if not uses_path_template:
        separator = "&" if "?" in request_url else "?"
        request_url = f"{request_url}{separator}{query}"
    request = Request(
        request_url,
        headers={
            "Accept": "application/json",
            **(
                {"Authorization": f"Bearer {settings.ECOURTS_API_KEY}"}
                if settings.ECOURTS_API_KEY
                else {}
            ),
        },
    )

    try:
        with urlopen(request, timeout=15) as response:
            payload = json.load(response)
    except HTTPError as error:
        if error.code in {401, 403}:
            raise EcourtsLookupError(
                "eCourtIndia rejected the API key. Check ECOURTS_API_KEY."
            ) from error
        if error.code == 404:
            raise EcourtsLookupError(
                "The eCourtIndia case endpoint was not found. Check ECOURTS_API_URL."
            ) from error
        raise EcourtsLookupError(
            f"eCourtIndia returned HTTP {error.code}."
        ) from error
    except json.JSONDecodeError as error:
        raise EcourtsLookupError(
            "eCourtIndia returned a non-JSON response. Check the API endpoint."
        ) from error
    except (TimeoutError, URLError) as error:
        raise EcourtsLookupError("The eCourtIndia service could not be reached.") from error

    if not isinstance(payload, dict):
        raise EcourtsLookupError("The eCourts service returned an invalid response.")

    if payload.get("success") is False or payload.get("found") is False:
        raise EcourtsLookupError("No case was found for this CNR number.")

    return _normalise(payload, cnr_number)