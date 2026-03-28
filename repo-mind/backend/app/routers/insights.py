from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.generated_content import GeneratedContent
from app.models.repo_session import RepoSession
from app.models.user import User
from app.routers.auth import get_current_active_user
from app.schemas.insights import (
    ContributorInsightsAnalytics,
    ContributorInsightsGenerateRequest,
    ContributorInsightsResponse,
    ContributorInsightsUpdateRequest,
    ContributorInsightsVersionsResponse,
)
from app.services.ai import ai_service
from app.services.github import github_service


router = APIRouter(prefix="/insights", tags=["Contributor Insights"])


def _empty_analytics() -> dict:
    return {
        "commit_distribution": [],
        "weekly_activity": [],
        "monthly_activity": [],
        "contributor_activity": {"active": 0, "inactive": 0, "total": 0},
        "pull_request_stats": {"opened": 0, "merged": 0, "rejected": 0, "success_ratio": 0.0},
        "issue_stats": {"opened": 0, "closed": 0},
        "top_contributors": {
            "most_active": None,
            "core_maintainers": [],
            "consistent_contributors": [],
        },
        "period_months": 0,
        "commit_total": 0,
    }


def _to_response(content: GeneratedContent) -> ContributorInsightsResponse:
    generation_params = content.generation_params or {}
    analytics = generation_params.get("analytics") or _empty_analytics()
    validated_analytics = ContributorInsightsAnalytics.model_validate(analytics)

    return ContributorInsightsResponse(
        id=content.id,
        repo_session_id=content.repo_session_id,
        content_type=content.content_type,
        version=content.version,
        title=content.title,
        content=content.content,
        generation_params=content.generation_params,
        created_at=content.created_at,
        analytics=validated_analytics,
    )


async def _get_repo_session_for_user(repo_session_id: int, user_id: int, db: AsyncSession) -> RepoSession:
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


async def _get_report_for_user(report_id: int, user_id: int, db: AsyncSession) -> GeneratedContent:
    result = await db.execute(
        select(GeneratedContent)
        .join(RepoSession)
        .where(
            GeneratedContent.id == report_id,
            RepoSession.user_id == user_id,
            GeneratedContent.content_type == "contributor_report",
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contributor report not found",
        )
    return report


async def _next_report_version(repo_session_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == repo_session_id,
            GeneratedContent.content_type == "contributor_report",
        )
        .order_by(desc(GeneratedContent.version))
        .limit(1)
    )
    latest = result.scalar_one_or_none()
    return (latest.version + 1) if latest else 1


@router.post("/generate", response_model=ContributorInsightsResponse)
async def generate_contributor_insights(
    request: ContributorInsightsGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate contribution analytics and an activity report for a repository."""
    repo_session = await _get_repo_session_for_user(request.repo_session_id, current_user.id, db)

    raw_data = await github_service.get_contribution_data(
        owner=repo_session.repo_owner,
        repo=repo_session.repo_name,
        months_back=request.months_back,
    )
    analytics = github_service.analyze_contribution_data(raw_data)

    summary = await ai_service.generate_activity_report(
        repo_name=f"{repo_session.repo_owner}/{repo_session.repo_name}",
        analytics=analytics,
        custom_instructions=request.custom_instructions,
    )

    ai_available = await ai_service.check_ollama_status()
    version = await _next_report_version(repo_session.id, db)

    report = GeneratedContent(
        repo_session_id=repo_session.id,
        content_type="contributor_report",
        version=version,
        title=f"Contributor Insights for {repo_session.repo_owner}/{repo_session.repo_name}",
        content=summary,
        generation_params={
            "model": ai_service.model,
            "ai_available": ai_available,
            "months_back": request.months_back,
            "custom_instructions": request.custom_instructions,
            "analytics": analytics,
            "raw_counts": {
                "commits": len(raw_data.get("commits", [])),
                "pull_requests": len(raw_data.get("pull_requests", [])),
                "issues": len(raw_data.get("issues", [])),
            },
        },
    )

    db.add(report)
    await db.commit()
    await db.refresh(report)

    return _to_response(report)


@router.get("/versions/{repo_session_id}", response_model=ContributorInsightsVersionsResponse)
async def get_contributor_report_versions(
    repo_session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all contributor report versions for a repository session."""
    await _get_repo_session_for_user(repo_session_id, current_user.id, db)

    result = await db.execute(
        select(GeneratedContent)
        .where(
            GeneratedContent.repo_session_id == repo_session_id,
            GeneratedContent.content_type == "contributor_report",
        )
        .order_by(desc(GeneratedContent.version))
    )
    versions = result.scalars().all()

    return ContributorInsightsVersionsResponse(
        versions=[_to_response(version) for version in versions],
        total=len(versions),
    )


@router.get("/{report_id}", response_model=ContributorInsightsResponse)
async def get_contributor_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific contributor report by id."""
    report = await _get_report_for_user(report_id, current_user.id, db)
    return _to_response(report)


@router.put("/{report_id}", response_model=ContributorInsightsResponse)
async def update_contributor_report(
    report_id: int,
    request: ContributorInsightsUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Save edited contributor report content as a new version."""
    original = await _get_report_for_user(report_id, current_user.id, db)
    new_version = await _next_report_version(original.repo_session_id, db)

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

    return _to_response(updated)


@router.get("/{report_id}/download")
async def download_contributor_report(
    report_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Download contributor report as markdown."""
    report = await _get_report_for_user(report_id, current_user.id, db)

    return Response(
        content=report.content,
        media_type="text/markdown",
        headers={"Content-Disposition": "attachment; filename=CONTRIBUTOR_REPORT.md"},
    )
