from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.schemas.content import GeneratedContentResponse


class ContributorInsightsGenerateRequest(BaseModel):
    repo_session_id: int
    months_back: int = Field(default=6, ge=1, le=24)
    custom_instructions: Optional[str] = None


class ChartPoint(BaseModel):
    period: str
    commits: int


class ContributorCommitPoint(BaseModel):
    author: str
    commits: int


class ContributorActivityBreakdown(BaseModel):
    active: int
    inactive: int
    total: int


class PullRequestStats(BaseModel):
    opened: int
    merged: int
    rejected: int
    success_ratio: float


class IssueStats(BaseModel):
    opened: int
    closed: int


class TopContributors(BaseModel):
    most_active: Optional[str] = None
    core_maintainers: List[str]
    consistent_contributors: List[str]


class ContributorInsightsAnalytics(BaseModel):
    commit_distribution: List[ContributorCommitPoint]
    weekly_activity: List[ChartPoint]
    monthly_activity: List[ChartPoint]
    contributor_activity: ContributorActivityBreakdown
    pull_request_stats: PullRequestStats
    issue_stats: IssueStats
    top_contributors: TopContributors
    period_months: int
    commit_total: int


class ContributorInsightsResponse(GeneratedContentResponse):
    content_type: str = "contributor_report"
    analytics: ContributorInsightsAnalytics


class ContributorInsightsUpdateRequest(BaseModel):
    content: str


class ContributorInsightsVersionsResponse(BaseModel):
    versions: List[ContributorInsightsResponse]
    total: int
