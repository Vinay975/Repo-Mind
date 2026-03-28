"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRepoStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { formatNumber, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  History,
  Star,
  GitFork,
  Clock,
  FileText,
  Trash2,
  ArrowRight,
  Github,
  ExternalLink,
} from "lucide-react";

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { sessions, fetchSessions, setCurrentSession, deleteSession } = useRepoStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSelect = (session: typeof sessions[0]) => {
    setCurrentSession(session);
    router.push("/dashboard/readme");
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteSession(id);
      toast({
        title: "Session deleted",
        description: "Repository session has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete session",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <History className="w-8 h-8" />
          History
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your analyzed repositories
        </p>
      </div>

      {/* Content */}
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Github className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No repositories analyzed yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                Start by analyzing a GitHub repository from the dashboard.
              </p>
              <Button variant="gradient" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {session.repo_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {session.repo_owner}
                      </CardDescription>
                    </div>
                  </div>
                  <a
                    href={session.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Description */}
                {session.repo_description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {session.repo_description}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {formatNumber(session.metadata.stars)}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <GitFork className="w-4 h-4 text-cyan-500" />
                    {formatNumber(session.metadata.forks)}
                  </span>
                </div>

                {/* Languages */}
                {Object.keys(session.tech_stack.languages).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(session.tech_stack.languages)
                      .slice(0, 3)
                      .map(([lang]) => (
                        <span
                          key={lang}
                          className="px-2 py-0.5 text-xs rounded-full bg-muted"
                        >
                          {lang}
                        </span>
                      ))}
                    {Object.keys(session.tech_stack.languages).length > 3 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground">
                        +{Object.keys(session.tech_stack.languages).length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  Analyzed {formatRelativeTime(session.created_at)}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="gradient"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleSelect(session)}
                  >
                    Generate README
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(session.id)}
                  >
                    <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


