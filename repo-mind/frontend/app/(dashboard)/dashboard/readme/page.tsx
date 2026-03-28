"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useRepoStore, useReadmeStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import {
  FileText,
  Loader2,
  Download,
  Save,
  RefreshCw,
  Eye,
  Edit3,
  Clock,
  Sparkles,
  ArrowLeft,
  Copy,
  Check,
  History,
} from "lucide-react";

export default function ReadmeGeneratorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentSession, hasHydrated } = useRepoStore();
  const { 
    currentReadme, 
    versions, 
    isGenerating, 
    generateReadme, 
    fetchVersions, 
    setCurrentReadme,
    updateReadme 
  } = useReadmeStore();

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  useEffect(() => {
    // Wait for hydration before checking session
    if (!hasHydrated) return;
    
    if (!currentSession) {
      router.push("/dashboard");
      return;
    }
    fetchVersions(currentSession.id);
  }, [currentSession, hasHydrated, fetchVersions, router]);

  useEffect(() => {
    if (currentReadme) {
      setEditedContent(currentReadme.content);
    }
  }, [currentReadme]);

  const handleGenerate = async () => {
    if (!currentSession) return;

    try {
      await generateReadme(currentSession.id, customInstructions || undefined);
      toast({
        title: "README generated!",
        description: "Your README has been generated successfully.",
        variant: "success",
      });
      setCustomInstructions("");
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Could not generate README",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!currentReadme || editedContent === currentReadme.content) return;

    setIsSaving(true);
    try {
      await updateReadme(currentReadme.id, editedContent);
      toast({
        title: "Changes saved!",
        description: "Your edits have been saved as a new version.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!currentReadme) return;

    try {
      const blob = await api.downloadReadme(currentReadme.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "README.md";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "README.md has been downloaded.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download README",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    if (!currentReadme) return;

    try {
      await navigator.clipboard.writeText(activeTab === "edit" ? editedContent : currentReadme.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "README content copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  // Show loading while hydrating or if no session
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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="w-6 h-6" />
              README Generator
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {currentSession.repo_owner}/{currentSession.repo_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentReadme && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </>
          )}
          <Button
            variant="gradient"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : currentReadme ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate README
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {!currentReadme && !isGenerating ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Generate Your README</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    Our AI will analyze the repository structure, tech stack, and generate a comprehensive README file.
                  </p>

                  {/* Custom Instructions */}
                  <div className="max-w-md mx-auto mb-6">
                    <textarea
                      placeholder="Optional: Add custom instructions for the AI (e.g., 'Focus on API documentation', 'Include deployment section')"
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      className="w-full p-3 rounded-lg border bg-background text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <Button variant="gradient" size="lg" onClick={handleGenerate}>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate README
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : isGenerating ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Generating README...</h3>
                  <p className="text-muted-foreground">
                    This may take a minute. Our AI is analyzing your repository.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
                    <TabsList>
                      <TabsTrigger value="preview" className="gap-2">
                        <Eye className="w-4 h-4" />
                        Preview
                      </TabsTrigger>
                      <TabsTrigger value="edit" className="gap-2">
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {activeTab === "edit" && editedContent !== currentReadme?.content && (
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="p-0">
                {activeTab === "preview" ? (
                  <ScrollArea className="h-[600px]">
                    <div className="p-6 markdown-preview">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {currentReadme?.content || ""}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                ) : (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-[600px] p-6 bg-background font-mono text-sm resize-none focus:outline-none"
                    placeholder="Start writing your README..."
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Version History */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="w-4 h-4" />
                Version History
              </CardTitle>
              <CardDescription>
                {versions.length} version{versions.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No versions yet. Generate your first README!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => setCurrentReadme(version)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-accent ${
                          currentReadme?.id === version.id
                            ? "border-primary bg-accent"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">
                            Version {version.version}
                          </span>
                          {version.generation_params?.edited && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                              Edited
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(version.created_at)}
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

