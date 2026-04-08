from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "RepoMind"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./repomind.db"
    
    # JWT Settings
    SECRET_KEY: str = "repomind-super-secret-key-change-in-production-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2:latest"
    
    # GitHub API (no auth needed for public repos)
    GITHUB_API_BASE: str = "https://api.github.com"

    # Email / SMTP settings for password reset
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""          # set in .env  e.g. yourapp@gmail.com
    SMTP_PASSWORD: str = ""      # set in .env  (Gmail App Password)
    SMTP_FROM_NAME: str = "RepoMind"

    # Reset code TTL in minutes
    RESET_CODE_EXPIRE_MINUTES: int = 15

    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()

