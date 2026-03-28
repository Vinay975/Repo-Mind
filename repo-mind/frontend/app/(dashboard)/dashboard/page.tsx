"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  Download,
  Eye,
  FileCode,
  Folder,
  Github,
  GitFork,
  Loader2,
  Pencil,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  api,
  type ContributorInsightsReport,
  type DocumentationContent,
  type DocumentationType,
  type FileNode,
  type GeneratedContent,
  type ReadmeContent,
  type RepoSession,
} from "@/lib/api";
import { useRepoStore } from "@/lib/store";
import { formatNumber, formatRelativeTime, isValidGitHubUrl } from "@/lib/utils";

type DashboardModule = "readme" | "documentation" | "insights";
type UnifiedContent = ReadmeContent | DocumentationContent | ContributorInsightsReport;

const COLORS = ["#10b981", "#06b6d4", "#0ea5e9", "#14b8a6", "#84cc16"];

function toPath(type: string): string {
  if (type === "readme") return "README.md";
  if (type === "project_summary") return "docs/PROJECT_SUMMARY.md";
  if (type === "license") return "LICENSE";
  if (type === "contributor_report") return "docs/CONTRIBUTOR_REPORT.md";
  return `docs/${type}.md`;
}

function toLabel(type: string): string {
  if (type === "readme") return "README";
  if (type === "project_summary") return "Project Summary";
  if (type === "license") return "License";
  if (type === "contributor_report") return "Contributor Report";
  return type;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[>#*_~-]/g, "")
    .trim();
}

export default function DashboardPage() {
  const { toast } = useToast();
  const {
    currentSession,
    sessions,
    hasHydrated,
    isAnalyzing,
    analyzeRepo,
    fetchSessions,
    setCurrentSession,
    deleteSession,
  } = useRepoStore();

  const [repoUrl, setRepoUrl] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState<boolean | null>(null);

  const [module, setModule] = useState<DashboardModule>("readme");
  const [docType, setDocType] = useState<DocumentationType>("project_summary");
  const [instructions, setInstructions] = useState("");
  const [monthsBack, setMonthsBack] = useState(6);
  const [includeVisuals, setIncludeVisuals] = useState(false);

  const [readmes, setReadmes] = useState<ReadmeContent[]>([]);
  const [docs, setDocs] = useState<Record<DocumentationType, DocumentationContent[]>>({
    project_summary: [],
    license: [],
  });
  const [insights, setInsights] = useState<ContributorInsightsReport[]>([]);
  const [history, setHistory] = useState<{
    readme: GeneratedContent[];
    docs: GeneratedContent[];
    insights: GeneratedContent[];
    lastUpdated: string | null;
  }>({ readme: [], docs: [], insights: [], lastUpdated: null });

  const [active, setActive] = useState<UnifiedContent | null>(null);
  const [content, setContent] = useState("");
  const [tab, setTab] = useState<"preview" | "edit">("preview");

  const [githubToken, setGithubToken] = useState("");
  const [path, setPath] = useState("");
  const [branch, setBranch] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pushing, setPushing] = useState(false);

  const moduleVersions = useMemo<UnifiedContent[]>(() => {
    if (module === "readme") return readmes;
    if (module === "documentation") return docs[docType];
    return insights;
  }, [module, readmes, docs, docType, insights]);

  const analytics = useMemo(() => {
    if (active && active.content_type === "contributor_report" && "analytics" in active) {
      return active.analytics;
    }
    return insights[0]?.analytics || null;
  }, [active, insights]);

  const refresh = useCallback(async (sessionId: number) => {
    setLoading(true);
    try {
      const [r, d1, d2, i, h] = await Promise.all([
        api.getReadmeVersions(sessionId).catch(() => ({ versions: [], total: 0 })),
        api.getDocumentationVersions(sessionId, "project_summary").catch(() => ({ versions: [], total: 0 })),
        api.getDocumentationVersions(sessionId, "license").catch(() => ({ versions: [], total: 0 })),
        api.getInsightsVersions(sessionId).catch(() => ({ versions: [], total: 0 })),
        api.getSessionHistory(sessionId).catch(() => null),
      ]);

      setReadmes(r.versions);
      setDocs({ project_summary: d1.versions, license: d2.versions });
      setInsights(i.versions);

      if (h) {
        setHistory({
          readme: h.readme_versions,
          docs: h.documentation_versions,
          insights: h.contributor_reports,
          lastUpdated: h.last_updated,
        });
      } else {
        setHistory({ readme: [], docs: [], insights: [], lastUpdated: null });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const checkOllama = useCallback(async () => {
    try {
      const status = await api.checkOllama();
      setOllamaStatus(status.available);
    } catch {
      setOllamaStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    void fetchSessions();
    void checkOllama();
  }, [hasHydrated, fetchSessions, checkOllama]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentSession && sessions.length > 0) setCurrentSession(sessions[0]);
  }, [hasHydrated, currentSession, sessions, setCurrentSession]);

  useEffect(() => {
    if (!hasHydrated || !currentSession) return;
    void refresh(currentSession.id);
  }, [hasHydrated, currentSession, refresh]);

  useEffect(() => {
    setActive((prev) => {
      if (prev) {
        const found = moduleVersions.find((v) => v.id === prev.id);
        if (found) return found;
      }
      return moduleVersions[0] || null;
    });
  }, [moduleVersions]);

  useEffect(() => {
    setContent(active?.content || "");
    if (!active) return;
    const nextPath = toPath(active.content_type);
    setPath(nextPath);
    setMessage(`chore: update ${nextPath} via RepoMind`);
    setBranch(currentSession?.metadata.default_branch || "main");
  }, [active, currentSession]);

  const onAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidGitHubUrl(repoUrl)) {
      toast({ title: "Invalid URL", description: "Use https://github.com/owner/repository", variant: "destructive" });
      return;
    }

    try {
      const session = await analyzeRepo(repoUrl.trim());
      setRepoUrl("");
      setModule("readme");
      await refresh(session.id);
      toast({ title: "Repository analyzed", description: "Session is ready across all modules.", variant: "success" });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unable to analyze repository",
        variant: "destructive",
      });
    }
  };

  const onGenerate = async () => {
    if (!currentSession) return;
    setGenerating(true);
    try {
      if (module === "readme") {
        await api.generateReadme(currentSession.id, instructions || undefined);
      } else if (module === "documentation") {
        await api.generateDocumentation({
          repo_session_id: currentSession.id,
          document_type: docType,
          include_visuals: includeVisuals,
          custom_instructions: instructions || undefined,
        });
      } else {
        await api.generateInsights({
          repo_session_id: currentSession.id,
          months_back: monthsBack,
          custom_instructions: instructions || undefined,
        });
      }
      await refresh(currentSession.id);
      setInstructions("");
      toast({ title: "Generated", description: "New version added.", variant: "success" });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Unable to generate content",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const onSave = async () => {
    if (!currentSession || !active || content === active.content) return;
    setSaving(true);
    try {
      if (module === "readme") {
        await api.updateReadme(active.id, content);
      } else if (module === "documentation") {
        await api.updateDocumentation(active.id, content);
      } else {
        await api.updateInsights(active.id, content);
      }
      await refresh(currentSession.id);
      toast({ title: "Saved", description: "Edits stored as a new version.", variant: "success" });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onDownload = async () => {
    if (!active) return;
    setDownloading(true);
    try {
      let blob: Blob;
      let filename = "DOCUMENT.md";
      if (module === "readme") {
        blob = await api.downloadReadme(active.id);
        filename = "README.md";
      } else if (module === "documentation") {
        blob = await api.downloadDocumentation(active.id);
        filename = active.content_type === "license" ? "LICENSE" : "PROJECT_SUMMARY.md";
      } else {
        blob = await api.downloadInsights(active.id);
        filename = "CONTRIBUTOR_REPORT.md";
      }
      downloadBlob(blob, filename);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to download",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const onExportPdf = () => {
    if (!active) return;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const lines = pdf.splitTextToSize(markdownToText(content || active.content), 520);
    let y = 40;
    lines.forEach((line: string) => {
      if (y > 790) {
        pdf.addPage();
        y = 40;
      }
      pdf.text(line, 40, y);
      y += 14;
    });
    const name = module === "readme" ? "README" : module === "insights" ? "CONTRIBUTOR_REPORT" : docType === "license" ? "LICENSE" : "PROJECT_SUMMARY";
    pdf.save(`${name}.pdf`);
  };

  const onPush = async () => {
    if (!active || !githubToken.trim()) {
      toast({ title: "GitHub token required", description: "Provide token with write access.", variant: "destructive" });
      return;
    }
    setPushing(true);
    try {
      await api.pushContent({
        content_id: active.id,
        github_token: githubToken.trim(),
        target_path: path || undefined,
        branch: branch || undefined,
        commit_message: message || undefined,
      });
      toast({ title: "Pushed", description: "Content pushed to GitHub.", variant: "success" });
    } catch (error) {
      toast({
        title: "Push failed",
        description: error instanceof Error ? error.message : "Unable to push",
        variant: "destructive",
      });
    } finally {
      setPushing(false);
    }
  };

  const onSelectHistory = async (item: GeneratedContent) => {
    try {
      if (item.content_type === "readme") {
        setModule("readme");
        setActive(await api.getReadme(item.id));
      } else if (item.content_type === "project_summary" || item.content_type === "license") {
        setModule("documentation");
        setDocType(item.content_type);
        setActive(await api.getDocumentation(item.id));
      } else if (item.content_type === "contributor_report") {
        setModule("insights");
        setActive(await api.getInsights(item.id));
      }
    } catch (error) {
      toast({
        title: "Load failed",
        description: error instanceof Error ? error.message : "Unable to load version",
        variant: "destructive",
      });
    }
  };

  const onSelectSession = async (session: RepoSession) => {
    setCurrentSession(session);
    await refresh(session.id);
  };

  const onDeleteSession = async (sessionId: number, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await deleteSession(sessionId);
      toast({ title: "Session deleted", description: "Repository session removed." });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RepoMind Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Unified repository intelligence workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Unified Entry Flow
          </CardTitle>
          <CardDescription>Landing ? Repo URL input ? Repository validation ? Shared session for all modules.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3 md:flex-row" onSubmit={onAnalyze}>
            <Input
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              icon={<Github className="h-4 w-4" />}
              disabled={isAnalyzing}
            />
            <Button type="submit" variant="gradient" disabled={isAnalyzing || !repoUrl.trim()}>
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze Repository"}
            </Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded bg-muted px-2 py-1">Session: {currentSession ? `${currentSession.repo_owner}/${currentSession.repo_name}` : "None"}</span>
            <span className="rounded bg-muted px-2 py-1">AI: {ollamaStatus === null ? "Checking" : ollamaStatus ? "Connected" : "Offline"}</span>
          </div>
          {ollamaStatus === false && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-2 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
              Fallback generation is active while Ollama is offline.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Repository Overview Panel</CardTitle>
            </CardHeader>
            <CardContent>
              {!currentSession ? (
                <p className="text-sm text-muted-foreground">Analyze a repository to view overview data.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-semibold">{currentSession.repo_owner}/{currentSession.repo_name}</p>
                    <p className="text-sm text-muted-foreground">{currentSession.repo_description || "No description"}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <MiniStat label="Stars" value={formatNumber(currentSession.metadata.stars)} icon={<Star className="h-4 w-4" />} />
                    <MiniStat label="Forks" value={formatNumber(currentSession.metadata.forks)} icon={<GitFork className="h-4 w-4" />} />
                    <MiniStat label="Issues" value={formatNumber(currentSession.metadata.open_issues)} icon={<AlertCircle className="h-4 w-4" />} />
                    <MiniStat label="Branch" value={currentSession.metadata.default_branch} icon={<Search className="h-4 w-4" />} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Module Selector</CardTitle>
              <CardDescription>README Generator, Project Documentation, and Contributor Insights.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={module} onValueChange={(value) => setModule(value as DashboardModule)}>
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="readme">README</TabsTrigger>
                  <TabsTrigger value="documentation">Documentation</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="readme">
                  <textarea
                    className="h-20 w-full resize-none rounded-lg border bg-background p-2 text-sm"
                    placeholder="Optional README instructions"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                  />
                </TabsContent>

                <TabsContent value="documentation" className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="rounded border bg-background px-2 py-1 text-sm"
                      value={docType}
                      onChange={(event) => setDocType(event.target.value as DocumentationType)}
                    >
                      <option value="project_summary">Project Summary</option>
                      <option value="license">License</option>
                    </select>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={includeVisuals} onChange={(event) => setIncludeVisuals(event.target.checked)} />
                      Include visuals
                    </label>
                  </div>
                  <textarea
                    className="h-20 w-full resize-none rounded-lg border bg-background p-2 text-sm"
                    placeholder="Optional documentation instructions"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                  />
                </TabsContent>

                <TabsContent value="insights" className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span>Months:</span>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={monthsBack}
                      onChange={(event) => setMonthsBack(Number(event.target.value) || 6)}
                      className="w-20 rounded border bg-background px-2 py-1"
                    />
                  </div>
                  <textarea
                    className="h-20 w-full resize-none rounded-lg border bg-background p-2 text-sm"
                    placeholder="Optional insights instructions"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                  />
                </TabsContent>
              </Tabs>

              <Button variant="gradient" onClick={onGenerate} disabled={!currentSession || generating}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate / Regenerate
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Generated Content Preview</CardTitle>
              <CardDescription>Edit, preview, download markdown/PDF, and push to GitHub.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading module content...
                </div>
              ) : !active ? (
                <p className="text-sm text-muted-foreground">No content generated yet for this module.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium">{active.title || toLabel(active.content_type)} v{active.version}</p>
                      <p className="text-muted-foreground">{formatRelativeTime(active.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={onDownload} disabled={downloading}>
                        <Download className="mr-2 h-4 w-4" />Markdown
                      </Button>
                      <Button size="sm" variant="outline" onClick={onExportPdf}>PDF</Button>
                      <Button size="sm" variant="outline" onClick={onSave} disabled={saving || content === active.content}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save
                      </Button>
                    </div>
                  </div>

                  <Tabs value={tab} onValueChange={(value) => setTab(value as "preview" | "edit")}>
                    <TabsList>
                      <TabsTrigger value="preview"><Eye className="mr-2 h-4 w-4" />Preview</TabsTrigger>
                      <TabsTrigger value="edit"><Pencil className="mr-2 h-4 w-4" />Edit</TabsTrigger>
                    </TabsList>
                    <TabsContent value="preview">
                      <ScrollArea className="h-[320px] rounded border p-3">
                        <div className="markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content || active.content}</ReactMarkdown></div>
                      </ScrollArea>
                    </TabsContent>
                    <TabsContent value="edit">
                      <textarea className="h-[320px] w-full resize-none rounded border bg-background p-3 font-mono text-sm" value={content} onChange={(event) => setContent(event.target.value)} />
                    </TabsContent>
                  </Tabs>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Push Directly to GitHub</p>
                    <Input type="password" placeholder="GitHub token" value={githubToken} onChange={(event) => setGithubToken(event.target.value)} />
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input placeholder="Target path" value={path} onChange={(event) => setPath(event.target.value)} />
                      <Input placeholder="Branch" value={branch} onChange={(event) => setBranch(event.target.value)} />
                    </div>
                    <Input placeholder="Commit message" value={message} onChange={(event) => setMessage(event.target.value)} />
                    <Button onClick={onPush} disabled={pushing}>{pushing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Push to GitHub</Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contribution Insights</CardTitle>
              <CardDescription>Contributor distribution, activity trends, and PR health.</CardDescription>
            </CardHeader>
            <CardContent>
              {!analytics ? (
                <p className="text-sm text-muted-foreground">Generate an insights report to visualize contributor analytics.</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <MiniStat label="Contributors" value={analytics.contributor_activity.total.toString()} icon={<Users className="h-4 w-4" />} />
                    <MiniStat label="Active" value={analytics.contributor_activity.active.toString()} icon={<ArrowRight className="h-4 w-4" />} />
                    <MiniStat label="PR Success" value={`${analytics.pull_request_stats.success_ratio}%`} icon={<Sparkles className="h-4 w-4" />} />
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <ChartCard title="Commit Distribution">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={analytics.commit_distribution.slice(0, 6)} dataKey="commits" nameKey="author" outerRadius={80} label>
                            {analytics.commit_distribution.slice(0, 6).map((entry, index) => (
                              <Cell key={`${entry.author}-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Weekly / Monthly Activity">
                      <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={analytics.weekly_activity.slice(-10)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" hide />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip />
                          <Line type="monotone" dataKey="commits" stroke="#06b6d4" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <ChartCard title="Active vs Inactive">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={[{ label: "Active", value: analytics.contributor_activity.active }, { label: "Inactive", value: analytics.contributor_activity.inactive }]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" />
                          <YAxis allowDecimals={false} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#10b981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>

                    <Card>
                      <CardHeader><CardTitle className="text-base">Top Contributor Identification</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p><span className="font-medium">Most active:</span> {analytics.top_contributors.most_active || "N/A"}</p>
                        <p><span className="font-medium">Core maintainers:</span> {analytics.top_contributors.core_maintainers.join(", ") || "N/A"}</p>
                        <p><span className="font-medium">Consistent contributors:</span> {analytics.top_contributors.consistent_contributors.join(", ") || "N/A"}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>History & Versioning Panel</CardTitle>
              <CardDescription>Sessions, README versions, docs, contributor reports, and edit history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Repository Sessions</p>
                <ScrollArea className="h-44 rounded border p-2">
                  {sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sessions</p>
                  ) : (
                    <div className="space-y-2">
                      {sessions.map((session) => (
                        <button
                          key={session.id}
                          type="button"
                          onClick={() => void onSelectSession(session)}
                          className={`w-full rounded border p-2 text-left hover:bg-accent ${currentSession?.id === session.id ? "border-primary bg-accent" : ""}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{session.repo_owner}/{session.repo_name}</p>
                              <p className="text-xs text-muted-foreground">{formatRelativeTime(session.created_at)}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={(event) => void onDeleteSession(session.id, event)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <Separator />

              <HistorySection title="README Versions" items={history.readme} activeId={active?.id || null} onSelect={onSelectHistory} />
              <HistorySection title="Documentation Versions" items={history.docs} activeId={active?.id || null} onSelect={onSelectHistory} />
              <HistorySection title="Contributor Reports" items={history.insights} activeId={active?.id || null} onSelect={onSelectHistory} />

              <p className="text-xs text-muted-foreground">Last update: {history.lastUpdated ? formatRelativeTime(history.lastUpdated) : "N/A"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded border p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function HistorySection({
  title,
  items,
  activeId,
  onSelect,
}: {
  title: string;
  items: GeneratedContent[];
  activeId: number | null;
  onSelect: (item: GeneratedContent) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ScrollArea className="h-28 rounded border p-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No versions</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full rounded border px-2 py-1 text-left text-xs hover:bg-accent ${activeId === item.id ? "border-primary bg-accent" : ""}`}
              >
                <p className="font-medium">{toLabel(item.content_type)} v{item.version}</p>
                <p className="text-muted-foreground">{formatRelativeTime(item.created_at)}</p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FileTree({ nodes, depth = 0 }: { nodes: FileNode[]; depth?: number }) {
  if (!nodes?.length) return null;
  return (
    <div className={depth > 0 ? "ml-4 border-l border-border pl-3" : ""}>
      {nodes.map((node) => (
        <div key={node.path}>
          <div className="flex items-center gap-2 py-1 text-sm">
            {node.type === "dir" ? <Folder className="h-4 w-4 text-yellow-500" /> : <FileCode className="h-4 w-4 text-muted-foreground" />}
            <span>{node.name}</span>
          </div>
          {node.children && <FileTree nodes={node.children} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}
