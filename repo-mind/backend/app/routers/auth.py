from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta

from app.database import get_db
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token,
    ForgotPasswordRequest, VerifyResetCodeRequest, ResetPasswordRequest,
)
from app.services.auth import AuthService
from app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    user = await AuthService.create_user(db, user_data)
    
    # Create access token (sub must be a string for JWT)
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login user and return access token"""
    user = await AuthService.authenticate_user(db, user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    # Create access token (sub must be a string for JWT)
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Get current authenticated user"""
    token_data = AuthService.decode_token(credentials.credentials)
    user = await AuthService.get_user_by_id(db, token_data.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.model_validate(user)

@router.post("/logout")
async def logout():
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    request: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send a 6-digit reset code to the user's email."""
    await AuthService.send_reset_code(db, request.email)
    return {"message": "If that email is registered, a reset code has been sent."}


@router.post("/verify-reset-code", status_code=status.HTTP_200_OK)
async def verify_reset_code(
    request: VerifyResetCodeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify that the OTP is valid (without resetting the password yet)."""
    valid = await AuthService.verify_reset_code(db, request.email, request.code)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code.",
        )
    return {"message": "Code verified."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    request: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset the password after verifying the OTP."""
    await AuthService.reset_password(db, request.email, request.code, request.new_password)
    return {"message": "Password reset successfully."}

# Dependency to get current user
async def get_current_active_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
):
    """Dependency to get current active user"""
    token_data = AuthService.decode_token(credentials.credentials)
    user = await AuthService.get_user_by_id(db, token_data.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    return user

