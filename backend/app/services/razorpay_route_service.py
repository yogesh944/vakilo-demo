import requests
from fastapi import HTTPException

from app.core.config import settings


RAZORPAY_BASE_URL = "https://api.razorpay.com"


class RazorpayRouteService:

    @staticmethod
    def _headers():
        return {
            "Content-Type": "application/json",
        }

    @staticmethod
    def _request(method: str, endpoint: str, payload: dict | None = None):
        try:
            response = requests.request(
                method=method,
                url=f"{RAZORPAY_BASE_URL}{endpoint}",
                auth=(
                    settings.RAZORPAY_KEY_ID,
                    settings.RAZORPAY_KEY_SECRET,
                ),
                headers=RazorpayRouteService._headers(),
                json=payload,
                timeout=30,
            )
        except requests.RequestException as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Unable to connect to Razorpay: {str(exc)}",
            )

        if not response.ok:
            try:
                error_data = response.json()
            except ValueError:
                error_data = response.text

            raise HTTPException(
                status_code=response.status_code,
                detail={
                    "message": "Razorpay Route API request failed.",
                    "razorpay_error": error_data,
                },
            )

        return response.json()

    @staticmethod
    def create_linked_account(
        *,
        email: str,
        phone: str,
        reference_id: str,
        legal_business_name: str,
        business_type: str,
        contact_name: str,
        category: str = "professional_services",
        subcategory: str = "legal_services",
    ):
        payload = {
            "email": email,
            "phone": phone,
            "type": "route",
            "reference_id": reference_id,
            "legal_business_name": legal_business_name,
            "business_type": business_type,
            "contact_name": contact_name,
            "profile": {
                "category": category,
                "subcategory": subcategory,
            },
        }

        return RazorpayRouteService._request(
            "POST",
            "/v2/accounts",
            payload,
        )

    @staticmethod
    def create_stakeholder(
        account_id: str,
        *,
        name: str,
        email: str,
        phone: str,
    ):
        payload = {
            "name": name,
            "email": email,
            "phone": {
                "primary": phone,
            },
        }

        return RazorpayRouteService._request(
            "POST",
            f"/v2/accounts/{account_id}/stakeholders",
            payload,
        )

    @staticmethod
    def request_route_product(account_id: str):
        payload = {
            "product_name": "route",
            "tnc_accepted": True,
        }

        return RazorpayRouteService._request(
            "POST",
            f"/v2/accounts/{account_id}/products",
            payload,
        )