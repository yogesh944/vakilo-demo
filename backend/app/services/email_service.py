import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings


logger = logging.getLogger(__name__)


def is_email_configured() -> bool:
    return bool(
        settings.SMTP_HOST
        and settings.SMTP_USERNAME
        and settings.SMTP_PASSWORD
        and settings.SMTP_FROM_EMAIL
    )


def send_notification_email(
    recipient: str,
    title: str,
    message: str,
) -> bool:
    """Send an email notification when SMTP is configured.

    Email failures are logged and do not break the original notification
    request, since the in-app notification has already been persisted.
    """
    if not is_email_configured():
        return False

    email = EmailMessage()
    email["Subject"] = f"{settings.SMTP_FROM_NAME}: {title}"
    email["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    email["To"] = recipient
    email.set_content(
        f"{message}\n\n"
        "You are receiving this email because it is related to activity in your Vakilo account."
    )

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(email)
        return True
    except Exception:
        logger.exception("Failed to send notification email to %s", recipient)
        return False