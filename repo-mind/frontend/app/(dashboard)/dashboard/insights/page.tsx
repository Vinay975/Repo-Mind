"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRepoStore, useInsightsStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import {
  BarChart2, Loader2, Download, Save, RefreshCw,
  Eye, Edit3, Clock, Sparkles, Copy, Check, History,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, BarChart, Bar,
} from "recharts";

export default function InsightsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSession, hasHydrated } = useRepoStore();
  const {
    currentInsight, versions, isGenerating,
    generateInsights, fetchVersions, setCurrentInsight, updateInsight,
  } = useInsightsStore();

  const [activeTab, setActiveTab] = useState<"preview" | "edit" | "analytics">("analytics");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [monthsBack, setMonthsBack] = useState(6);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentSession) { router.push("/dashboard"); return; }
    fetchVersions(currentSession.id);
  }, [currentSession, hasHydrated]);

  useEffect(() => {
    if (currentInsight) setEditedContent(currentInsight.content);
  }, [currentInsight]);

  const handleGenerate = async () => {
    if (!currentSession) return;
    try {
      await generateInsights(currentSession.id, monthsBack, customInstructions || undefined);
      toast({ title: "Insights generated!", variant: "success" });
      setCustomInstructions("");
    } catch (error) {
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Could not generate", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!currentInsight || editedContent === currentInsight.content) return;
    setIsSaving(true);
    try {
      await updateInsight(currentInsight.id, editedContent);
      toast({ title: "Saved!", variant: "success" });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Could not save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!currentInsight) return;
    try {
      const blob = await api.downloadInsights(currentInsight.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CONTRIBUTOR_REPORT.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", variant: "success" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    if (!currentInsight) return;
    try {
      await navigator.clipboard.writeText(activeTab === "edit" ? editedContent : currentInsight.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const analytics = currentInsight?.analytics ?? null;

  if (!hasHydrated || !currentSession) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 className="w-6 h-6" /> Contributor Insights
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentSession.repo_owner}/{currentSession.repo_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentInsight && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-red-500 hover:bg-red-600 text-white font-semibold">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : currentInsight ? (
              <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate</>
            )}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-card/40">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Months back:</label>
          <input
            type="number"
            min={1}
            max={24}
            value={monthsBack}
            onChange={(e) => setMonthsBack(Number(e.target.value) || 6)}
            className="h-10 w-20 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-red-500/30 font-mono"
          />
        </div>
        <textarea
          className="flex-1 h-10 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500/30"
          placeholder="Optional custom instructions..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {!currentInsight && !isGenerating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Generate Contributor Insights</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Analyze contributor activity, commit distribution, and repository velocity.
                </p>
                <Button onClick={handleGenerate} className="bg-red-500 hover:bg-red-600 text-white font-semibold">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Insights
                </Button>
              </CardContent>
            </Card>
          ) : isGenerating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Generating Insights...</h3>
                <p className="text-muted-foreground">Analyzing contributor data. This may take a moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit" | "analytics")}>
                      <TabsList>
                        <TabsTrigger value="analytics" className="gap-2"><BarChart2 className="w-4 h-4" />Analytics</TabsTrigger>
                        <TabsTrigger value="preview" className="gap-2"><Eye className="w-4 h-4" />Preview</TabsTrigger>
                        <TabsTrigger value="edit" className="gap-2"><Edit3 className="w-4 h-4" />Edit</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    {activeTab === "edit" && editedContent !== currentInsight?.content && (
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="p-0">
                  {activeTab === "analytics" && analytics ? (
                    <div className="p-6 space-y-6">
                      {/* Stats row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: "Total Commits", value: analytics.commit_total },
                          { label: "Period (months)", value: analytics.period_months },
                          { label: "PRs Merged", value: analytics.pull_request_stats.merged },
                          { label: "Issues Closed", value: analytics.issue_stats.closed },
                        ].map((s) => (
                          <div key={s.label} className="p-4 rounded-xl border border-border/50 bg-card/40 text-center">
                            <p className="text-2xl font-bold text-foreground">{s.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Charts */}
                      <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                          <CardHeader><CardTitle className="text-sm">Commit Activity</CardTitle></CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                              <LineChart data={analytics.monthly_activity.map((a) => ({ date: a.period, commits: a.commits }))}>
                                <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="commits" stroke="#ef4444" strokeWidth={2} dot={false} />
                              </LineChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader><CardTitle className="text-sm">Commits by Author</CardTitle></CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={200}>
                              <BarChart data={analytics.commit_distribution.slice(0, 8).map((d) => ({ name: d.author.split(" ")[0], value: d.commits }))}>
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Top contributors */}
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Top Contributors</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Most active</span>
                            <span className="font-medium">{analytics.top_contributors.most_active || "N/A"}</span>
                          </div>
                          <Separator />
                          <div>
                            <span className="text-muted-foreground block mb-1">Core maintainers</span>
                            <span className="font-medium text-red-500">{analytics.top_contributors.core_maintainers.join(", ") || "N/A"}</span>
                          </div>
                          <Separator />
                          <div>
                            <span className="text-muted-foreground block mb-1">Consistent contributors</span>
                            <span className="font-medium">{analytics.top_contributors.consistent_contributors.join(", ") || "N/A"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : activeTab === "analytics" && !analytics ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No analytics data available.</div>
                  ) : activeTab === "preview" ? (
                    <ScrollArea className="h-[600px]">
                      <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentInsight?.content || ""}</ReactMarkdown>
                      </div>
                    </ScrollArea>
                  ) : (
                    <textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full h-[600px] p-6 bg-background font-mono text-sm resize-none focus:outline-none"
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Version History */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" /> Version History
              </CardTitle>
              <CardDescription>{versions.length} version{versions.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No versions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setCurrentInsight(v)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-accent ${currentInsight?.id === v.id ? "border-primary bg-accent" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Version {v.version}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />{formatRelativeTime(v.created_at)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
