import httpx
from datetime import datetime
from typing import Optional, Dict, Any, List

from app.config import settings


class AIService:
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL

    async def check_ollama_status(self) -> bool:
        """Check if Ollama is running and reachable."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/tags", timeout=5.0)
                return response.status_code == 200
        except Exception:
            return False

    async def generate_text(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Generate text using Ollama chat API."""
        messages: List[Dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": 0.4,
                            "top_p": 0.9,
                        },
                    },
                    timeout=180.0,
                )

                if response.status_code != 200:
                    raise Exception(f"Ollama API error: {response.status_code}")

                data = response.json()
                return data.get("message", {}).get("content", "")
        except httpx.TimeoutException as exc:
            raise Exception("AI generation timed out. Please try again.") from exc
        except Exception as exc:
            raise Exception(f"AI generation failed: {str(exc)}") from exc

    def _strip_markdown_wrappers(self, content: str) -> str:
        cleaned = content.strip()
        if cleaned.startswith("```markdown"):
            cleaned = cleaned[11:]
        elif cleaned.startswith("```md"):
            cleaned = cleaned[5:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]

        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]

        return cleaned.strip()

    def _format_tree(self, tree: List[Dict[str, Any]], indent: int = 0, limit: int = 40, count: Optional[List[int]] = None) -> str:
        if count is None:
            count = [0]

        lines: List[str] = []
        for item in tree:
            if count[0] >= limit:
                lines.append("  " * indent + "...")
                break

            if indent > 3:
                continue

            prefix = "  " * indent
            icon = "-" if item.get("type") == "file" else "+"
            lines.append(f"{prefix}{icon} {item.get('name', '')}")
            count[0] += 1

            children = item.get("children") or []
            if children:
                lines.append(self._format_tree(children, indent + 1, limit, count))

        return "\n".join([line for line in lines if line])

    def _top_languages(self, tech_stack: Dict[str, Any]) -> str:
        languages = tech_stack.get("languages", {})
        if not languages:
            return "Not detected"

        ordered = sorted(languages.items(), key=lambda item: item[1], reverse=True)
        return ", ".join([f"{name} ({pct}%)" for name, pct in ordered[:5]])

    def _fallback_readme(
        self,
        repo_name: str,
        repo_description: Optional[str],
        metadata: Dict[str, Any],
        tech_stack: Dict[str, Any],
        file_structure: List[Dict[str, Any]],
    ) -> str:
        framework_line = ", ".join(tech_stack.get("frameworks", [])) or "Not detected"
        package_manager_line = ", ".join(tech_stack.get("package_managers", [])) or "Not detected"
        tree = self._format_tree(file_structure)

        return f"""# {repo_name}

## Project Description
{repo_description or "No description is available for this repository."}

## Installation
1. Clone the repository.
2. Install dependencies using the detected package manager.
3. Configure environment variables if required.
4. Start the application or run the primary script.

## Usage
Document the main entry point and usage commands for local development and production.

## Folder Structure
```text
{tree or "Structure could not be resolved."}
```

## Tech Stack
- Languages: {self._top_languages(tech_stack)}
- Frameworks: {framework_line}
- Package Managers: {package_manager_line}

## Contribution Guidelines
1. Fork the repository.
2. Create a feature branch.
3. Commit and push changes.
4. Open a pull request with a clear description.

## License
{metadata.get("license") or "License is not specified."}
"""

    async def generate_readme(
        self,
        repo_name: str,
        repo_description: Optional[str],
        metadata: Dict[str, Any],
        tech_stack: Dict[str, Any],
        file_structure: List[Dict[str, Any]],
        existing_readme: Optional[str] = None,
        include_sections: Optional[List[str]] = None,
        custom_instructions: Optional[str] = None,
    ) -> str:
        """Generate a technical README with AI and fallback behavior."""

        ai_available = await self.check_ollama_status()
        if not ai_available:
            return self._fallback_readme(repo_name, repo_description, metadata, tech_stack, file_structure)

        section_list = include_sections or [
            "Project Title & Description",
            "Installation",
            "Usage",
            "Folder Structure",
            "Tech Stack",
            "Contribution Guidelines",
            "License",
        ]

        system_prompt = (
            "You are an expert technical writer. Produce developer-focused README markdown. "
            "Use precise setup and usage instructions. Return only valid markdown."
        )

        prompt = f"""Generate a professional README.md for this repository.

Repository: {repo_name}
Description: {repo_description or 'No description provided'}
Stars: {metadata.get('stars', 0)}
Forks: {metadata.get('forks', 0)}
License: {metadata.get('license') or 'Not specified'}
Topics: {', '.join(metadata.get('topics', [])) or 'None'}

Detected languages: {self._top_languages(tech_stack)}
Detected frameworks: {', '.join(tech_stack.get('frameworks', [])) or 'Not detected'}
Package managers: {', '.join(tech_stack.get('package_managers', [])) or 'Not detected'}
Config files: {', '.join(tech_stack.get('detected_configs', [])) or 'None'}

File structure snapshot:
```text
{self._format_tree(file_structure)}
```

Required sections:
{chr(10).join([f'- {section}' for section in section_list])}

{f'Existing README (reference only):{chr(10)}{existing_readme[:2500]}' if existing_readme else ''}

{f'Additional instructions:{chr(10)}{custom_instructions}' if custom_instructions else ''}

Constraints:
- Use technical terminology.
- Be concise but implementation-oriented.
- Add command examples where relevant.
- Do not wrap the entire output in markdown fences.
"""

        try:
            generated = await self.generate_text(prompt, system_prompt)
            cleaned = self._strip_markdown_wrappers(generated)
            if not cleaned:
                return self._fallback_readme(repo_name, repo_description, metadata, tech_stack, file_structure)
            return cleaned
        except Exception:
            return self._fallback_readme(repo_name, repo_description, metadata, tech_stack, file_structure)

    def _fallback_project_summary(
        self,
        repo_name: str,
        repo_description: Optional[str],
        metadata: Dict[str, Any],
        tech_stack: Dict[str, Any],
        file_structure: List[Dict[str, Any]],
        include_visuals: bool,
    ) -> str:
        frameworks = ", ".join(tech_stack.get("frameworks", [])) or "Not detected"
        pkg_managers = ", ".join(tech_stack.get("package_managers", [])) or "Not detected"
        configs = ", ".join(tech_stack.get("detected_configs", [])[:8]) or "Not detected"
        topics = ", ".join(metadata.get("topics", [])) or "None"
        tree = self._format_tree(file_structure)

        architecture_block = ""
        if include_visuals:
            architecture_block = """
## 4. Technical Architecture
```mermaid
graph TD
  A[Source Repository] --> B[Static Analysis]
  B --> C[Tech Stack Detection]
  B --> D[File Structure Parsing]
  C --> E[Documentation Generation]
  D --> E
  E --> F[Project Summary]
  E --> G[README]
  E --> H[Contributor Insights]
```
"""
        else:
            architecture_block = """
## 4. Technical Architecture
The repository follows a modular structure with clear separation between source code, configuration, and dependency management. Components interact through well-defined interfaces inferred from the detected frameworks and package managers.
"""

        return f"""# Project Summary: {repo_name}

## 1. Executive Summary
{repo_description or 'No description provided.'} This document provides a comprehensive technical overview of the repository including architecture, technology stack, key features, and development guidance.

## 2. Problem Statement & Objectives
- **Problem:** {repo_description or 'Addresses a software delivery or product need represented by its source code.'}
- **Target users:** Developers, contributors, and maintainers of this repository.
- **Primary goals:** Deliver maintainable, well-documented software with clear contribution workflows.

## 3. Key Features & Capabilities
- Core repository workflows inferred from source structure and build scripts.
- Reusable components and module-level organization.
- Collaboration support through issue and pull-request based iteration.
- Dependency management via {pkg_managers}.
- Framework-level abstractions provided by {frameworks}.
- Configuration-driven setup using detected config files.

{architecture_block}
## 5. Technology Stack

| Category | Details |
|---|---|
| Languages | {self._top_languages(tech_stack)} |
| Frameworks | {frameworks} |
| Package Managers | {pkg_managers} |
| Config Files | {configs} |
| Topics | {topics} |

## 6. Project Structure
```text
{tree or 'Structure could not be resolved.'}
```

## 7. Getting Started
1. Clone the repository: `git clone https://github.com/{repo_name}.git`
2. Install dependencies using the detected package manager: `{pkg_managers.split(',')[0].strip() if pkg_managers != 'Not detected' else 'see project docs'} install`
3. Configure environment variables as required by the project.
4. Start the application or run the primary entry point.

## 8. Development Guide
- Fork the repository and create a feature branch from `{metadata.get('default_branch', 'main')}`.
- Follow existing code style and conventions.
- Write or update tests for any changed functionality.
- Open a pull request with a clear description of changes.

## 9. Deployment & Environment
- Default branch: `{metadata.get('default_branch', 'main')}`
- Repository size: {metadata.get('size', 0)} KB
- Review detected config files for CI/CD and environment setup: {configs}

## 10. Repository Health & Metrics
| Metric | Value |
|---|---|
| Stars | {metadata.get('stars', 0)} |
| Forks | {metadata.get('forks', 0)} |
| Open Issues | {metadata.get('open_issues', 0)} |
| License | {metadata.get('license') or 'Not specified'} |
| Size | {metadata.get('size', 0)} KB |

## 11. Risks & Recommendations
- **Documentation gap:** Ensure README and inline docs are kept up to date as the codebase evolves.
- **Dependency management:** Regularly audit and update dependencies to address security vulnerabilities.
- **Test coverage:** Verify adequate test coverage exists for critical modules.
- **License clarity:** {f'License is specified as {metadata.get("license")} — ensure all dependencies are compatible.' if metadata.get('license') else 'No license detected — add a LICENSE file to clarify usage rights.'}
- **Issue backlog:** {metadata.get('open_issues', 0)} open issues — triage and prioritize to maintain project health.
"""

    async def generate_project_documentation(
        self,
        repo_name: str,
        repo_description: Optional[str],
        metadata: Dict[str, Any],
        tech_stack: Dict[str, Any],
        file_structure: List[Dict[str, Any]],
        include_visuals: bool = False,
        custom_instructions: Optional[str] = None,
    ) -> str:
        """Generate a project overview report in markdown."""

        ai_available = await self.check_ollama_status()
        if not ai_available:
            return self._fallback_project_summary(
                repo_name,
                repo_description,
                metadata,
                tech_stack,
                file_structure,
                include_visuals,
            )

        system_prompt = (
            "You are a senior software architect and technical documentation specialist. "
            "Generate structured markdown reports for software repositories."
        )

        prompt = f"""Generate a detailed, professional Project Summary document in markdown for the following repository.

Repository: {repo_name}
Description: {repo_description or 'No description provided'}
Stars: {metadata.get('stars', 0)} | Forks: {metadata.get('forks', 0)} | Open Issues: {metadata.get('open_issues', 0)}
Default branch: {metadata.get('default_branch', 'main')} | Size: {metadata.get('size', 0)} KB
License: {metadata.get('license') or 'Not specified'}
Topics: {', '.join(metadata.get('topics', [])) or 'None'}
Homepage: {metadata.get('homepage') or 'None'}
Created: {metadata.get('created_at', 'Unknown')} | Last updated: {metadata.get('updated_at', 'Unknown')}

Languages: {self._top_languages(tech_stack)}
Frameworks: {', '.join(tech_stack.get('frameworks', [])) or 'Not detected'}
Package managers: {', '.join(tech_stack.get('package_managers', [])) or 'Not detected'}
Config files detected: {', '.join(tech_stack.get('detected_configs', [])) or 'None'}

File structure snapshot:
```text
{self._format_tree(file_structure)}
```

Generate ALL of the following sections with substantial, detailed content — do not skip any:

## 1. Executive Summary
A 3-5 sentence high-level overview of what this project does, who it is for, and why it exists.

## 2. Problem Statement & Objectives
- What problem does this project solve?
- Who are the target users or stakeholders?
- What are the primary goals and success criteria?

## 3. Key Features & Capabilities
List and describe at least 6-8 core features inferred from the codebase structure, tech stack, and description. For each feature include a brief explanation of its value.

## 4. Technical Architecture
{'Include a Mermaid diagram showing the high-level system architecture, then follow with a textual explanation of each component and how they interact.' if include_visuals else 'Provide a detailed textual description of the system architecture — layers, components, data flow, and how modules interact.'}

## 5. Technology Stack
Organize into subsections: Languages, Frameworks & Libraries, Build Tools & Package Managers, Configuration & DevOps. For each technology explain why it is used and what role it plays.

## 6. Project Structure
Explain the folder/module organization. Describe the purpose of each top-level directory and key files.

## 7. Getting Started
Provide step-by-step setup instructions: prerequisites, installation, environment configuration, and running the project locally.

## 8. Development Guide
Cover: branching strategy, coding conventions, how to run tests, linting, and how to submit contributions.

## 9. Deployment & Environment
Describe deployment considerations, environment variables, build commands, and any CI/CD patterns visible from the config files.

## 10. Repository Health & Metrics
Summarize: stars, forks, open issues, codebase size, license, and what these metrics indicate about project maturity and community adoption.

## 11. Risks & Recommendations
Identify at least 3-5 potential technical risks, gaps, or improvement areas based on the codebase analysis. Provide actionable recommendations for each.

{f'Additional instructions:{chr(10)}{custom_instructions}' if custom_instructions else ''}

Constraints:
- Be detailed and specific — avoid generic filler text.
- Use the actual repository data provided above.
- Each section should have meaningful, substantive content.
- Use tables, bullet lists, and code blocks where appropriate.
- Return only markdown, no preamble.
"""

        try:
            generated = await self.generate_text(prompt, system_prompt)
            cleaned = self._strip_markdown_wrappers(generated)
            if not cleaned:
                return self._fallback_project_summary(
                    repo_name,
                    repo_description,
                    metadata,
                    tech_stack,
                    file_structure,
                    include_visuals,
                )
            return cleaned
        except Exception:
            return self._fallback_project_summary(
                repo_name,
                repo_description,
                metadata,
                tech_stack,
                file_structure,
                include_visuals,
            )

    def _mit_license(self, owner: str) -> str:
        year = datetime.utcnow().year
        return f"""MIT License

Copyright (c) {year} {owner}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the \"Software\"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

    def _apache_license_stub(self, owner: str) -> str:
        return (
            "Apache License 2.0\n\n"
            f"Copyright (c) {datetime.utcnow().year} {owner}\n\n"
            "Use the official Apache 2.0 text from https://www.apache.org/licenses/LICENSE-2.0.\n"
            "This generated file is a placeholder and should be replaced with the full license text.\n"
        )

    def _gpl_license_stub(self, owner: str) -> str:
        return (
            "GNU GENERAL PUBLIC LICENSE Version 3\n\n"
            f"Copyright (c) {datetime.utcnow().year} {owner}\n\n"
            "Use the official GPLv3 text from https://www.gnu.org/licenses/gpl-3.0.txt.\n"
            "This generated file is a placeholder and should be replaced with the full license text.\n"
        )

    async def generate_license_document(
        self,
        repo_name: str,
        owner_name: str,
        detected_license: Optional[str] = None,
        custom_instructions: Optional[str] = None,
    ) -> str:
        """Generate a repository license file content."""

        normalized = (detected_license or "").lower()

        if "mit" in normalized:
            base_license = self._mit_license(owner_name)
        elif "apache" in normalized:
            base_license = self._apache_license_stub(owner_name)
        elif "gpl" in normalized:
            base_license = self._gpl_license_stub(owner_name)
        else:
            base_license = self._mit_license(owner_name)

        if not custom_instructions:
            return base_license

        ai_available = await self.check_ollama_status()
        if not ai_available:
            return base_license

        system_prompt = "You are a legal-aware technical writer. Refine license text formatting without changing legal intent."
        prompt = f"""Repository: {repo_name}
Owner: {owner_name}
Detected license: {detected_license or 'Unknown'}

Current license draft:
{base_license}

Additional instructions:
{custom_instructions}

Return final license markdown/plain text only.
"""

        try:
            generated = await self.generate_text(prompt, system_prompt)
            cleaned = self._strip_markdown_wrappers(generated)
            return cleaned or base_license
        except Exception:
            return base_license

    def _fallback_activity_report(self, repo_name: str, analytics: Dict[str, Any]) -> str:
        pr = analytics.get("pull_request_stats", {})
        activity = analytics.get("contributor_activity", {})
        top = analytics.get("top_contributors", {})

        return f"""# Contributor Activity Report: {repo_name}

## Contribution Health
- Total contributors: {activity.get('total', 0)}
- Active contributors (last 30 days): {activity.get('active', 0)}
- Inactive contributors: {activity.get('inactive', 0)}

## Pull Request Effectiveness
- Opened: {pr.get('opened', 0)}
- Merged: {pr.get('merged', 0)}
- Rejected: {pr.get('rejected', 0)}
- Success ratio: {pr.get('success_ratio', 0)}%

## Key Contributors
- Most active contributor: {top.get('most_active') or 'Not available'}
- Core maintainers: {', '.join(top.get('core_maintainers', [])) or 'Not available'}
- Consistent contributors: {', '.join(top.get('consistent_contributors', [])) or 'Not available'}

## Collaboration Trends
Repository activity indicates current contributor participation and pull-request throughput. Use weekly and monthly trend charts for sprint and release planning.
"""

    async def generate_activity_report(
        self,
        repo_name: str,
        analytics: Dict[str, Any],
        custom_instructions: Optional[str] = None,
    ) -> str:
        """Generate natural language contributor activity summary."""

        ai_available = await self.check_ollama_status()
        if not ai_available:
            return self._fallback_activity_report(repo_name, analytics)

        system_prompt = (
            "You are an engineering analytics consultant. "
            "Summarize contribution health, development consistency, and collaboration trends in concise markdown."
        )

        prompt = f"""Create an activity report for repository {repo_name}.

Analytics payload:
{analytics}

Required sections:
1. Contribution health
2. Development consistency
3. Collaboration trends
4. Risks and actionable recommendations

Constraints:
- Use factual statements based on data.
- Keep concise and practical.
- Return markdown only.

{f'Additional instructions:{chr(10)}{custom_instructions}' if custom_instructions else ''}
"""

        try:
            generated = await self.generate_text(prompt, system_prompt)
            cleaned = self._strip_markdown_wrappers(generated)
            return cleaned or self._fallback_activity_report(repo_name, analytics)
        except Exception:
            return self._fallback_activity_report(repo_name, analytics)

    async def improve_readme_section(
        self,
        section_name: str,
        current_content: str,
        repo_context: Dict[str, Any],
    ) -> str:
        """Improve a specific section of a README."""

        system_prompt = "You are an expert technical writer. Improve the given README section while preserving intent."
        prompt = f"""Improve this README section.

Section: {section_name}
Current content:
{current_content}

Repository context:
- Name: {repo_context.get('repo_name')}
- Languages: {repo_context.get('languages')}
- Frameworks: {repo_context.get('frameworks')}

Return only the improved section markdown.
"""

        return await self.generate_text(prompt, system_prompt)


# Singleton instance
ai_service = AIService()
