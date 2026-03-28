"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore, useRepoStore, useUIStore } from "@/lib/store";
import {
  Terminal,
  LayoutDashboard,
  FileText,
  BookOpen,
  BarChart2,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Star,
  GitFork,
  AlertCircle
} from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, logout, checkAuth, isLoading, hasHydrated } = useAuthStore();
  const { currentSession } = useRepoStore();
  const { activeModule, history, setHistoryTriggerItem } = useUIStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (hasHydrated) {
      checkAuth();
    }
  }, [checkAuth, hasHydrated]);

  useEffect(() => {
    // Only redirect after hydration is complete
    if (hasHydrated && !isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, hasHydrated, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Show loading while hydrating or checking auth
  if (!hasHydrated || isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const mainNav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const workspaceNav = [
    { href: "/dashboard/readme", label: "README", icon: FileText },
    { href: "/dashboard/documentation", label: "Documentation", icon: BookOpen },
    { href: "/dashboard/insights", label: "Insights", icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-card/60 backdrop-blur-xl border-r border-border/50 shadow-sm transform transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-border/50">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow">
                <Terminal className="w-5 h-5 text-black" />
              </div>
              <span className="font-bold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-yellow-600 dark:from-amber-400 dark:to-yellow-400">RepoMind</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:bg-black/5 dark:hover:bg-white/5"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll py-4 flex flex-col gap-6">
            {/* Main Navigation */}
            <div className="px-4">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Main</p>
              <nav className="space-y-1">
                {mainNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      pathname === item.href
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                        : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Workspace */}
            <div className="px-4">
              <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Workspace</p>
              <nav className="space-y-1">
                {workspaceNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      pathname === item.href
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                        : "text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Current Session */}
            {currentSession && (
              <div className="px-4 mt-auto">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Active Target</p>
                <div className="p-3 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-50 dark:from-zinc-900/50 dark:to-zinc-950 border border-border/50 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20 shadow-sm">
                      <Terminal className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground leading-tight">
                        {currentSession.repo_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {currentSession.repo_owner}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-border/50 pt-3 mt-1">
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-background/50 hover:bg-background transition-colors">
                      <Star className="w-3.5 h-3.5 text-amber-500 mb-1" />
                      <span className="text-[10px] font-medium text-foreground">{formatNumber(currentSession.metadata.stars)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-background/50 hover:bg-background transition-colors">
                      <GitFork className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                      <span className="text-[10px] font-medium text-foreground">{formatNumber(currentSession.metadata.forks)}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-1.5 rounded-lg bg-background/50 hover:bg-background transition-colors">
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                      <span className="text-[10px] font-medium text-foreground">{formatNumber(currentSession.metadata.open_issues)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

            {/* Past Generations History Dashboard */}
            {currentSession && (
              <div className="px-4 mt-2 mb-4">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Past Versions</p>
                <div className="space-y-1">
                  {(activeModule === "readme" ? history.readme : activeModule === "documentation" ? history.docs : history.insights).length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 italic">No past versions generated for {(activeModule === "readme" ? "README" : activeModule === "documentation" ? "Documentation" : "Insights")}.</p>
                  ) : (
                    (activeModule === "readme" ? history.readme : activeModule === "documentation" ? history.docs : history.insights).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => { setHistoryTriggerItem(item); setSidebarOpen(false); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-colors flex flex-col gap-0.5 group border border-transparent focus-visible:border-border"
                      >
                         <div className="flex items-center justify-between">
                           <span className="text-xs font-semibold text-foreground tracking-tight group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">Version {item.version}</span>
                           <span className="text-[10px] text-muted-foreground">{formatRelativeTime(item.created_at)}</span>
                         </div>
                         <span className="text-[10px] text-muted-foreground truncate font-medium">
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

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 bg-background/80 backdrop-blur-xl z-30 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-accent"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Breadcrumb */}
          <div className="hidden lg:flex items-center gap-2 text-sm font-medium">
            <span className="text-muted-foreground">Dashboard</span>
            {currentSession && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2 bg-accent/50 px-2 py-1 rounded-md border border-border/50">
                  <span className="text-muted-foreground">{currentSession.repo_owner}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-foreground">{currentSession.repo_name}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-6 w-px bg-border/50 hidden sm:block"></div>
            <div className="relative group">
              <button className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-400 flex items-center justify-center text-black font-bold ring-2 ring-background shadow-sm hover:opacity-90 transition-opacity">
                {user?.username?.charAt(0).toUpperCase()}
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 top-11 w-52 rounded-xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="px-4 py-3 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground truncate">{user?.username}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
