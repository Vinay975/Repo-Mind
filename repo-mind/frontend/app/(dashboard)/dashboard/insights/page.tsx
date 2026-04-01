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
import { BarChart2, Loader2, Download, Save, RefreshCw, Eye, Edit3, Clock, Sparkles, Copy, Check, History } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";

export default function InsightsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSession, hasHydrated } = useRepoStore();
  const { currentInsight, versions, isGenerating, generateInsights, fetchVersions, setCurrentInsight, updateInsight } = useInsightsStore();

  const [activeTab, setActiveTab] = useState<"analytics" | "preview" | "edit">("analytics");
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

  useEffect(() => { if (currentInsight) setEditedContent(currentInsight.content); }, [currentInsight]);

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
    } finally { setIsSaving(false); }
  };

  const handleDownload = async () => {
    if (!currentInsight) return;
    try {
      const blob = await api.downloadInsights(currentInsight.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "CONTRIBUTOR_REPORT.md";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", variant: "success" });
    } catch { toast({ title: "Download failed", variant: "destructive" }); }
  };

  const handleCopy = async () => {
    if (!currentInsight) return;
    try {
      await navigator.clipboard.writeText(activeTab === "edit" ? editedContent : currentInsight.content);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!" });
    } catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

  const analytics = currentInsight?.analytics ?? null;

  if (!hasHydrated || !currentSession) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-violet-500" />
            </div>
            Contributor Insights
          </h1>
          <p className="text-muted-foreground text-sm mt-1 ml-10">{currentSession.repo_owner}/{currentSession.repo_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {currentInsight && (
            <>
              {/* <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button> */}
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </Button>
            </>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25">
            {isGenerating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</>
              : currentInsight ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Regenerate</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Months back:</label>
          <input type="number" min={1} max={24} value={monthsBack}
            onChange={(e) => setMonthsBack(Number(e.target.value) || 6)}
            className="h-9 w-16 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 font-mono" />
        </div>
        <textarea
          className="flex-1 h-9 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30"
          placeholder="Optional custom instructions..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {/* Main */}
        <div className="lg:col-span-3">
          {!currentInsight && !isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <BarChart2 className="w-7 h-7 text-violet-500" />
                </div>
                <h3 className="text-base font-semibold mb-2">Generate Contributor Insights</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
                  Analyze contributor activity, commit distribution, and repository velocity.
                </p>
                <Button onClick={handleGenerate} className="bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Insights
                </Button>
              </CardContent>
            </Card>
          ) : isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
                <h3 className="text-base font-semibold mb-1">Generating Insights...</h3>
                <p className="text-muted-foreground text-sm">Analyzing contributor data. This may take a moment.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "analytics" | "preview" | "edit")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="analytics" className="text-xs gap-1.5 h-7"><BarChart2 className="w-3.5 h-3.5" />Analytics</TabsTrigger>
                      <TabsTrigger value="preview" className="text-xs gap-1.5 h-7"><Eye className="w-3.5 h-3.5" />Preview</TabsTrigger>
                      <TabsTrigger value="edit" className="text-xs gap-1.5 h-7"><Edit3 className="w-3.5 h-3.5" />Edit</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {activeTab === "edit" && editedContent !== currentInsight?.content && (
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 bg-violet-500 hover:bg-violet-600 text-white">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Save
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {activeTab === "analytics" && analytics ? (
                  <div className="p-5 space-y-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Total Commits", value: analytics.commit_total },
                        { label: "Period (months)", value: analytics.period_months },
                        { label: "PRs Merged", value: analytics.pull_request_stats.merged },
                        { label: "Issues Closed", value: analytics.issue_stats.closed },
                      ].map((s) => (
                        <div key={s.label} className="p-4 rounded-xl border border-border/50 bg-card/50 text-center">
                          <p className="text-2xl font-bold text-foreground">{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Charts */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="border-border/50">
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commit Activity</CardTitle></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={analytics.monthly_activity.map((a) => ({ date: a.period, commits: a.commits }))}>
                              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Line type="monotone" dataKey="commits" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="border-border/50">
                        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commits by Author</CardTitle></CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={analytics.commit_distribution.slice(0, 8).map((d) => ({ name: d.author.split(" ")[0], value: d.commits }))}>
                              <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis fontSize={10} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top contributors */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Contributors</CardTitle></CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Most active</span>
                          <span className="font-medium text-foreground">{analytics.top_contributors.most_active || "N/A"}</span>
                        </div>
                        <Separator />
                        <div>
                          <span className="text-muted-foreground text-xs block mb-1">Core maintainers</span>
                          <span className="font-medium text-violet-500">{analytics.top_contributors.core_maintainers.join(", ") || "N/A"}</span>
                        </div>
                        <Separator />
                        <div>
                          <span className="text-muted-foreground text-xs block mb-1">Consistent contributors</span>
                          <span className="font-medium text-foreground">{analytics.top_contributors.consistent_contributors.join(", ") || "N/A"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : activeTab === "analytics" ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">No analytics data available.</div>
                ) : activeTab === "preview" ? (
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 markdown-preview">
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
          )}
        </div>

        {/* Version History */}
        <div className="lg:col-span-1">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><History className="w-3.5 h-3.5 text-violet-500" />Version History</CardTitle>
              <CardDescription className="text-xs">{versions.length} version{versions.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[500px]">
                {versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No versions yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {versions.map((v) => (
                      <button key={v.id} onClick={() => setCurrentInsight(v)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all hover:bg-accent text-xs ${currentInsight?.id === v.id ? "border-violet-500/40 bg-violet-500/5" : "border-transparent"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">v{v.version}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
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
