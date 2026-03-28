from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class GeneratedContentResponse(BaseModel):
    id: int
    repo_session_id: int
    content_type: str
    version: int
    title: Optional[str] = None
    content: str
    generation_params: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GeneratedContentVersionsResponse(BaseModel):
    versions: List[GeneratedContentResponse]
    total: int


class GeneratedContentUpdateRequest(BaseModel):
    content: str


class PushContentRequest(BaseModel):
    content_id: int
    github_token: str
    target_path: Optional[str] = None
    branch: Optional[str] = None
    commit_message: Optional[str] = None


class PushContentResponse(BaseModel):
    path: str
    branch: str
    commit_sha: Optional[str] = None
    commit_url: Optional[str] = None


class GeneratedContentDownloadResponse(BaseModel):
    filename: str
    mime_type: str = "text/markdown"
