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
  BookOpen, Loader2, Download, Save, RefreshCw, Eye, Edit3, Clock,
  Sparkles, History, FileText, Shield, LayoutTemplate, Code2,
  GitBranch, Star, GitFork, AlertCircle, Package, Layers, CheckCircle2,
  ChevronRight, Info,
} from "lucide-react";

const DOC_TYPES: { value: DocumentationType; label: string; icon: typeof FileText; desc: string; color: string; iconBg: string }[] = [
  {
    value: "project_summary",
    label: "Project Summary",
    icon: LayoutTemplate,
    desc: "Comprehensive technical overview — architecture, stack, features, and development context.",
    color: "text-indigo-500",
    iconBg: "bg-indigo-500/10",
  },
  {
    value: "license",
    label: "License",
    icon: Shield,
    desc: "Auto-detected or AI-generated license file ready to commit to your repository.",
    color: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
  },
];

export default function DocumentationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSession, hasHydrated } = useRepoStore();
  const { currentDoc, versions, isGenerating, docType, setDocType, generateDoc, fetchVersions, setCurrentDoc, updateDoc } = useDocumentationStore();

  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [includeVisuals, setIncludeVisuals] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentSession) { router.push("/dashboard"); return; }
    fetchVersions(currentSession.id, docType);
  }, [currentSession, hasHydrated, docType]);

  useEffect(() => { if (currentDoc) setEditedContent(currentDoc.content); }, [currentDoc]);

  const handleGenerate = async () => {
    if (!currentSession) return;
    try {
      await generateDoc(currentSession.id, docType, includeVisuals, customInstructions || undefined);
      toast({ title: `${activeDocType.label} generated!`, variant: "success" });
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
    } finally { setIsSaving(false); }
  };

  const handleDownload = async () => {
    if (!currentDoc) return;
    try {
      const blob = await api.downloadDocumentation(currentDoc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = docType === "license" ? "LICENSE" : "PROJECT_SUMMARY.md";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", variant: "success" });
    } catch { toast({ title: "Download failed", variant: "destructive" }); }
  };

  const activeDocType = DOC_TYPES.find((d) => d.value === docType)!;
  const meta = currentSession?.metadata;
  const stack = currentSession?.tech_stack;
  const langs = Object.entries(stack?.languages ?? {}).slice(0, 5);
  const totalBytes = langs.reduce((s, [, v]) => s + v, 0);

  if (!hasHydrated || !currentSession) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-indigo-500" />
            </div>
            Documentation
          </h1>
          <p className="text-muted-foreground text-sm mt-1 ml-10">{currentSession.repo_owner}/{currentSession.repo_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {currentDoc && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {docType === "license" ? "Download LICENSE" : "Download"}
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isGenerating} className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            {isGenerating
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating...</>
              : currentDoc
              ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Regenerate</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Generate</>}
          </Button>
        </div>
      </div>

      {/* ── Doc Type Selector ── */}
      <div className="grid sm:grid-cols-2 gap-3">
        {DOC_TYPES.map((dt) => (
          <button
            key={dt.value}
            onClick={() => setDocType(dt.value)}
            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
              docType === dt.value
                ? "border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20"
                : "border-border bg-card hover:border-indigo-500/30 hover:bg-card/80"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg ${dt.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
              <dt.icon className={`w-4.5 h-4.5 ${dt.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-semibold text-foreground">{dt.label}</span>
                {docType === dt.value && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{dt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Generation Controls ── */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border/50 bg-card/50">
        {docType === "project_summary" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none h-9 shrink-0">
            <input type="checkbox" checked={includeVisuals} onChange={(e) => setIncludeVisuals(e.target.checked)}
              className="rounded border-border accent-indigo-500" />
            Include Mermaid diagrams
          </label>
        )}
        <textarea
          className="flex-1 h-9 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/30"
          placeholder={docType === "license" ? "e.g. Use MIT license, add company name..." : "e.g. Focus on API design, add deployment section..."}
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-4">

        {/* ── Main Content ── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Repo context panel — always visible */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Star, label: "Stars", value: meta?.stars ?? 0, color: "text-yellow-500", bg: "bg-yellow-500/10" },
              { icon: GitFork, label: "Forks", value: meta?.forks ?? 0, color: "text-indigo-400", bg: "bg-indigo-500/10" },
              { icon: AlertCircle, label: "Open Issues", value: meta?.open_issues ?? 0, color: "text-rose-400", bg: "bg-rose-500/10" },
              { icon: Package, label: "Size (KB)", value: meta?.size ?? 0, color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50">
                <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tech stack strip */}
          {(langs.length > 0 || (stack?.frameworks?.length ?? 0) > 0) && (
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/50 bg-card/50">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">Stack</span>
              {langs.map(([lang, bytes]) => (
                <span key={lang} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/8 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Code2 className="w-2.5 h-2.5" />{lang} {totalBytes > 0 ? `${((bytes / totalBytes) * 100).toFixed(0)}%` : ""}
                </span>
              ))}
              {stack?.frameworks?.slice(0, 3).map((f) => (
                <span key={f} className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                  <Layers className="w-2.5 h-2.5" />{f}
                </span>
              ))}
              {meta?.default_branch && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground ml-auto">
                  <GitBranch className="w-2.5 h-2.5" />{meta.default_branch}
                </span>
              )}
            </div>
          )}

          {/* Document card */}
          {!currentDoc && !isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <div className={`w-14 h-14 rounded-2xl ${activeDocType.iconBg} flex items-center justify-center mx-auto mb-4`}>
                  <activeDocType.icon className={`w-7 h-7 ${activeDocType.color}`} />
                </div>
                <h3 className="text-base font-semibold mb-2">Generate {activeDocType.label}</h3>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-2">{activeDocType.desc}</p>

                {docType === "project_summary" && (
                  <div className="max-w-md mx-auto mb-5 mt-4 grid grid-cols-2 gap-2 text-left">
                    {[
                      "Problem statement & objectives",
                      "Architecture overview",
                      "Full tech stack breakdown",
                      "Key features & business value",
                      "Module & folder structure",
                      "Development & contribution guide",
                      "Deployment & environment notes",
                      "Risks & recommendations",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />{item}
                      </div>
                    ))}
                  </div>
                )}

                {docType === "license" && (
                  <div className="max-w-xs mx-auto mb-5 mt-4 p-3 rounded-lg border border-border/50 bg-card/50 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-medium text-foreground">Auto-detected license</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meta?.license
                        ? <>Detected <span className="font-semibold text-emerald-500">{meta.license}</span> — will generate the full license text.</>
                        : "No license detected — will default to MIT. Use custom instructions to specify a different license."}
                    </p>
                  </div>
                )}

                <Button onClick={handleGenerate} className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25">
                  <Sparkles className="w-4 h-4 mr-2" /> Generate {activeDocType.label}
                </Button>
              </CardContent>
            </Card>
          ) : isGenerating ? (
            <Card className="border-border/50">
              <CardContent className="py-16 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
                <h3 className="text-base font-semibold mb-1">Generating {activeDocType.label}...</h3>
                <p className="text-muted-foreground text-sm">
                  {docType === "project_summary"
                    ? "Analyzing architecture, stack, and codebase structure. This may take a moment."
                    : "Preparing license document based on repository metadata."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "preview" | "edit")}>
                      <TabsList className="h-8">
                        <TabsTrigger value="preview" className="text-xs gap-1.5 h-7"><Eye className="w-3.5 h-3.5" />Preview</TabsTrigger>
                        <TabsTrigger value="edit" className="text-xs gap-1.5 h-7"><Edit3 className="w-3.5 h-3.5" />Edit</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${activeDocType.color} border-current/30`}>
                      {activeDocType.label}
                    </span>
                    {currentDoc?.generation_params?.edited && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium text-amber-500 border-amber-500/30">Edited</span>
                    )}
                  </div>
                  {activeTab === "edit" && editedContent !== currentDoc?.content && (
                    <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 bg-indigo-500 hover:bg-indigo-600 text-white">
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                      Save
                    </Button>
                  )}
                </div>

                {/* Document meta row */}
                {currentDoc && (
                  <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-border/40">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />Generated {formatRelativeTime(currentDoc.created_at)}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <FileText className="w-3 h-3" />{currentDoc.content.split("\n").length} lines
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Layers className="w-3 h-3" />{(currentDoc.content.length / 1024).toFixed(1)} KB
                    </span>
                    {currentDoc.generation_params?.model && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Sparkles className="w-3 h-3" />{currentDoc.generation_params.model}
                      </span>
                    )}
                  </div>
                )}
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {activeTab === "preview" ? (
                  <ScrollArea className="h-[640px]">
                    {docType === "license" ? (
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            License document — review before committing to your repository
                          </span>
                        </div>
                        <pre className="text-sm text-foreground font-mono whitespace-pre-wrap leading-relaxed bg-secondary/30 rounded-xl p-5 border border-border/50">
                          {currentDoc?.content}
                        </pre>
                      </div>
                    ) : (
                      <div className="p-6 markdown-preview">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentDoc?.content || ""}</ReactMarkdown>
                      </div>
                    )}
                  </ScrollArea>
                ) : (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[640px] p-6 bg-background font-mono text-sm resize-none focus:outline-none"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Doc type info card */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />About this doc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              {docType === "project_summary" ? (
                <>
                  <p>A <span className="text-foreground font-medium">Project Summary</span> is a comprehensive technical document covering architecture, stack, features, and development context.</p>
                  <Separator />
                  <p>Ideal for onboarding new contributors, stakeholder reviews, and technical audits.</p>
                  <Separator />
                  <div className="space-y-1.5">
                    {["Problem statement", "Architecture overview", "Tech stack", "Key features", "Module structure", "Dev guide", "Deployment notes", "Risks"].map((s) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p>A <span className="text-foreground font-medium">License</span> file defines the legal terms under which your code can be used, modified, and distributed.</p>
                  <Separator />
                  <p>RepoMind auto-detects your existing license and generates the full legal text.</p>
                  <Separator />
                  <div className="space-y-1.5">
                    {["MIT", "Apache 2.0", "GPL v3", "Custom (via instructions)"].map((s) => (
                      <div key={s} className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Version History */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-indigo-500" />Version History
              </CardTitle>
              <CardDescription className="text-xs">{versions.length} version{versions.length !== 1 ? "s" : ""}</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[360px]">
                {versions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No versions yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {versions.map((v) => (
                      <button key={v.id} onClick={() => setCurrentDoc(v)}
                        className={`w-full p-2.5 rounded-lg border text-left transition-all hover:bg-accent text-xs ${currentDoc?.id === v.id ? "border-indigo-500/40 bg-indigo-500/5" : "border-transparent"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">v{v.version}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${v.content_type === "license" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"}`}>
                            {v.content_type === "license" ? "License" : "Summary"}
                          </span>
                        </div>
                        {v.generation_params?.edited && (
                          <span className="text-[10px] text-amber-500 block mb-1">Edited</span>
                        )}
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
