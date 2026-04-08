import random
import string
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings
from app.models.user import User
from app.schemas.user import UserCreate, TokenData

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> TokenData:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # sub is stored as string, convert back to int
            sub = payload.get("sub")
            email: str = payload.get("email")
            if sub is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user_id = int(sub)  # Convert string to int
            return TokenData(user_id=user_id, email=email)
        except (JWTError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Get user by email"""
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Get user by username"""
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get user by ID"""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate) -> User:
        """Create a new user"""
        # Check if email exists
        existing_user = await AuthService.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Check if username exists
        existing_username = await AuthService.get_user_by_username(db, user_data.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create new user
        hashed_password = AuthService.get_password_hash(user_data.password)
        db_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password
        )
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = await AuthService.get_user_by_email(db, email)
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user

    # ------------------------------------------------------------------ #
    #  Password-reset helpers                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _generate_otp(length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    @staticmethod
    async def send_reset_code(db: AsyncSession, email: str) -> None:
        """Generate a 6-digit OTP, persist it, and email it to the user."""
        user = await AuthService.get_user_by_email(db, email)
        # Always return silently so we don't leak whether the email exists
        if not user:
            return

        code = AuthService._generate_otp()
        expires = datetime.utcnow() + timedelta(minutes=settings.RESET_CODE_EXPIRE_MINUTES)

        user.reset_code = code
        user.reset_code_expires = expires
        await db.commit()

        await AuthService._send_email(
            to=email,
            subject="RepoMind – Your password reset code",
            body=(
                f"Hi {user.username},\n\n"
                f"Your password reset code is:\n\n"
                f"  {code}\n\n"
                f"It expires in {settings.RESET_CODE_EXPIRE_MINUTES} minutes.\n"
                f"If you did not request this, please ignore this email.\n\n"
                f"– The RepoMind Team"
            ),
        )

    @staticmethod
    async def verify_reset_code(db: AsyncSession, email: str, code: str) -> bool:
        """Return True if the code is valid and not expired."""
        user = await AuthService.get_user_by_email(db, email)
        if not user or not user.reset_code or not user.reset_code_expires:
            return False
        if user.reset_code != code:
            return False
        if datetime.utcnow() > user.reset_code_expires:
            return False
        return True

    @staticmethod
    async def reset_password(db: AsyncSession, email: str, code: str, new_password: str) -> None:
        """Verify code then update the user's password."""
        valid = await AuthService.verify_reset_code(db, email, code)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset code.",
            )
        user = await AuthService.get_user_by_email(db, email)
        user.hashed_password = AuthService.get_password_hash(new_password)
        user.reset_code = None
        user.reset_code_expires = None
        await db.commit()

    @staticmethod
    async def _send_email(to: str, subject: str, body: str) -> None:
        """Send a plain-text email via SMTP (Gmail App Password)."""
        msg = MIMEMultipart()
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to send email: {exc}",
            )
