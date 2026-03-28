from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.generated_content import GeneratedContent
from app.models.repo_session import RepoSession
from app.models.user import User
from app.routers.auth import get_current_active_user
from app.schemas.content import GeneratedContentResponse, GeneratedContentVersionsResponse
from app.schemas.documentation import (
    DocumentType,
    DocumentationGenerateRequest,
    DocumentationResponse,
    DocumentationUpdateRequest,
)
from app.services.ai import ai_service


router = APIRouter(prefix="/documentation", tags=["Project Documentation"])


async def _get_repo_session_for_user(
    repo_session_id: int,
    user_id: int,
    db: AsyncSession,
) -> RepoSession:
    result = await db.execute(
        select(RepoSession).where(
            RepoSession.id == repo_session_id,
            RepoSession.user_id == user_id,
        )
    )
    repo_session = result.scalar_one_or_none()
    if not repo_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository session not found",
        )
    return repo_session


async def _get_document_for_user(
    document_id: int,
    user_id: int,
    db: AsyncSession,
) -> GeneratedContent:
    result = await db.execute(
        select(GeneratedContent)
        .join(RepoSession)
        .where(
            GeneratedContent.id == document_id,
            RepoSession.user_id == user_id,
            GeneratedContent.content_type.in_(["project_summary", "license"]),
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return document


async def _next_version(repo_session_id: int, content_type: str, db: AsyncSession) -> int:
    result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == repo_session_id,
            GeneratedContent.content_type == content_type,
        )
        .order_by(desc(GeneratedContent.version))
        .limit(1)
    )
    latest = result.scalar_one_or_none()
    return (latest.version + 1) if latest else 1


@router.post("/generate", response_model=DocumentationResponse)
async def generate_documentation(
    request: DocumentationGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate project documentation (project summary or license)."""
    repo_session = await _get_repo_session_for_user(request.repo_session_id, current_user.id, db)

    ai_available = await ai_service.check_ollama_status()
    content_type = request.document_type

    if content_type == "license":
        content = await ai_service.generate_license_document(
            repo_name=f"{repo_session.repo_owner}/{repo_session.repo_name}",
            owner_name=repo_session.repo_owner,
            detected_license=(repo_session.repo_metadata or {}).get("license"),
            custom_instructions=request.custom_instructions,
        )
        title = f"License for {repo_session.repo_owner}/{repo_session.repo_name}"
    else:
        content = await ai_service.generate_project_documentation(
            repo_name=f"{repo_session.repo_owner}/{repo_session.repo_name}",
            repo_description=repo_session.repo_description,
            metadata=repo_session.repo_metadata or {},
            tech_stack=repo_session.tech_stack or {},
            file_structure=repo_session.file_structure or [],
            include_visuals=request.include_visuals,
            custom_instructions=request.custom_instructions,
        )
        title = f"Project Summary for {repo_session.repo_owner}/{repo_session.repo_name}"

    version = await _next_version(repo_session.id, content_type, db)

    generated = GeneratedContent(
        repo_session_id=repo_session.id,
        content_type=content_type,
        version=version,
        title=title,
        content=content,
        generation_params={
            "model": ai_service.model,
            "ai_available": ai_available,
            "include_visuals": request.include_visuals,
            "custom_instructions": request.custom_instructions,
        },
    )

    db.add(generated)
    await db.commit()
    await db.refresh(generated)

    return DocumentationResponse.model_validate(generated)


@router.get("/versions/{repo_session_id}", response_model=GeneratedContentVersionsResponse)
async def get_document_versions(
    repo_session_id: int,
    document_type: DocumentType = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all versions of a specific documentation type for a repository session."""
    await _get_repo_session_for_user(repo_session_id, current_user.id, db)

    result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == repo_session_id,
            GeneratedContent.content_type == document_type,
        )
        .order_by(desc(GeneratedContent.version))
    )
    versions = result.scalars().all()

    return GeneratedContentVersionsResponse(
        versions=[GeneratedContentResponse.model_validate(item) for item in versions],
        total=len(versions),
    )


@router.get("/{document_id}", response_model=DocumentationResponse)
async def get_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific documentation version."""
    document = await _get_document_for_user(document_id, current_user.id, db)
    return DocumentationResponse.model_validate(document)


@router.put("/{document_id}", response_model=DocumentationResponse)
async def update_document(
    document_id: int,
    request: DocumentationUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Save document edits as a new version."""
    original = await _get_document_for_user(document_id, current_user.id, db)
    new_version = await _next_version(original.repo_session_id, original.content_type, db)

    updated = GeneratedContent(
        repo_session_id=original.repo_session_id,
        content_type=original.content_type,
        version=new_version,
        title=original.title,
        content=request.content,
        generation_params={
            **(original.generation_params or {}),
            "edited": True,
            "based_on_version": original.version,
        },
    )

    db.add(updated)
    await db.commit()
    await db.refresh(updated)

    return DocumentationResponse.model_validate(updated)


@router.get("/{document_id}/download")
async def download_document(
    document_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a documentation file as markdown."""
    document = await _get_document_for_user(document_id, current_user.id, db)

    filename = "PROJECT_SUMMARY.md" if document.content_type == "project_summary" else "LICENSE"

    return Response(
        content=document.content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
