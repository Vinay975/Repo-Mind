from app.routers.auth import router as auth_router
from app.routers.repo import router as repo_router
from app.routers.readme import router as readme_router
from app.routers.documentation import router as documentation_router
from app.routers.insights import router as insights_router

__all__ = [
    "auth_router",
    "repo_router",
    "readme_router",
    "documentation_router",
    "insights_router",
]


