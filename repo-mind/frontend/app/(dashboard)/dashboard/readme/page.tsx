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
import { useRepoStore, useReadmeStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import { FileText, Loader2, Download, Save, RefreshCw, Eye, Edit3, Clock, Sparkles, Copy, Check, History } from "lucide-react";

export default function ReadmePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSession, hasHydrated } = useRepoStore();
  const { currentReadme, versions, isGenerating, generateReadme, fetchVersions, setCurrentReadme, updateReadme } = useReadmeStore();

  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentSession) { router.push("/dashboard"); return; }
    fetchVersions(currentSession.id);
  }, [currentSession, hasHydrated]);

  useEffect(() => { if (currentReadme) setEditedContent(currentReadme.content); }, [currentReadme]);

  const handleGenerate = async () => {
    if (!currentSession) return;
    try {
      await generateReadme(currentSession.id, customInstructions || undefined);
      toast({ title: "README generated!", variant: "success" });
      setCustomInstructions("");
    } catch (error) {
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Could not generate", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!currentReadme || editedContent === currentReadme.content) return;
    setIsSaving(true);
    try {
      await updateReadme(currentReadme.id, editedContent);
      toast({ title: "Saved!", variant: "success" });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Could not save", variant: "destructive" });
    } finally { setIsSaving(false); }
  };

  const handleDownload = async () => {
    if (!currentReadme) return;
    try {
      const blob = await api.downloadReadme(currentReadme.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "README.md";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", variant: "success" });
    } catch { toast({ title: "Download failed", variant: "destructive" }); }
  };

  const handleCopy = async () => {
    if (!currentReadme) return;
    try {
      await navigator.clipboard.writeText(activeTab === "edit" ? editedContent : currentReadme.content);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!" });
    } catch { toast({ title: "Copy failed", variant: "destructive" }); }
  };

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
              <FileText className="w-4 h-4 text-violet-500" />
            </div>
            README Generator
          </h1>
          <p className="text-muted-foreground text-sm mt-1 ml-10">{currentSession.repo_owner}/{currentSession.repo_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {currentReadme && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download
              </Button>
            </>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25">
            {isGenerating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</>
              : currentReadme ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Regenerate</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate README</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-4">
        {/* Main */}
        <div className="lg:col-span-3">
          {!currentReadme && !isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-7 h-7 text-violet-500" />
                </div>
                <h3 className="text-base font-semibold mb-2">Generate Your README</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-5">
                  AI will analyze your repository structure and tech stack to craft a professional README.
                </p>
                <div className="max-w-md mx-auto mb-5">
                  <textarea
                    placeholder="Optional: custom instructions (e.g. 'Focus on API docs', 'Include deployment section')"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full p-3 rounded-lg border border-border bg-background text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <Button onClick={handleGenerate} className="bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate README
                </Button>
              </CardContent>
            </Card>
          ) : isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
                <h3 className="text-base font-semibold mb-1">Generating README...</h3>
                <p className="text-muted-foreground text-sm">Analyzing your repository. This may take a moment.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="preview" className="text-xs gap-1.5 h-7"><Eye className="w-3.5 h-3.5" />Preview</TabsTrigger>
                      <TabsTrigger value="edit" className="text-xs gap-1.5 h-7"><Edit3 className="w-3.5 h-3.5" />Edit</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {activeTab === "edit" && editedContent !== currentReadme?.content && (
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 bg-violet-500 hover:bg-violet-600 text-white">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Save
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {activeTab === "preview" ? (
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentReadme?.content || ""}</ReactMarkdown>
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
                      <button key={v.id} onClick={() => setCurrentReadme(v)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all hover:bg-accent text-xs ${currentReadme?.id === v.id ? "border-violet-500/40 bg-violet-500/5" : "border-transparent"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">v{v.version}</span>
                          {v.generation_params?.edited && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px]">Edited</span>
                          )}
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
