"use client";

import { useCallback, useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { Github, Loader2, Search, Sparkles, Star, GitFork, AlertCircle, Trash2, FileText, BookOpen, BarChart2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRepoStore } from "@/lib/store";
import { formatNumber, formatRelativeTime, isValidGitHubUrl } from "@/lib/utils";
import type { RepoSession } from "@/lib/api";

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

  useEffect(() => {
    if (!hasHydrated) return;
    void fetchSessions();
  }, [hasHydrated, fetchSessions]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentSession && sessions.length > 0) setCurrentSession(sessions[0]);
  }, [hasHydrated, currentSession, sessions, setCurrentSession]);

  const onAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidGitHubUrl(repoUrl)) {
      toast({ title: "Invalid URL", description: "Use https://github.com/owner/repository", variant: "destructive" });
      return;
    }
    try {
      await analyzeRepo(repoUrl.trim());
      setRepoUrl("");
      toast({ title: "Repository analyzed", description: "Session is ready. Use the Workspace to generate content.", variant: "success" });
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Unable to analyze repository",
        variant: "destructive",
      });
    }
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
    <div className="space-y-10">
      {/* Repo Analyze Section */}
      <div className="flex flex-col items-center justify-center py-16 px-6 animate-in fade-in slide-in-from-bottom-6 duration-500">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/50 bg-amber-500/10 shadow-[0_0_40px_-10px_rgba(245,158,11,0.4)]">
          <Search className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3 text-foreground text-center">
          Analyze a Repository
        </h1>
        <p className="text-base text-muted-foreground mb-10 max-w-xl text-center leading-relaxed">
          Paste a GitHub URL to get started. Once analyzed, use the Workspace to generate READMEs, Documentation, and Insights.
        </p>

        <form
          className="w-full max-w-2xl flex flex-col sm:flex-row items-center gap-3 bg-card/40 backdrop-blur-md p-3 shadow-xl rounded-2xl border border-border/50 ring-1 ring-border"
          onSubmit={onAnalyze}
        >
          <div className="flex-1 relative flex items-center w-full">
            <Github className="absolute left-4 h-5 w-5 text-muted-foreground" />
            <input
              className="w-full h-12 bg-background/60 pl-12 pr-4 outline-none placeholder:text-muted-foreground/60 text-foreground font-medium rounded-xl border border-transparent focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all text-sm"
              placeholder="https://github.com/owner/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              disabled={isAnalyzing}
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="h-12 px-6 w-full sm:w-auto rounded-xl bg-foreground hover:bg-foreground/90 text-background font-semibold transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 group"
            disabled={isAnalyzing || !repoUrl.trim()}
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20 group-hover:scale-110 transition-transform" />
                Analyze Repo
              </>
            )}
          </button>
        </form>
      </div>

      {/* Analyzed Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Analyzed Repositories</h2>
            <span className="text-xs text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className={`relative text-left p-4 rounded-2xl border transition-all duration-200 hover:shadow-md group ${
                  currentSession?.id === session.id
                    ? "border-amber-500/50 bg-amber-500/5 shadow-sm"
                    : "border-border/50 bg-card/40 hover:border-border"
                }`}
              >
                {currentSession?.id === session.id && (
                  <span className="absolute top-3 right-10 text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                )}
                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="mb-3">
                  <p className="text-sm font-semibold text-foreground truncate">{session.repo_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{session.repo_owner}</p>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-amber-500" />
                    {formatNumber(session.metadata.stars)}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="w-3 h-3" />
                    {formatNumber(session.metadata.forks)}
                  </span>
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {formatNumber(session.metadata.open_issues)}
                  </span>
                </div>

                <p className="text-[10px] text-muted-foreground mt-2">{formatRelativeTime(session.created_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick links to workspace */}
      {currentSession && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Generate for <span className="text-amber-500">{currentSession.repo_name}</span></h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/dashboard/readme", label: "README", desc: "Generate a comprehensive README file", icon: FileText, color: "text-orange-500", bg: "bg-orange-500/10" },
              { href: "/dashboard/documentation", label: "Documentation", desc: "Project summary and license docs", icon: BookOpen, color: "text-amber-500", bg: "bg-amber-500/10" },
              { href: "/dashboard/insights", label: "Insights", desc: "Contributor analytics and metrics", icon: BarChart2, color: "text-red-500", bg: "bg-red-500/10" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card/40 hover:border-border hover:shadow-sm transition-all duration-200 group"
              >
                <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
