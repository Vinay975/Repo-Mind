"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import {
  Github, Loader2, Sparkles, Star, GitFork, AlertCircle, Trash2,
  FileText, BookOpen, BarChart2, ArrowRight, ExternalLink, Clock,
  Tag, GitBranch, Code2, Shield, TrendingUp, Zap, Activity,
  CheckCircle2, Circle, ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRepoStore } from "@/lib/store";
import { formatNumber, formatRelativeTime, isValidGitHubUrl } from "@/lib/utils";
import Link from "next/link";

const LANG_COLORS = ["bg-violet-500","bg-indigo-500","bg-purple-500","bg-fuchsia-500","bg-blue-500"];

const TOOLS = [
  {
    href: "/dashboard/readme",
    label: "README Generator",
    short: "README",
    tagline: "Auto-generate beautiful READMEs",
    desc: "AI analyzes your code structure, tech stack, and purpose to craft a professional README instantly.",
    features: ["Project overview & badges","Setup & installation guide","Custom AI instructions","Full version history"],
    icon: FileText,
    gradient: "from-violet-500/15 via-violet-500/5 to-transparent",
    border: "hover:border-violet-500/50",
    btn: "bg-violet-500 hover:bg-violet-600 shadow-violet-500/30",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    dot: "bg-violet-500",
    ring: "ring-violet-500/20",
    stat: "3 formats",
  },
  {
    href: "/dashboard/documentation",
    label: "Documentation",
    short: "Docs",
    tagline: "Rich project documentation",
    desc: "Generate comprehensive project summaries and license files, always in sync with your codebase.",
    features: ["Project summary docs","License generation","Visual diagram support","Markdown & PDF export"],
    icon: BookOpen,
    gradient: "from-indigo-500/15 via-indigo-500/5 to-transparent",
    border: "hover:border-indigo-500/50",
    btn: "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    iconColor: "text-indigo-500",
    dot: "bg-indigo-500",
    ring: "ring-indigo-500/20",
    stat: "2 doc types",
  },
  {
    href: "/dashboard/insights",
    label: "Contributor Insights",
    short: "Insights",
    tagline: "Deep contributor analytics",
    desc: "Visualize contributor activity, commit distribution, and repository velocity over time.",
    features: ["Commit activity charts","Contributor breakdown","PR & issue stats","Rolling time horizons"],
    icon: BarChart2,
    gradient: "from-purple-500/15 via-purple-500/5 to-transparent",
    border: "hover:border-purple-500/50",
    btn: "bg-purple-500 hover:bg-purple-600 shadow-purple-500/30",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    iconColor: "text-purple-500",
    dot: "bg-purple-500",
    ring: "ring-purple-500/20",
    stat: "6 chart types",
  },
];

export default function DashboardPage() {
  const { toast } = useToast();
  const { currentSession, sessions, hasHydrated, isAnalyzing, analyzeRepo, fetchSessions, setCurrentSession, deleteSession } = useRepoStore();
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => { if (hasHydrated) void fetchSessions(); }, [hasHydrated, fetchSessions]);
  useEffect(() => {
    if (hasHydrated && !currentSession && sessions.length > 0) setCurrentSession(sessions[0]);
  }, [hasHydrated, currentSession, sessions, setCurrentSession]);

  const onAnalyze = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isValidGitHubUrl(repoUrl)) {
      toast({ title: "Invalid URL", description: "Use https://github.com/owner/repository", variant: "destructive" });
      return;
    }
    try {
      await analyzeRepo(repoUrl.trim());
      setRepoUrl("");
      toast({ title: "Repository analyzed!", description: "Session ready — use the Workspace to generate content.", variant: "success" });
    } catch (error) {
      toast({ title: "Analysis failed", description: error instanceof Error ? error.message : "Unable to analyze", variant: "destructive" });
    }
  };

  const onDelete = async (id: number, e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    try {
      await deleteSession(id);
      toast({ title: "Session deleted" });
    } catch (error) {
      toast({ title: "Delete failed", description: error instanceof Error ? error.message : "Unable to delete", variant: "destructive" });
    }
  };

  const totalStars  = sessions.reduce((s, r) => s + (r.metadata?.stars ?? 0), 0);
  const totalForks  = sessions.reduce((s, r) => s + (r.metadata?.forks ?? 0), 0);
  const totalIssues = sessions.reduce((s, r) => s + (r.metadata?.open_issues ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">

      {/* ─────────────────────────────────────────
          HERO
      ───────────────────────────────────────── */}
      <section className="relative pt-10 pb-2 flex flex-col items-center text-center">
        {/* ambient glow */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[700px] h-[260px] bg-violet-500/8 dark:bg-violet-500/12 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-5 tracking-wide">
            <Zap className="w-3 h-3 fill-current" />
            AI-Powered Repository Intelligence
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-foreground mb-4 leading-[1.1]">
            Analyze any<br />
            <span className="text-gradient">GitHub Repository</span>
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mb-8 leading-relaxed">
            Paste a GitHub URL and let RepoMind generate READMEs, documentation,
            and contributor insights — automatically.
          </p>

          {/* Search bar */}
          <form onSubmit={onAnalyze} className="w-full max-w-2xl">
            <div className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border border-border bg-card shadow-xl shadow-black/5 dark:shadow-black/30">
              <div className="flex-1 relative flex items-center">
                <Github className="absolute left-3.5 w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  className="w-full h-11 bg-transparent pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none font-medium"
                  placeholder="https://github.com/owner/repository"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  disabled={isAnalyzing}
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={isAnalyzing || !repoUrl.trim()}
                className="h-11 px-6 rounded-xl bg-violet-500 hover:bg-violet-600 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/30 disabled:opacity-50 flex items-center justify-center gap-2 group whitespace-nowrap"
              >
                {isAnalyzing
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Analyzing...</>
                  : <><Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />Analyze Repo</>
                }
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─────────────────────────────────────────
          OVERVIEW STATS BAR
      ───────────────────────────────────────── */}
      {sessions.length > 0 && (
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Repositories", value: sessions.length, icon: Github, color: "text-violet-500", bg: "bg-violet-500/10" },
            { label: "Total Stars",  value: formatNumber(totalStars),  icon: Star,        color: "text-indigo-400", bg: "bg-indigo-500/10" },
            { label: "Total Forks",  value: formatNumber(totalForks),  icon: GitFork,     color: "text-purple-400", bg: "bg-purple-500/10" },
            { label: "Open Issues",  value: formatNumber(totalIssues), icon: AlertCircle, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ─────────────────────────────────────────
          ANALYZED REPOSITORIES
      ───────────────────────────────────────── */}
      {sessions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Analyzed Repositories</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Click a repository to set it as your active workspace</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-secondary border border-border px-3 py-1 rounded-full">
              {sessions.length} {sessions.length === 1 ? "repo" : "repos"}
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
            {sessions.map((session) => {
              const isActive = currentSession?.id === session.id;
              const langs    = Object.entries(session.tech_stack?.languages ?? {}).slice(0, 5);
              const total    = langs.reduce((s, [, v]) => s + v, 0);
              const topics   = session.metadata?.topics?.slice(0, 3) ?? [];
              const fwks     = session.tech_stack?.frameworks?.slice(0, 2) ?? [];

              return (
                <div
                  key={session.id}
                  onClick={() => setCurrentSession(session)}
                  className={`relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 group overflow-hidden ${
                    isActive
                      ? "border-violet-500/60 bg-card shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/20"
                      : "border-border bg-card hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/8 hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top bar */}
                  <div className={`h-[3px] w-full shrink-0 transition-all duration-500 ${
                    isActive
                      ? "bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500"
                      : "bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-purple-500/20 group-hover:from-violet-500 group-hover:via-indigo-500 group-hover:to-purple-500"
                  }`} />

                  <div className="p-5 flex flex-col flex-1 gap-3.5">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                          isActive ? "bg-violet-500 shadow-lg shadow-violet-500/40" : "bg-violet-500/10 group-hover:bg-violet-500/20"
                        }`}>
                          <Github className={`w-5 h-5 ${isActive ? "text-white" : "text-violet-500"}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-bold text-foreground truncate">{session.repo_name}</p>
                            {isActive && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-violet-500 bg-violet-500/10 border border-violet-500/25 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Active
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{session.repo_owner}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <a href={session.repo_url} target="_blank" rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button onClick={(e) => onDelete(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <p className={`text-xs leading-relaxed line-clamp-2 ${session.repo_description ? "text-muted-foreground" : "text-muted-foreground/40 italic"}`}>
                      {session.repo_description || "No description provided."}
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { icon: Star,         label: "Stars",  value: formatNumber(session.metadata.stars),       color: "text-violet-400" },
                        { icon: GitFork,      label: "Forks",  value: formatNumber(session.metadata.forks),       color: "text-indigo-400" },
                        { icon: AlertCircle,  label: "Issues", value: formatNumber(session.metadata.open_issues), color: "text-purple-400" },
                      ].map((s) => (
                        <div key={s.label} className="flex flex-col items-center justify-center py-2.5 px-1 rounded-xl bg-secondary/60 border border-border/60 gap-1">
                          <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                          <span className="text-sm font-bold text-foreground leading-none">{s.value}</span>
                          <span className="text-[10px] text-muted-foreground">{s.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Topics + frameworks */}
                    {(topics.length > 0 || fwks.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {topics.map((t) => (
                          <span key={t} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-500/8 border border-violet-500/20 text-violet-600 dark:text-violet-400">
                            <Tag className="w-2.5 h-2.5" />{t}
                          </span>
                        ))}
                        {fwks.map((f) => (
                          <span key={f} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                            <Code2 className="w-2.5 h-2.5" />{f}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Language bar */}
                    {langs.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                          {langs.map(([lang, bytes], i) => {
                            const pct = total > 0 ? (bytes / total) * 100 : 0;
                            return <div key={lang} className={`${LANG_COLORS[i % LANG_COLORS.length]} rounded-full`} style={{ width: `${pct}%` }} title={`${lang} ${pct.toFixed(1)}%`} />;
                          })}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {langs.map(([lang, bytes], i) => {
                            const pct = total > 0 ? ((bytes / total) * 100).toFixed(1) : "0";
                            return (
                              <span key={lang} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${LANG_COLORS[i % LANG_COLORS.length]}`} />
                                <span className="font-medium text-foreground">{lang}</span>
                                <span className="text-muted-foreground/60">{pct}%</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                      <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />{formatRelativeTime(session.created_at)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {session.metadata.license && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded-md">
                            <Shield className="w-2.5 h-2.5" />{session.metadata.license}
                          </span>
                        )}
                        {session.metadata.default_branch && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded-md">
                            <GitBranch className="w-2.5 h-2.5" />{session.metadata.default_branch}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Filler card — pure animation, no text */}
            <div className="relative flex items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 overflow-hidden min-h-[320px]">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-indigo-500/3 to-transparent pointer-events-none" />

              <div className="relative w-48 h-48">
                {/* Outer rotating ring */}
                <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-spin" style={{ animationDuration: "12s" }} />
                <div className="absolute inset-2 rounded-full border border-dashed border-indigo-500/15 animate-spin" style={{ animationDuration: "18s", animationDirection: "reverse" }} />
                <div className="absolute inset-6 rounded-full border border-purple-500/10 animate-spin" style={{ animationDuration: "8s" }} />

                {/* Center pulsing core */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: "2.5s" }} />
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <Github className="w-7 h-7 text-violet-500" />
                    </div>
                  </div>
                </div>

                {/* Orbiting icons on the ring */}
                {[
                  { icon: FileText,  color: "text-violet-500",  bg: "bg-violet-500/10",  border: "border-violet-500/25",  angle: 0,   size: "w-9 h-9" },
                  { icon: BookOpen,  color: "text-indigo-500",  bg: "bg-indigo-500/10",  border: "border-indigo-500/25",  angle: 90,  size: "w-9 h-9" },
                  { icon: BarChart2, color: "text-purple-500",  bg: "bg-purple-500/10",  border: "border-purple-500/25",  angle: 180, size: "w-9 h-9" },
                  { icon: Star,      color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/25", angle: 270, size: "w-9 h-9" },
                ].map((item, i) => {
                  const rad = (item.angle * Math.PI) / 180;
                  const r = 80;
                  const x = Math.cos(rad) * r;
                  const y = Math.sin(rad) * r;
                  return (
                    <div
                      key={i}
                      className={`absolute flex items-center justify-center rounded-xl ${item.bg} border ${item.border} ${item.size} shadow-sm`}
                      style={{
                        left: `calc(50% + ${x}px - 18px)`,
                        top:  `calc(50% + ${y}px - 18px)`,
                        animation: `spin ${12 + i * 2}s linear infinite`,
                        animationDirection: i % 2 === 0 ? "normal" : "reverse",
                      }}
                    >
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                  );
                })}

                {/* Small floating dots */}
                {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                  const rad = (angle * Math.PI) / 180;
                  const r = 60;
                  const x = Math.cos(rad) * r;
                  const y = Math.sin(rad) * r;
                  const colors = ["bg-violet-500","bg-indigo-500","bg-purple-500","bg-fuchsia-500","bg-violet-400","bg-indigo-400"];
                  return (
                    <div
                      key={i}
                      className={`absolute w-1.5 h-1.5 rounded-full ${colors[i]} opacity-60`}
                      style={{
                        left: `calc(50% + ${x}px - 3px)`,
                        top:  `calc(50% + ${y}px - 3px)`,
                        animation: `ping ${1.5 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────
          WORKSPACE TOOLS
      ───────────────────────────────────────── */}
      <section className="space-y-5 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Workspace Tools</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Three AI-powered tools to supercharge your repository workflow</p>
          </div>
          {/* {currentSession && (
            <Link href="/dashboard/readme" className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline underline-offset-2 w-fit">
              Get started <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )} */}
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {TOOLS.map((tool) => (
            <div key={tool.href}
              className={`group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${tool.border}`}>

              {/* Gradient wash */}
              <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-b ${tool.gradient} pointer-events-none`} />

              <div className="relative z-10 p-6 flex flex-col flex-1">
                {/* Icon + stat badge */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-2xl ${tool.iconBg} border border-border/50 flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
                    <tool.icon className={`w-6 h-6 ${tool.iconColor}`} />
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${tool.iconBg} border-border/50 ${tool.iconColor}`}>
                    {tool.stat}
                  </span>
                </div>

                {/* Label */}
                <p className={`text-[10px] font-bold uppercase tracking-widest ${tool.iconColor} mb-1`}>{tool.short}</p>
                <h3 className="text-base font-bold text-foreground mb-2 leading-snug">{tool.tagline}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{tool.desc}</p>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {tool.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tool.dot}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={tool.href}
                  className={`flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg ${tool.btn} group-hover:shadow-xl`}>
                  Open {tool.short}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
