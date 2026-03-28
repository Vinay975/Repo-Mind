from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.content import GeneratedContentResponse


DocumentType = Literal["project_summary", "license"]


class DocumentationGenerateRequest(BaseModel):
    repo_session_id: int
    document_type: DocumentType = Field(..., description="Type of document to generate")
    include_visuals: bool = Field(default=False, description="Include optional architecture visuals")
    custom_instructions: Optional[str] = None


class DocumentationResponse(GeneratedContentResponse):
    content_type: DocumentType


class DocumentationUpdateRequest(BaseModel):
    content: str
