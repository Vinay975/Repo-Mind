from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.repo_session import RepoSession
from app.models.generated_content import GeneratedContent
from app.schemas.content import (
    GeneratedContentResponse,
    PushContentRequest,
    PushContentResponse,
)
from app.schemas.history import RepositoryHistoryResponse
from app.schemas.repo import RepoAnalyzeRequest, RepoAnalyzeResponse, RepoSessionResponse
from app.services.github import github_service
from app.routers.auth import get_current_active_user

router = APIRouter(prefix="/repo", tags=["Repository"])


def _default_push_path(content_type: str) -> str:
    mapping = {
        "readme": "README.md",
        "project_summary": "docs/PROJECT_SUMMARY.md",
        "license": "LICENSE",
        "contributor_report": "docs/CONTRIBUTOR_REPORT.md",
    }
    return mapping.get(content_type, f"docs/{content_type.upper()}.md")

@router.post("/analyze", response_model=RepoAnalyzeResponse)
async def analyze_repository(
    request: RepoAnalyzeRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Analyze a GitHub repository"""
    # Parse GitHub URL
    owner, repo_name = github_service.parse_github_url(request.repo_url)
    
    # Validate and get metadata
    metadata = await github_service.get_repo_metadata(owner, repo_name)
    
    # Get languages
    languages = await github_service.get_languages(owner, repo_name)
    
    # Get file structure
    default_branch = metadata.get("default_branch", "main")
    file_structure = await github_service.get_file_tree(owner, repo_name, default_branch)
    
    # Detect tech stack
    tech_stack = await github_service.detect_tech_stack(owner, repo_name, file_structure, languages)
    
    # Create repo session
    repo_session = RepoSession(
        user_id=current_user.id,
        repo_url=request.repo_url,
        repo_owner=owner,
        repo_name=repo_name,
        repo_description=metadata.get("description"),
        repo_metadata=metadata,
        file_structure=file_structure,
        tech_stack=tech_stack
    )
    
    db.add(repo_session)
    await db.commit()
    await db.refresh(repo_session)
    
    return RepoAnalyzeResponse(
        id=repo_session.id,
        repo_url=repo_session.repo_url,
        repo_owner=repo_session.repo_owner,
        repo_name=repo_session.repo_name,
        repo_description=repo_session.repo_description,
        metadata=metadata,
        file_structure=file_structure,
        tech_stack=tech_stack,
        created_at=repo_session.created_at
    )

@router.get("/sessions", response_model=List[RepoSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 10,
    offset: int = 0
):
    """Get user's repository sessions (history)"""
    result = await db.execute(
        select(RepoSession)
        .where(RepoSession.user_id == current_user.id)
        .order_by(desc(RepoSession.created_at))
        .limit(limit)
        .offset(offset)
    )
    sessions = result.scalars().all()
    
    return [RepoSessionResponse.from_orm_with_metadata(session) for session in sessions]

@router.get("/sessions/{session_id}", response_model=RepoSessionResponse)
async def get_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific repository session"""
    result = await db.execute(
        select(RepoSession)
        .where(RepoSession.id == session_id, RepoSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return RepoSessionResponse.from_orm_with_metadata(session)

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a repository session"""
    result = await db.execute(
        select(RepoSession)
        .where(RepoSession.id == session_id, RepoSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    await db.delete(session)
    await db.commit()
    
    return {"message": "Session deleted successfully"}


@router.get("/sessions/{session_id}/history", response_model=RepositoryHistoryResponse)
async def get_session_history(
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get unified history and versioning data for a repository session."""
    session_result = await db.execute(
        select(RepoSession).where(
            RepoSession.id == session_id,
            RepoSession.user_id == current_user.id,
        )
    )
    repo_session = session_result.scalar_one_or_none()
    if not repo_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    content_result = await db.execute(
        select(GeneratedContent)
        .where(GeneratedContent.repo_session_id == session_id)
        .order_by(desc(GeneratedContent.created_at))
    )
    all_content = content_result.scalars().all()

    readme_versions: List[GeneratedContentResponse] = []
    documentation_versions: List[GeneratedContentResponse] = []
    contributor_reports: List[GeneratedContentResponse] = []

    for item in all_content:
        mapped = GeneratedContentResponse.model_validate(item)
        if item.content_type == "readme":
            readme_versions.append(mapped)
        elif item.content_type in ("project_summary", "license"):
            documentation_versions.append(mapped)
        elif item.content_type == "contributor_report":
            contributor_reports.append(mapped)

    last_updated = all_content[0].created_at if all_content else None

    return RepositoryHistoryResponse(
        repo_session_id=repo_session.id,
        repo_url=repo_session.repo_url,
        readme_versions=readme_versions,
        documentation_versions=documentation_versions,
        contributor_reports=contributor_reports,
        total_items=len(all_content),
        last_updated=last_updated,
    )


@router.post("/push-content", response_model=PushContentResponse)
async def push_generated_content(
    request: PushContentRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Push generated markdown content directly to GitHub repository."""
    content_result = await db.execute(
        select(GeneratedContent)
        .join(RepoSession)
        .where(
            GeneratedContent.id == request.content_id,
            RepoSession.user_id == current_user.id,
        )
    )
    content_item = content_result.scalar_one_or_none()
    if not content_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generated content not found",
        )

    session_result = await db.execute(
        select(RepoSession).where(RepoSession.id == content_item.repo_session_id)
    )
    repo_session = session_result.scalar_one_or_none()
    if not repo_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository session not found",
        )

    default_branch = (repo_session.repo_metadata or {}).get("default_branch", "main")
    branch = request.branch or default_branch
    target_path = request.target_path or _default_push_path(content_item.content_type)
    commit_message = request.commit_message or f"chore: update {target_path} via RepoMind"

    push_result = await github_service.push_file(
        owner=repo_session.repo_owner,
        repo=repo_session.repo_name,
        path=target_path,
        content=content_item.content,
        github_token=request.github_token,
        branch=branch,
        commit_message=commit_message,
    )

    return PushContentResponse.model_validate(push_result)
