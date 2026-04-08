const API_BASE = "http://localhost:8000";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  getToken(): string | null {
    if (this.token) {
      return this.token;
    }

    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token");
    }

    return this.token;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {} } = options;

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "An error occurred" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  private async requestBlob(endpoint: string): Promise<Blob> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, { headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Download failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.blob();
  }

  // Auth endpoints
  async register(email: string, username: string, password: string) {
    return this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: { email, username, password },
    });
  }

  async login(email: string, password: string) {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
  }

  async getCurrentUser() {
    return this.request<User>("/auth/me");
  }

  // Repo endpoints
  async analyzeRepo(repoUrl: string) {
    return this.request<RepoSession>("/repo/analyze", {
      method: "POST",
      body: { repo_url: repoUrl },
    });
  }

  async getRepoSessions(limit = 20, offset = 0) {
    return this.request<RepoSession[]>(`/repo/sessions?limit=${limit}&offset=${offset}`);
  }

  async getRepoSession(sessionId: number) {
    return this.request<RepoSession>(`/repo/sessions/${sessionId}`);
  }

  async deleteRepoSession(sessionId: number) {
    return this.request<{ message: string }>(`/repo/sessions/${sessionId}`, {
      method: "DELETE",
    });
  }

  async getSessionHistory(sessionId: number) {
    return this.request<RepositoryHistory>(`/repo/sessions/${sessionId}/history`);
  }

  async pushContent(request: PushContentRequest) {
    return this.request<PushContentResponse>("/repo/push-content", {
      method: "POST",
      body: request,
    });
  }

  // README endpoints
  async generateReadme(
    repoSessionId: number,
    customInstructions?: string,
    includeSections?: string[]
  ) {
    return this.request<ReadmeContent>("/readme/generate", {
      method: "POST",
      body: {
        repo_session_id: repoSessionId,
        custom_instructions: customInstructions,
        include_sections: includeSections,
      },
    });
  }

  async getReadmeVersions(repoSessionId: number) {
    return this.request<{ versions: ReadmeContent[]; total: number }>(
      `/readme/versions/${repoSessionId}`
    );
  }

  async getReadme(readmeId: number) {
    return this.request<ReadmeContent>(`/readme/${readmeId}`);
  }

  async updateReadme(readmeId: number, content: string) {
    return this.request<ReadmeContent>(`/readme/${readmeId}`, {
      method: "PUT",
      body: { content },
    });
  }

  async downloadReadme(readmeId: number) {
    return this.requestBlob(`/readme/${readmeId}/download`);
  }

  // Documentation endpoints
  async generateDocumentation(request: DocumentationGenerateRequest) {
    return this.request<DocumentationContent>("/documentation/generate", {
      method: "POST",
      body: request,
    });
  }

  async getDocumentationVersions(repoSessionId: number, documentType: DocumentationType) {
    return this.request<{ versions: DocumentationContent[]; total: number }>(
      `/documentation/versions/${repoSessionId}?document_type=${documentType}`
    );
  }

  async getDocumentation(documentId: number) {
    return this.request<DocumentationContent>(`/documentation/${documentId}`);
  }

  async updateDocumentation(documentId: number, content: string) {
    return this.request<DocumentationContent>(`/documentation/${documentId}`, {
      method: "PUT",
      body: { content },
    });
  }

  async downloadDocumentation(documentId: number) {
    return this.requestBlob(`/documentation/${documentId}/download`);
  }

  // Contributor insights endpoints
  async generateInsights(request: InsightsGenerateRequest) {
    return this.request<ContributorInsightsReport>("/insights/generate", {
      method: "POST",
      body: request,
    });
  }

  async getInsightsVersions(repoSessionId: number) {
    return this.request<{ versions: ContributorInsightsReport[]; total: number }>(
      `/insights/versions/${repoSessionId}`
    );
  }

  async getInsights(reportId: number) {
    return this.request<ContributorInsightsReport>(`/insights/${reportId}`);
  }

  async updateInsights(reportId: number, content: string) {
    return this.request<ContributorInsightsReport>(`/insights/${reportId}`, {
      method: "PUT",
      body: { content },
    });
  }

  async downloadInsights(reportId: number) {
    return this.requestBlob(`/insights/${reportId}/download`);
  }

  // Service checks
  async checkOllama() {
    return this.request<{ available: boolean; model: string; base_url: string }>(
      "/readme/check/ollama"
    );
  }

  async healthCheck() {
    return this.request<{ status: string; database: string; ollama: string }>("/health");
  }

  // Password reset
  async forgotPassword(email: string) {
    return this.request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: { email },
    });
  }

  async verifyResetCode(email: string, code: string) {
    return this.request<{ message: string }>("/auth/verify-reset-code", {
      method: "POST",
      body: { email, code },
    });
  }

  async resetPassword(email: string, code: string, new_password: string) {
    return this.request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: { email, code, new_password },
    });
  }
}

export const api = new ApiClient();

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

export interface TechStack {
  languages: Record<string, number>;
  frameworks: string[];
  package_managers: string[];
  detected_configs: string[];
}

export interface RepoMetadata {
  full_name: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  default_branch: string;
  created_at: string;
  updated_at: string;
  license: string | null;
  topics: string[];
  size: number;
  homepage: string | null;
}

export interface RepoSession {
  id: number;
  repo_url: string;
  repo_owner: string;
  repo_name: string;
  repo_description: string | null;
  metadata: RepoMetadata;
  file_structure: FileNode[];
  tech_stack: TechStack;
  created_at: string;
  updated_at?: string;
}

export interface GeneratedContent {
  id: number;
  repo_session_id: number;
  content_type: string;
  version: number;
  title: string | null;
  content: string;
  generation_params?: Record<string, any> | null;
  created_at: string;
}

export type ReadmeContent = GeneratedContent & { content_type: "readme" | string };

export type DocumentationType = "project_summary" | "license";

export interface DocumentationGenerateRequest {
  repo_session_id: number;
  document_type: DocumentationType;
  include_visuals?: boolean;
  custom_instructions?: string;
}

export type DocumentationContent = GeneratedContent & {
  content_type: DocumentationType | string;
};

export interface ContributorDistribution {
  author: string;
  commits: number;
}

export interface ActivityPoint {
  period: string;
  commits: number;
}

export interface ContributorActivity {
  active: number;
  inactive: number;
  total: number;
}

export interface PullRequestStats {
  opened: number;
  merged: number;
  rejected: number;
  success_ratio: number;
}

export interface IssueStats {
  opened: number;
  closed: number;
}

export interface TopContributors {
  most_active: string | null;
  core_maintainers: string[];
  consistent_contributors: string[];
}

export interface ContributorInsightsAnalytics {
  commit_distribution: ContributorDistribution[];
  weekly_activity: ActivityPoint[];
  monthly_activity: ActivityPoint[];
  contributor_activity: ContributorActivity;
  pull_request_stats: PullRequestStats;
  issue_stats: IssueStats;
  top_contributors: TopContributors;
  period_months: number;
  commit_total: number;
}

export interface ContributorInsightsReport extends GeneratedContent {
  content_type: "contributor_report" | string;
  analytics: ContributorInsightsAnalytics;
}

export interface InsightsGenerateRequest {
  repo_session_id: number;
  months_back?: number;
  custom_instructions?: string;
}

export interface RepositoryHistory {
  repo_session_id: number;
  repo_url: string;
  readme_versions: GeneratedContent[];
  documentation_versions: GeneratedContent[];
  contributor_reports: GeneratedContent[];
  total_items: number;
  last_updated: string | null;
}

export interface PushContentRequest {
  content_id: number;
  github_token: string;
  target_path?: string;
  branch?: string;
  commit_message?: string;
}

export interface PushContentResponse {
  path: string;
  branch: string;
  commit_sha?: string | null;
  commit_url?: string | null;
}
