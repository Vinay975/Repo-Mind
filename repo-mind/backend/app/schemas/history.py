from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.content import GeneratedContentResponse


class RepositoryHistoryResponse(BaseModel):
    repo_session_id: int
    repo_url: str
    readme_versions: List[GeneratedContentResponse]
    documentation_versions: List[GeneratedContentResponse]
    contributor_reports: List[GeneratedContentResponse]
    total_items: int
    last_updated: Optional[datetime] = None
