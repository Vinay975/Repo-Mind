"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore, useRepoStore, useUIStore } from "@/lib/store";
import {
  Terminal, LayoutDashboard, FileText, BookOpen,
  BarChart2, LogOut, Menu, X, ChevronRight,
  Star, GitFork, AlertCircle,
} from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, logout, checkAuth, isLoading, hasHydrated } = useAuthStore();
  const { currentSession } = useRepoStore();
  const { activeModule, history, setHistoryTriggerItem } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { if (hasHydrated) checkAuth(); }, [checkAuth, hasHydrated]);
  useEffect(() => {
    if (hasHydrated && !isLoading && !isAuthenticated) router.push("/login");
  }, [isAuthenticated, isLoading, hasHydrated, router]);

  const handleLogout = () => { logout(); router.push("/"); };

  if (!hasHydrated || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Terminal className="w-5 h-5 text-violet-500 animate-pulse" />
          </div>
          <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const mainNav = [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
  const workspaceNav = [
    { href: "/dashboard/readme", label: "README", icon: FileText },
    { href: "/dashboard/documentation", label: "Documentation", icon: BookOpen },
    { href: "/dashboard/insights", label: "Insights", icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 flex flex-col border-r border-border/50 dark:border-border bg-card/80 dark:bg-[hsl(230,22%,8%)] backdrop-blur-2xl transform transition-transform duration-300 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border/50 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition-shadow">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-gradient">RepoMind</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden w-8 h-8" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {/* Main */}
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Main</p>
            <nav className="space-y-0.5">
              {mainNav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    pathname === item.href
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Workspace */}
          <div>
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Workspace</p>
            <nav className="space-y-0.5">
              {workspaceNav.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                    pathname === item.href
                      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Active session */}
          {/* {currentSession && (
            <div>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Active Repo</p>
              <div className="rounded-xl border border-violet-500/20 dark:border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/8 p-3">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                    <Terminal className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{currentSession.repo_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentSession.repo_owner}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5 border-t border-border/40 pt-2.5">
                  {[
                    { icon: Star, value: formatNumber(currentSession.metadata.stars), color: "text-violet-400" },
                    { icon: GitFork, value: formatNumber(currentSession.metadata.forks), color: "text-muted-foreground" },
                    { icon: AlertCircle, value: formatNumber(currentSession.metadata.open_issues), color: "text-muted-foreground" },
                  ].map((s, i) => (
                    <div key={i} className="flex flex-col items-center p-1.5 rounded-lg bg-background/50">
                      <s.icon className={`w-3 h-3 mb-0.5 ${s.color}`} />
                      <span className="text-[10px] font-medium text-foreground">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )} */}

          {/* Past versions */}
          {currentSession && (
            <div>
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1.5">Past Versions</p>
              <div className="space-y-0.5">
                {(activeModule === "readme" ? history.readme : activeModule === "documentation" ? history.docs : history.insights).length === 0 ? (
                  <p className="px-3 text-xs text-muted-foreground/60 italic">No versions yet.</p>
                ) : (
                  (activeModule === "readme" ? history.readme : activeModule === "documentation" ? history.docs : history.insights).map((item) => (
                    <button key={item.id} type="button"
                      onClick={() => { setHistoryTriggerItem(item); setSidebarOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground group-hover:text-violet-500 transition-colors">v{item.version}</span>
                        <span className="text-[10px] text-muted-foreground">{formatRelativeTime(item.created_at)}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {item.content_type === "project_summary" ? "Project Summary" : item.content_type === "license" ? "License" : item.content_type === "contributor_report" ? "Contributor Report" : "README"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-14 border-b border-border/50 dark:border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 bg-background/80 dark:bg-[hsl(230,25%,6%)]/90 backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden w-8 h-8" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-4 h-4" />
            </Button>
            {/* Breadcrumb */}
            <div className="hidden lg:flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground font-medium">Dashboard</span>
              {currentSession && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-muted-foreground">{currentSession.repo_owner}</span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-foreground font-medium">{currentSession.repo_name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="w-px h-5 bg-border/60" />
            {/* Profile dropdown */}
            <div className="relative group">
              <button className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-violet-500/20 hover:shadow-violet-500/40 transition-shadow">
                {user?.username?.charAt(0).toUpperCase()}
              </button>
              <div className="absolute right-0 top-10 w-52 rounded-xl border border-border dark:border-border bg-card/95 dark:bg-[hsl(230,22%,10%)] backdrop-blur-xl shadow-xl dark:shadow-black/40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                <div className="px-4 py-3 bg-violet-500/5 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.username}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-9">
          {children}
        </main>
      </div>
    </div>
  );
}
