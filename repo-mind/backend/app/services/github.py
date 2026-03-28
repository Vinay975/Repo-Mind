import base64
import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any, Tuple

import httpx
from fastapi import HTTPException, status

from app.config import settings


class GitHubService:
    def __init__(self):
        self.base_url = settings.GITHUB_API_BASE
        self.default_headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "RepoMind-App",
        }

    def _build_headers(self, token: Optional[str] = None) -> Dict[str, str]:
        headers = dict(self.default_headers)
        if token:
            headers["Authorization"] = f"Bearer {token.strip()}"
        return headers

    @staticmethod
    def parse_github_url(url: str) -> Tuple[str, str]:
        """Parse GitHub URL to extract owner and repository name."""
        patterns = [
            r"github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/.*)?$",
            r"^([^/]+)/([^/]+)$",
        ]

        normalized = url.strip()

        for pattern in patterns:
            match = re.search(pattern, normalized)
            if match:
                owner = match.group(1)
                repo = match.group(2).replace(".git", "").strip()
                return owner, repo

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid GitHub URL format. Use https://github.com/owner/repo",
        )

    async def validate_repo(self, owner: str, repo: str) -> Dict[str, Any]:
        """Validate that repository exists and is accessible."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}",
                headers=self._build_headers(),
                timeout=30.0,
            )

            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Repository not found. Make sure it exists and is public.",
                )
            if response.status_code == 403:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access forbidden. The repository may be private or rate-limited.",
                )
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"GitHub API error: {response.status_code}",
                )

            return response.json()

    async def get_repo_metadata(self, owner: str, repo: str) -> Dict[str, Any]:
        """Get repository metadata."""
        data = await self.validate_repo(owner, repo)

        return {
            "full_name": data.get("full_name"),
            "description": data.get("description"),
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "watchers": data.get("watchers_count", 0),
            "open_issues": data.get("open_issues_count", 0),
            "default_branch": data.get("default_branch", "main"),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
            "license": data.get("license", {}).get("name") if data.get("license") else None,
            "topics": data.get("topics", []),
            "size": data.get("size", 0),
            "homepage": data.get("homepage"),
        }

    async def get_languages(self, owner: str, repo: str) -> Dict[str, float]:
        """Get repository languages with percentages."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}/languages",
                headers=self._build_headers(),
                timeout=30.0,
            )

            if response.status_code != 200:
                return {}

            languages = response.json()
            total = sum(languages.values())
            if total == 0:
                return {}

            return {
                lang: round((byte_count / total) * 100, 2)
                for lang, byte_count in languages.items()
            }

    async def get_file_tree(self, owner: str, repo: str, branch: str = "main", path: str = "") -> List[Dict[str, Any]]:
        """Get repository file tree recursively and convert to hierarchy."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1",
                headers=self._build_headers(),
                timeout=60.0,
            )

            if response.status_code != 200:
                if branch == "main":
                    return await self.get_file_tree(owner, repo, "master", path)
                return []

            data = response.json()
            tree = data.get("tree", [])
            return self._build_tree_structure(tree)

    def _build_tree_structure(self, flat_tree: List[Dict[str, Any]], max_depth: int = 3) -> List[Dict[str, Any]]:
        """Convert flat Git tree response to a hierarchical structure."""
        root: List[Dict[str, Any]] = []
        path_map: Dict[str, Dict[str, Any]] = {}

        sorted_tree = sorted(flat_tree, key=lambda item: item.get("path", ""))

        for item in sorted_tree:
            path = item.get("path", "")
            if not path:
                continue

            node_type = "dir" if item.get("type") == "tree" else "file"
            depth = path.count("/")
            if depth >= max_depth:
                continue

            node: Dict[str, Any] = {
                "name": path.split("/")[-1],
                "path": path,
                "type": node_type,
            }

            if node_type == "dir":
                node["children"] = []
                path_map[path] = node

            parent_path = "/".join(path.split("/")[:-1])
            if parent_path and parent_path in path_map:
                path_map[parent_path]["children"].append(node)
            elif not parent_path:
                root.append(node)

        return root

    async def get_file_content(self, owner: str, repo: str, path: str, branch: str = "main") -> Optional[str]:
        """Get content of a specific file from repository."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/repos/{owner}/{repo}/contents/{path}?ref={branch}",
                headers=self._build_headers(),
                timeout=30.0,
            )

            if response.status_code != 200:
                if branch == "main":
                    return await self.get_file_content(owner, repo, path, "master")
                return None

            data = response.json()
            if data.get("encoding") == "base64":
                decoded = base64.b64decode(data.get("content", ""))
                return decoded.decode("utf-8", errors="ignore")

            return data.get("content")

    async def detect_tech_stack(
        self,
        owner: str,
        repo: str,
        file_tree: List[Dict[str, Any]],
        languages: Dict[str, float],
    ) -> Dict[str, Any]:
        """Detect technology stack based on repository files and package manifests."""
        frameworks: List[str] = []
        package_managers: List[str] = []
        detected_configs: List[str] = []

        all_files = self._flatten_tree(file_tree)
        file_names = [item["name"] for item in all_files]
        file_paths = [item["path"] for item in all_files]

        package_manager_files = {
            "package.json": "npm/yarn",
            "package-lock.json": "npm",
            "yarn.lock": "yarn",
            "pnpm-lock.yaml": "pnpm",
            "requirements.txt": "pip",
            "Pipfile": "pipenv",
            "poetry.lock": "poetry",
            "pyproject.toml": "poetry/pip",
            "Cargo.toml": "cargo",
            "go.mod": "go modules",
            "Gemfile": "bundler",
            "composer.json": "composer",
            "pom.xml": "maven",
            "build.gradle": "gradle",
        }

        for file_name, manager in package_manager_files.items():
            if file_name in file_names:
                package_managers.append(manager)
                detected_configs.append(file_name)

        framework_indicators = {
            "next.config.js": "Next.js",
            "next.config.mjs": "Next.js",
            "next.config.ts": "Next.js",
            "nuxt.config.js": "Nuxt.js",
            "nuxt.config.ts": "Nuxt.js",
            "angular.json": "Angular",
            "vue.config.js": "Vue.js",
            "vite.config.js": "Vite",
            "vite.config.ts": "Vite",
            "svelte.config.js": "Svelte",
            "gatsby-config.js": "Gatsby",
            "remix.config.js": "Remix",
            "astro.config.mjs": "Astro",
            "tailwind.config.js": "Tailwind CSS",
            "tailwind.config.ts": "Tailwind CSS",
            "postcss.config.js": "PostCSS",
            "webpack.config.js": "Webpack",
            "rollup.config.js": "Rollup",
            "tsconfig.json": "TypeScript",
            "jest.config.js": "Jest",
            "vitest.config.ts": "Vitest",
            ".eslintrc.js": "ESLint",
            ".prettierrc": "Prettier",
            "Dockerfile": "Docker",
            "docker-compose.yml": "Docker Compose",
            "docker-compose.yaml": "Docker Compose",
            ".github": "GitHub Actions",
            "manage.py": "Django",
            "app.py": "Flask",
            "main.py": "FastAPI",
            "Fastfile": "Fastlane",
            "Podfile": "CocoaPods",
        }

        for indicator, framework in framework_indicators.items():
            if indicator in file_names or indicator in file_paths:
                if framework not in frameworks:
                    frameworks.append(framework)
                if indicator not in detected_configs:
                    detected_configs.append(indicator)

        if "package.json" in file_names:
            try:
                content = await self.get_file_content(owner, repo, "package.json")
                if content:
                    package_data = json.loads(content)
                    dependencies = {
                        **package_data.get("dependencies", {}),
                        **package_data.get("devDependencies", {}),
                    }

                    framework_deps = {
                        "react": "React",
                        "vue": "Vue.js",
                        "angular": "Angular",
                        "@angular/core": "Angular",
                        "svelte": "Svelte",
                        "express": "Express.js",
                        "fastify": "Fastify",
                        "koa": "Koa",
                        "nestjs": "NestJS",
                        "@nestjs/core": "NestJS",
                        "electron": "Electron",
                        "react-native": "React Native",
                        "redux": "Redux",
                        "@reduxjs/toolkit": "Redux Toolkit",
                        "mobx": "MobX",
                        "zustand": "Zustand",
                        "mongoose": "MongoDB/Mongoose",
                        "prisma": "Prisma",
                        "@prisma/client": "Prisma",
                        "typeorm": "TypeORM",
                        "sequelize": "Sequelize",
                        "graphql": "GraphQL",
                        "apollo-server": "Apollo GraphQL",
                        "socket.io": "Socket.io",
                        "three": "Three.js",
                        "d3": "D3.js",
                    }

                    for dep_name, framework in framework_deps.items():
                        if dep_name in dependencies and framework not in frameworks:
                            frameworks.append(framework)
            except Exception:
                pass

        return {
            "languages": languages,
            "frameworks": sorted(set(frameworks)),
            "package_managers": sorted(set(package_managers)),
            "detected_configs": sorted(set(detected_configs)),
        }

    def _flatten_tree(self, tree: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        for item in tree:
            result.append({
                "name": item.get("name"),
                "path": item.get("path"),
                "type": item.get("type"),
            })
            if item.get("children"):
                result.extend(self._flatten_tree(item["children"]))
        return result

    async def get_existing_readme(self, owner: str, repo: str) -> Optional[str]:
        """Get existing repository README if present."""
        readme_files = ["README.md", "readme.md", "README.MD", "Readme.md", "README", "readme"]

        for readme_path in readme_files:
            content = await self.get_file_content(owner, repo, readme_path)
            if content:
                return content

        return None

    async def _fetch_paginated(
        self,
        endpoint: str,
        params: Dict[str, Any],
        max_pages: int = 5,
        token: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        async with httpx.AsyncClient() as client:
            for page in range(1, max_pages + 1):
                query = {**params, "page": page, "per_page": 100}
                response = await client.get(
                    f"{self.base_url}{endpoint}",
                    headers=self._build_headers(token),
                    params=query,
                    timeout=40.0,
                )

                if response.status_code in (409, 422):
                    break
                if response.status_code != 200:
                    break

                page_items = response.json()
                if not page_items:
                    break

                items.extend(page_items)
                if len(page_items) < 100:
                    break

        return items

    def _parse_datetime(self, value: str) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None

    async def get_contribution_data(self, owner: str, repo: str, months_back: int = 6) -> Dict[str, Any]:
        """Fetch commit, pull request, and issue activity for contributor analytics."""
        bounded_months = max(1, min(months_back, 24))
        since_date = datetime.now(timezone.utc) - timedelta(days=30 * bounded_months)
        since_iso = since_date.isoformat().replace("+00:00", "Z")

        commit_items = await self._fetch_paginated(
            endpoint=f"/repos/{owner}/{repo}/commits",
            params={"since": since_iso},
            max_pages=6,
        )

        commits: List[Dict[str, str]] = []
        for item in commit_items:
            commit_data = item.get("commit", {}).get("author", {})
            author = (
                item.get("author", {}).get("login")
                if isinstance(item.get("author"), dict)
                else None
            ) or commit_data.get("name") or "Unknown"
            timestamp = commit_data.get("date")
            if timestamp:
                commits.append({"author": author, "timestamp": timestamp})

        pr_items = await self._fetch_paginated(
            endpoint=f"/repos/{owner}/{repo}/pulls",
            params={"state": "all", "sort": "updated", "direction": "desc"},
            max_pages=5,
        )

        pull_requests: List[Dict[str, Any]] = []
        for pr in pr_items:
            created_at = self._parse_datetime(pr.get("created_at", ""))
            if created_at and created_at < since_date:
                continue

            pull_requests.append(
                {
                    "author": (pr.get("user") or {}).get("login") or "Unknown",
                    "created_at": pr.get("created_at"),
                    "state": pr.get("state"),
                    "merged_at": pr.get("merged_at"),
                }
            )

        issue_items = await self._fetch_paginated(
            endpoint=f"/repos/{owner}/{repo}/issues",
            params={"state": "all", "since": since_iso, "sort": "updated", "direction": "desc"},
            max_pages=5,
        )

        issues: List[Dict[str, Any]] = []
        for issue in issue_items:
            if "pull_request" in issue:
                continue

            created_at = self._parse_datetime(issue.get("created_at", ""))
            if created_at and created_at < since_date:
                continue

            issues.append(
                {
                    "author": (issue.get("user") or {}).get("login") or "Unknown",
                    "created_at": issue.get("created_at"),
                    "state": issue.get("state"),
                    "closed_at": issue.get("closed_at"),
                }
            )

        return {
            "months_back": bounded_months,
            "commits": commits,
            "pull_requests": pull_requests,
            "issues": issues,
        }

    def analyze_contribution_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Compute contributor analytics from raw GitHub data."""
        commits = raw_data.get("commits", [])
        pull_requests = raw_data.get("pull_requests", [])
        issues = raw_data.get("issues", [])
        months_back = raw_data.get("months_back", 6)

        author_commit_count: Counter[str] = Counter()
        author_last_commit: Dict[str, datetime] = {}
        weekly_counter: Counter[str] = Counter()
        monthly_counter: Counter[str] = Counter()
        author_months: Dict[str, set] = defaultdict(set)

        for commit in commits:
            author = commit.get("author") or "Unknown"
            stamp = self._parse_datetime(commit.get("timestamp", ""))
            if not stamp:
                continue

            author_commit_count[author] += 1
            author_last_commit[author] = max(author_last_commit.get(author, stamp), stamp)

            iso_year, iso_week, _ = stamp.isocalendar()
            weekly_counter[f"{iso_year}-W{iso_week:02d}"] += 1

            month_key = stamp.strftime("%Y-%m")
            monthly_counter[month_key] += 1
            author_months[author].add(month_key)

        sorted_contributors = sorted(author_commit_count.items(), key=lambda item: item[1], reverse=True)
        commit_distribution = [{"author": author, "commits": count} for author, count in sorted_contributors]

        weekly_activity = [
            {"period": period, "commits": weekly_counter[period]}
            for period in sorted(weekly_counter.keys())
        ]
        monthly_activity = [
            {"period": period, "commits": monthly_counter[period]}
            for period in sorted(monthly_counter.keys())
        ]

        now = datetime.now(timezone.utc)
        active_cutoff = now - timedelta(days=30)
        active_count = 0
        for _, last_commit in author_last_commit.items():
            if last_commit >= active_cutoff:
                active_count += 1

        total_contributors = len(author_commit_count)
        inactive_count = max(total_contributors - active_count, 0)

        pr_opened = len(pull_requests)
        pr_merged = sum(1 for pr in pull_requests if pr.get("merged_at"))
        pr_rejected = sum(
            1
            for pr in pull_requests
            if pr.get("state") == "closed" and not pr.get("merged_at")
        )
        pr_success_ratio = round((pr_merged / pr_opened) * 100, 2) if pr_opened else 0.0

        issues_opened = len(issues)
        issues_closed = sum(1 for issue in issues if issue.get("state") == "closed")

        most_active = sorted_contributors[0][0] if sorted_contributors else None

        core_maintainers: List[str] = []
        total_commits = sum(author_commit_count.values())
        running_share = 0
        if total_commits > 0:
            for author, count in sorted_contributors:
                core_maintainers.append(author)
                running_share += count
                if (running_share / total_commits) >= 0.8:
                    break

        consistency_threshold = max(2, months_back // 2)
        consistent_contributors = [
            author
            for author, month_set in author_months.items()
            if len(month_set) >= consistency_threshold and author_commit_count.get(author, 0) >= 2
        ]

        return {
            "commit_distribution": commit_distribution,
            "weekly_activity": weekly_activity,
            "monthly_activity": monthly_activity,
            "contributor_activity": {
                "active": active_count,
                "inactive": inactive_count,
                "total": total_contributors,
            },
            "pull_request_stats": {
                "opened": pr_opened,
                "merged": pr_merged,
                "rejected": pr_rejected,
                "success_ratio": pr_success_ratio,
            },
            "issue_stats": {
                "opened": issues_opened,
                "closed": issues_closed,
            },
            "top_contributors": {
                "most_active": most_active,
                "core_maintainers": core_maintainers,
                "consistent_contributors": sorted(consistent_contributors),
            },
            "period_months": months_back,
            "commit_total": total_commits,
        }

    async def push_file(
        self,
        owner: str,
        repo: str,
        path: str,
        content: str,
        github_token: str,
        branch: str,
        commit_message: str,
    ) -> Dict[str, Any]:
        """Create or update a file in a GitHub repository using Contents API."""
        cleaned_path = path.strip().lstrip("/")
        if not cleaned_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Target path is required.",
            )

        encoded_content = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        headers = self._build_headers(github_token)
        endpoint = f"{self.base_url}/repos/{owner}/{repo}/contents/{cleaned_path}"

        try:
            async with httpx.AsyncClient() as client:
                existing = await client.get(
                    endpoint,
                    headers=headers,
                    params={"ref": branch},
                    timeout=30.0,
                )

                sha: Optional[str] = None
                if existing.status_code == 200:
                    sha = existing.json().get("sha")
                elif existing.status_code == 403:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="GitHub token does not have permission to write to this repository.",
                    )
                elif existing.status_code not in (404,):
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to inspect target file on GitHub (status {existing.status_code}).",
                    )

                payload: Dict[str, Any] = {
                    "message": commit_message,
                    "content": encoded_content,
                    "branch": branch,
                }
                if sha:
                    payload["sha"] = sha

                response = await client.put(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=45.0,
                )

                if response.status_code in (401, 403):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="GitHub authorization failed. Verify your personal access token scopes.",
                    )

                if response.status_code not in (200, 201):
                    detail = response.json().get("message", "Unknown GitHub API error")
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to push content to GitHub: {detail}",
                    )

                data = response.json()
                commit = data.get("commit", {})

                return {
                    "path": cleaned_path,
                    "branch": branch,
                    "commit_sha": commit.get("sha"),
                    "commit_url": commit.get("html_url") or commit.get("url"),
                }
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to push content to GitHub: {str(exc)}",
            ) from exc


# Singleton instance
github_service = GitHubService()
