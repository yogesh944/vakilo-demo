from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import socketio

import app.sockets.video_socket

from app.core.database import Base, engine
from app.core.supabase import supabase
from app.core.config import settings
from app.sockets.chat_socket import sio

# ============================================================
# IMPORT MODELS BEFORE create_all()
# ============================================================

from app.models.user import User
from app.models.client_profile import ClientProfile
from app.models.lawyer_profile import LawyerProfile
from app.models.case import Case
from app.models.case_intake import CaseIntakeMessage
from app.models.payment import Payment
from app.models.document import Document
from app.models.appointment import Appointment
from app.models.chat import ChatMessage
from app.models.video_call import VideoCall
from app.models.notification import Notification
from app.models.case_lawyer_request import (
    CaseLawyerRequest,
)


# ============================================================
# IMPORT ROUTERS
# ============================================================

from app.routes.auth import router as auth_router
from app.routes.clients import router as clients_router
from app.routes.lawyers import router as lawyers_router
from app.routes.cases import router as cases_router
from app.routes.case_summary import router as case_summary_router
from app.routes.intake import router as intake_router
from app.routes.recommendation import router as recommendation_router
from app.routes.news import router as news_router
from app.routes.appointments import router as appointment_router
from app.routes.payment import router as payment_router
from app.routes.document import router as document_router
from app.routes.chat import router as chat_router
from app.routes.video import router as video_router
from app.routes.notification import router as notification_router
from app.routes.admin import router as admin_router
from app.routes.lawyer_cases import (
    router as lawyer_cases_router
)
from app.routes.lawyer_requests import (
    router as lawyer_requests_router,
)
from app.routes.case_assignment import (
    router as case_assignment_router,
)
from app.routes.case_analysis import router as case_analysis_router
from app.routes.razorpay_route import router as razorpay_route_router
from app.routes.ecourts import router as ecourts_router


# ============================================================
# DATABASE TABLE CREATION
# ============================================================

print("Creating database tables...")

Base.metadata.create_all(bind=engine)

print(
    "Tables:",
    Base.metadata.tables.keys()
)


# ============================================================
# FASTAPI APPLICATION
# ============================================================

fastapi_app = FastAPI(
    title="Vakilo API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://vakilo-demo-75le-iota.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REGISTER ROUTERS
# ============================================================

fastapi_app.include_router(auth_router)

fastapi_app.include_router(clients_router)

fastapi_app.include_router(lawyers_router)

fastapi_app.include_router(cases_router)

fastapi_app.include_router(
    lawyer_cases_router
)

fastapi_app.include_router(
    lawyer_requests_router
)

fastapi_app.include_router(
    case_analysis_router
)

fastapi_app.include_router(
    case_assignment_router
)

fastapi_app.include_router(case_summary_router)

fastapi_app.include_router(intake_router)

fastapi_app.include_router(recommendation_router)

fastapi_app.include_router(news_router)

fastapi_app.include_router(appointment_router)

fastapi_app.include_router(payment_router)

fastapi_app.include_router(document_router)

fastapi_app.include_router(chat_router)

fastapi_app.include_router(video_router)

fastapi_app.include_router(notification_router)
fastapi_app.include_router(razorpay_route_router)

fastapi_app.include_router(ecourts_router)


fastapi_app.include_router(admin_router)


# ============================================================
# ROOT ENDPOINT
# ============================================================

@fastapi_app.get("/")
def root():
    return {
        "message": "Welcome to Vakilo API",
        "status": "running",
    }


# ============================================================
# DATABASE TEST
# ============================================================

@fastapi_app.get("/test-db")
def test_database():

    try:

        with engine.connect() as connection:

            result = connection.execute(
                text("SELECT 1")
            )

            return {
                "database": "connected",
                "result": result.scalar(),
            }

    except Exception as error:

        return {
            "database": "connection failed",
            "error": str(error),
        }


# ============================================================
# SUPABASE TEST
# ============================================================

@fastapi_app.get("/test-supabase")
def test_supabase():

    try:

        buckets = (
            supabase.storage.list_buckets()
        )

        return {
            "status": "connected",
            "buckets": buckets,
        }

    except Exception as error:

        return {
            "status": "failed",
            "error": str(error),
        }


# ============================================================
# SUPABASE CONFIG CHECK
# ============================================================

@fastapi_app.get(
    "/check-supabase-config"
)
def check_supabase_config():

    return {
        "url": settings.SUPABASE_URL,
        "key_prefix": settings.SUPABASE_KEY[:15],
        "bucket": settings.SUPABASE_BUCKET,
    }


# ============================================================
# SOCKET.IO APPLICATION
# ============================================================

app = socketio.ASGIApp(
    sio,
    other_asgi_app=fastapi_app,
)
