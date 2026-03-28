from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import (
    auth_router,
    documentation_router,
    insights_router,
    readme_router,
    repo_router,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("Starting RepoMind API...")
    await init_db()
    print("Database initialized")
    yield
    # Shutdown
    print("Shutting down RepoMind API...")

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Integrated Repository Intelligence Platform",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(repo_router)
app.include_router(readme_router)
app.include_router(documentation_router)
app.include_router(insights_router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from app.services.ai import ai_service
    
    ollama_status = await ai_service.check_ollama_status()
    
    return {
        "status": "healthy",
        "database": "connected",
        "ollama": "connected" if ollama_status else "disconnected",
        "ollama_model": settings.OLLAMA_MODEL
    }


