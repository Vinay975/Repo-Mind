from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
from typing import Optional, List, Dict, Any

class RepoAnalyzeRequest(BaseModel):
    repo_url: str = Field(..., description="GitHub repository URL")

class FileNode(BaseModel):
    name: str
    path: str
    type: str  # 'file' or 'dir'
    children: Optional[List['FileNode']] = None

class TechStack(BaseModel):
    languages: Dict[str, float]  # language: percentage
    frameworks: List[str]
    package_managers: List[str]
    detected_configs: List[str]

class RepoMetadata(BaseModel):
    full_name: str
    description: Optional[str]
    stars: int
    forks: int
    watchers: int
    open_issues: int
    default_branch: str
    created_at: str
    updated_at: str
    license: Optional[str]
    topics: List[str]
    size: int  # in KB
    homepage: Optional[str]

class RepoAnalyzeResponse(BaseModel):
    id: int
    repo_url: str
    repo_owner: str
    repo_name: str
    repo_description: Optional[str]
    metadata: RepoMetadata
    file_structure: List[FileNode]
    tech_stack: TechStack
    created_at: datetime
    
    class Config:
        from_attributes = True

class RepoSessionResponse(BaseModel):
    id: int
    repo_url: str
    repo_owner: str
    repo_name: str
    repo_description: Optional[str]
    metadata: Optional[Dict[str, Any]] = None
    file_structure: Optional[List[Dict[str, Any]]] = None
    tech_stack: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm_with_metadata(cls, obj):
        return cls(
            id=obj.id,
            repo_url=obj.repo_url,
            repo_owner=obj.repo_owner,
            repo_name=obj.repo_name,
            repo_description=obj.repo_description,
            metadata=obj.repo_metadata,
            file_structure=obj.file_structure,
            tech_stack=obj.tech_stack,
            created_at=obj.created_at,
            updated_at=obj.updated_at
        )

