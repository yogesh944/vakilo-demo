import argparse
import sys

# Import all models to configure SQLAlchemy relationships
from app.models.user import User, UserRole
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
from app.models.case_lawyer_request import CaseLawyerRequest

from app.core.database import engine
from sqlalchemy.orm import Session
from app.core.security import hash_password

def create_or_promote_admin(email: str, password: str = None, full_name: str = "Administrator"):
    with Session(engine) as db:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if user:
            print(f"User found with email {email}. Promoting to ADMIN...")
            user.role = UserRole.ADMIN
            user.is_active = True
            user.is_verified = True
            if password:
                user.hashed_password = hash_password(password)
                print("Updated password.")
            db.commit()
            print(f"Success! User '{user.full_name}' ({user.email}) is now an ADMIN.")
        else:
            if not password:
                print("Error: Password is required to create a new user.")
                sys.exit(1)
            new_admin = User(
                full_name=full_name,
                email=email.strip().lower(),
                hashed_password=hash_password(password),
                role=UserRole.ADMIN,
                is_active=True,
                is_verified=True,
            )
            db.add(new_admin)
            db.commit()
            db.refresh(new_admin)
            print(f"Success! Created new ADMIN user '{new_admin.full_name}' ({new_admin.email}) with ID: {new_admin.id}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create or promote a user to ADMIN in Vakilo")
    parser.add_argument("--email", default="admin@vakilo.com", help="Admin email address")
    parser.add_argument("--password", default="admin123456", help="Admin password")
    parser.add_argument("--name", default="Vakilo Super Admin", help="Full name of admin")
    args = parser.parse_args()

    create_or_promote_admin(args.email, args.password, args.name)
