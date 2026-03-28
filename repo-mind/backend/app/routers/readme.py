from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.repo_session import RepoSession
from app.models.generated_content import GeneratedContent
from app.schemas.readme import ReadmeGenerateRequest, ReadmeResponse, ReadmeUpdateRequest, ReadmeVersionsResponse
from app.services.github import github_service
from app.services.ai import ai_service
from app.routers.auth import get_current_active_user

router = APIRouter(prefix="/readme", tags=["README Generator"])

@router.post("/generate", response_model=ReadmeResponse)
async def generate_readme(
    request: ReadmeGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate README for a repository"""
    # Get repo session
    result = await db.execute(
        select(RepoSession)
        .where(RepoSession.id == request.repo_session_id, RepoSession.user_id == current_user.id)
    )
    repo_session = result.scalar_one_or_none()
    
    if not repo_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository session not found"
        )
    
    # Get existing README if any
    existing_readme = await github_service.get_existing_readme(
        repo_session.repo_owner,
        repo_session.repo_name
    )
    
    # Get the latest version number for this repo's READMEs
    version_result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == repo_session.id,
            GeneratedContent.content_type == "readme"
        )
        .order_by(desc(GeneratedContent.version))
        .limit(1)
    )
    latest_readme = version_result.scalar_one_or_none()
    new_version = (latest_readme.version + 1) if latest_readme else 1
    
    # Generate README using AI
    readme_content = await ai_service.generate_readme(
        repo_name=f"{repo_session.repo_owner}/{repo_session.repo_name}",
        repo_description=repo_session.repo_description,
        metadata=repo_session.repo_metadata or {},
        tech_stack=repo_session.tech_stack or {},
        file_structure=repo_session.file_structure or [],
        existing_readme=existing_readme,
        include_sections=request.include_sections,
        custom_instructions=request.custom_instructions
    )
    
    # Save generated README
    generated_content = GeneratedContent(
        repo_session_id=repo_session.id,
        content_type="readme",
        version=new_version,
        title=f"README for {repo_session.repo_owner}/{repo_session.repo_name}",
        content=readme_content,
        generation_params={
            "model": ai_service.model,
            "include_sections": request.include_sections,
            "custom_instructions": request.custom_instructions,
            "had_existing_readme": existing_readme is not None
        }
    )
    
    db.add(generated_content)
    await db.commit()
    await db.refresh(generated_content)
    
    return ReadmeResponse(
        id=generated_content.id,
        repo_session_id=generated_content.repo_session_id,
        content_type=generated_content.content_type,
        version=generated_content.version,
        title=generated_content.title,
        content=generated_content.content,
        generation_params=generated_content.generation_params,
        created_at=generated_content.created_at
    )

@router.get("/versions/{repo_session_id}", response_model=ReadmeVersionsResponse)
async def get_readme_versions(
    repo_session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all README versions for a repository session"""
    # Verify user owns this session
    session_result = await db.execute(
        select(RepoSession)
        .where(RepoSession.id == repo_session_id, RepoSession.user_id == current_user.id)
    )
    if not session_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository session not found"
        )
    
    # Get all versions
    result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == repo_session_id,
            GeneratedContent.content_type == "readme"
        )
        .order_by(desc(GeneratedContent.version))
    )
    versions = result.scalars().all()
    
    return ReadmeVersionsResponse(
        versions=[ReadmeResponse.model_validate(v) for v in versions],
        total=len(versions)
    )

@router.get("/{readme_id}", response_model=ReadmeResponse)
async def get_readme(
    readme_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific README"""
    result = await db.execute(
        select(GeneratedContent)
        .join(RepoSession)
        .where(
            GeneratedContent.id == readme_id,
            RepoSession.user_id == current_user.id
        )
    )
    readme = result.scalar_one_or_none()
    
    if not readme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="README not found"
        )
    
    return ReadmeResponse.model_validate(readme)

@router.put("/{readme_id}", response_model=ReadmeResponse)
async def update_readme(
    readme_id: int,
    request: ReadmeUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update README content (save user edits as new version)"""
    # Get original README
    result = await db.execute(
        select(GeneratedContent)
        .join(RepoSession)
        .where(
            GeneratedContent.id == readme_id,
            RepoSession.user_id == current_user.id
        )
    )
    original_readme = result.scalar_one_or_none()
    
    if not original_readme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="README not found"
        )
    
    # Get latest version number
    version_result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == original_readme.repo_session_id,
            GeneratedContent.content_type == "readme"
        )
        .order_by(desc(GeneratedContent.version))
        .limit(1)
    )
    latest = version_result.scalar_one_or_none()
    new_version = (latest.version + 1) if latest else 1
    
    # Create new version with updated content
    new_readme = GeneratedContent(
        repo_session_id=original_readme.repo_session_id,
        content_type="readme",
        version=new_version,
        title=original_readme.title,
        content=request.content,
        generation_params={
            **original_readme.generation_params,
            "edited": True,
            "based_on_version": original_readme.version
        }
    )
    
    db.add(new_readme)
    await db.commit()
    await db.refresh(new_readme)
    
    return ReadmeResponse.model_validate(new_readme)

@router.get("/{readme_id}/download")
async def download_readme(
    readme_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Download README as .md file"""
    result = await db.execute(
        select(GeneratedContent)
        .join(RepoSession)
        .where(
            GeneratedContent.id == readme_id,
            RepoSession.user_id == current_user.id
        )
    )
    readme = result.scalar_one_or_none()
    
    if not readme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="README not found"
        )
    
    return Response(
        content=readme.content,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f"attachment; filename=README.md"
        }
    )

@router.get("/check/ollama")
async def check_ollama():
    """Check if Ollama AI service is available"""
    is_available = await ai_service.check_ollama_status()
    return {
        "available": is_available,
        "model": ai_service.model,
        "base_url": ai_service.base_url
    }
