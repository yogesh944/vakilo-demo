from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    DATABASE_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Gemini
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # GNews
    GNEWS_API_KEY: str = ""

    # eCourts provider (keep provider credentials on the backend)
    ECOURTS_API_URL: str = ""
    ECOURTS_API_KEY: str = ""
    ECOURTS_CNR_PARAM: str = "cnr"

    # Razorpay (NEW)
    RAZORPAY_KEY_ID: str
    RAZORPAY_KEY_SECRET: str

    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_BUCKET: str

    CORS_ORIGINS: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "https://vakilo-demo-mu.vercel.app"
    )

    # Email notifications (optional until SMTP is configured)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 2525
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Vakilo"
    SMTP_USE_TLS: bool = True

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8"
    )


settings = Settings()  # type: ignore