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
import { useRepoStore, useDocumentationStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { api, type DocumentationType } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import {
  BookOpen, Loader2, Download, Save, RefreshCw,
  Eye, Edit3, Clock, Sparkles, Copy, Check, History,
} from "lucide-react";

export default function DocumentationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSession, hasHydrated } = useRepoStore();
  const {
    currentDoc, versions, isGenerating, docType,
    setDocType, generateDoc, fetchVersions, setCurrentDoc, updateDoc,
  } = useDocumentationStore();

  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [includeVisuals, setIncludeVisuals] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentSession) { router.push("/dashboard"); return; }
    fetchVersions(currentSession.id, docType);
  }, [currentSession, hasHydrated, docType]);

  useEffect(() => {
    if (currentDoc) setEditedContent(currentDoc.content);
  }, [currentDoc]);

  const handleGenerate = async () => {
    if (!currentSession) return;
    try {
      await generateDoc(currentSession.id, docType, includeVisuals, customInstructions || undefined);
      toast({ title: "Documentation generated!", variant: "success" });
      setCustomInstructions("");
    } catch (error) {
      toast({ title: "Generation failed", description: error instanceof Error ? error.message : "Could not generate", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!currentDoc || editedContent === currentDoc.content) return;
    setIsSaving(true);
    try {
      await updateDoc(currentDoc.id, editedContent);
      toast({ title: "Saved!", variant: "success" });
    } catch (error) {
      toast({ title: "Save failed", description: error instanceof Error ? error.message : "Could not save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!currentDoc) return;
    try {
      const blob = await api.downloadDocumentation(currentDoc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docType === "license" ? "LICENSE" : "PROJECT_SUMMARY.md";
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
    if (!currentDoc) return;
    try {
      await navigator.clipboard.writeText(activeTab === "edit" ? editedContent : currentDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Copied!" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

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
            <BookOpen className="w-6 h-6" /> Documentation
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {currentSession.repo_owner}/{currentSession.repo_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentDoc && (
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
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : currentDoc ? (
              <><RefreshCw className="w-4 h-4 mr-2" />Regenerate</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Generate</>
            )}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-card/40">
        <select
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-amber-500/30 w-full sm:w-48"
          value={docType}
          onChange={(e) => setDocType(e.target.value as DocumentationType)}
        >
          <option value="project_summary">Project Summary</option>
          <option value="license">License</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none h-10">
          <input
            type="checkbox"
            checked={includeVisuals}
            onChange={(e) => setIncludeVisuals(e.target.checked)}
            className="rounded"
          />
          Include visual diagrams
        </label>
        <textarea
          className="flex-1 h-10 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-500/30"
          placeholder="Optional custom instructions..."
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {!currentDoc && !isGenerating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Generate Documentation</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  Generate a Project Summary or License document for your repository.
                </p>
                <Button onClick={handleGenerate} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate Documentation
                </Button>
              </CardContent>
            </Card>
          ) : isGenerating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Generating Documentation...</h3>
                <p className="text-muted-foreground">This may take a moment.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")}>
                    <TabsList>
                      <TabsTrigger value="preview" className="gap-2"><Eye className="w-4 h-4" />Preview</TabsTrigger>
                      <TabsTrigger value="edit" className="gap-2"><Edit3 className="w-4 h-4" />Edit</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  {activeTab === "edit" && editedContent !== currentDoc?.content && (
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {activeTab === "preview" ? (
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentDoc?.content || ""}</ReactMarkdown>
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
                        onClick={() => setCurrentDoc(v)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-accent ${currentDoc?.id === v.id ? "border-primary bg-accent" : ""}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Version {v.version}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            {v.content_type === "license" ? "License" : "Summary"}
                          </span>
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
