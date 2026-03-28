from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class ReadmeGenerateRequest(BaseModel):
    repo_session_id: int
    include_sections: Optional[List[str]] = None  # Optional: specify which sections to include
    custom_instructions: Optional[str] = None  # Additional instructions for AI

class ReadmeSection(BaseModel):
    title: str
    content: str

class ReadmeResponse(BaseModel):
    id: int
    repo_session_id: int
    content_type: str = "readme"
    version: int
    title: Optional[str]
    content: str  # Full markdown content
    sections: Optional[List[ReadmeSection]] = None
    generation_params: Optional[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True

class ReadmeUpdateRequest(BaseModel):
    content: str
    
class ReadmeVersionsResponse(BaseModel):
    versions: List[ReadmeResponse]
    total: int


