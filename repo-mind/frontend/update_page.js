const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'app', '(dashboard)', 'dashboard', 'page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// Find the start of the return statement in DashboardPage
const startIdx = content.indexOf('  return (\n    <div className="space-y-6">');
// Find the end of DashboardPage component
const endIdx = content.indexOf('}\n\nfunction MiniStat');

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find start or end index.");
  process.exit(1);
}

const newReturnStatement = `  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* 1. HERO & REPO ENTRY */}
      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 shadow-sm rounded-2xl">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70">
                    {currentSession ? \`\${currentSession.repo_owner}/\${currentSession.repo_name}\` : "Workspace"}
                  </h1>
                  <p className="mt-1 text-muted-foreground max-w-xl">
                    {currentSession ? (currentSession.repo_description || "Repository intelligence and automation workspace.") : "Enter a repository URL to begin organizing intelligence. All generated assets are versioned and linked to your session."}
                  </p>
                </div>

                <form className="flex w-full max-w-xl items-center space-x-2" onSubmit={onAnalyze}>
                  <div className="relative flex-1">
                    <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="https://github.com/owner/repository"
                      className="pl-9 h-10 bg-background/50 border-border/50 backdrop-blur-sm focus-visible:ring-emerald-500/50"
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                      disabled={isAnalyzing}
                    />
                  </div>
                  <Button type="submit" className="h-10 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20 transition-all border-0" disabled={isAnalyzing || !repoUrl.trim()}>
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
                  </Button>
                </form>
                
                {ollamaStatus === false && (
                  <div className="flex items-center gap-2 text-xs font-medium text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-md border border-amber-500/20 w-max backdrop-blur-sm">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Ollama offline. Using fallback generation.
                  </div>
                )}
              </div>

              {/* Repo Stats */}
              {currentSession && (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:w-1/2">
                   <MiniStat label="Stars" value={formatNumber(currentSession.metadata.stars)} icon={<Star className="h-4 w-4 text-amber-400" />} />
                   <MiniStat label="Forks" value={formatNumber(currentSession.metadata.forks)} icon={<GitFork className="h-4 w-4 text-emerald-400" />} />
                   <MiniStat label="Issues" value={formatNumber(currentSession.metadata.open_issues)} icon={<AlertCircle className="h-4 w-4 text-rose-400" />} />
                   <MiniStat label="Branch" value={currentSession.metadata.default_branch} icon={<FileCode className="h-4 w-4 text-cyan-400" />} />
                </div>
              )}
            </div>
          </CardContent>
        </div>
      </Card>

      {/* 2. MODULE NAVIGATION & WORKSPACE */}
      {currentSession && (
        <div className="space-y-6">
          <Tabs value={module} onValueChange={(value) => setModule(value as DashboardModule)} className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sticky top-16 z-20 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-card/60 backdrop-blur-sm border border-border/50 p-1 h-12 rounded-xl">
                <TabsTrigger value="readme" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/10 data-[state=active]:to-cyan-500/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-full">README</TabsTrigger>
                <TabsTrigger value="documentation" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/10 data-[state=active]:to-cyan-500/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-full">Documentation</TabsTrigger>
                <TabsTrigger value="insights" className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/10 data-[state=active]:to-cyan-500/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-full">Insights</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void refresh(currentSession.id)} className="h-10 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-accent rounded-xl">
                  <Loader2 className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh State
                </Button>
              </div>
            </div>

            <div className="mt-0">
              <TabsContent value={module} className="mt-0 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300">
                 
                 {/* SHARED WORKSPACE GRID FOR README & DOCS */}
                 {(module === "readme" || module === "documentation") && (
                   <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                     {/* LEFT COLUMN: CONTROLS & HISTORY */}
                     <div className="xl:col-span-4 space-y-6">
                       
                       <Card className="border-border/50 bg-card/50 shadow-sm rounded-xl overflow-hidden backdrop-blur-sm">
                         <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b border-border/30 pb-4">
                           <CardTitle className="text-base flex items-center gap-2">
                             <Sparkles className="h-4 w-4 text-emerald-500" />
                             Generation Settings
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="p-4 space-y-4">
                           {module === "documentation" && (
                             <div className="flex flex-col gap-2">
                               <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Document Type</label>
                               <select
                                 className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-shadow"
                                 value={docType}
                                 onChange={(event) => setDocType(event.target.value as DocumentationType)}
                               >
                                 <option value="project_summary">Project Summary</option>
                                 <option value="license">License</option>
                               </select>
                               <label className="inline-flex items-center gap-2 text-sm mt-1 cursor-pointer select-none">
                                 <input type="checkbox" className="rounded text-emerald-500 focus:ring-emerald-500/50 bg-background border-border" checked={includeVisuals} onChange={(event) => setIncludeVisuals(event.target.checked)} />
                                 <span className="text-muted-foreground hover:text-foreground transition-colors">Include visual diagrams</span>
                               </label>
                             </div>
                           )}

                           <div className="flex flex-col gap-2">
                             <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Custom Instructions</label>
                             <textarea
                               className="min-h-[100px] w-full resize-none rounded-lg border border-border bg-background p-3 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none transition-shadow"
                               placeholder={\`Optional precise instructions for generating the \${module === "readme" ? "README" : "Documentation"}...\`}
                               value={instructions}
                               onChange={(event) => setInstructions(event.target.value)}
                             />
                           </div>

                           <Button className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-md border-0 h-10 rounded-lg group" onClick={onGenerate} disabled={generating}>
                             {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />}
                             Generate {toLabel(module === "readme" ? "readme" : docType)}
                           </Button>
                         </CardContent>
                       </Card>

                       <Card className="border-border/50 bg-card/50 shadow-sm rounded-xl backdrop-blur-sm">
                         <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b border-border/30 pb-3">
                           <CardTitle className="text-base flex items-center gap-2">
                             <Folder className="h-4 w-4 text-cyan-500" />
                             Version History
                           </CardTitle>
                         </CardHeader>
                         <CardContent className="p-0">
                           <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                             {(module === "readme" ? history.readme : history.docs).length === 0 ? (
                               <div className="p-6 text-center text-sm text-muted-foreground">No history yet.</div>
                             ) : (
                               <div className="divide-y divide-border/30">
                                 {(module === "readme" ? history.readme : history.docs).map((item) => (
                                   <button
                                     type="button"
                                     key={item.id}
                                     onClick={() => onSelectHistory(item)}
                                     className={\`w-full flex flex-col items-start px-4 py-3 text-left transition-colors hover:bg-accent/50 \${active?.id === item.id ? "bg-accent border-l-2 border-l-emerald-500" : "border-l-2 border-l-transparent"}\`}
                                   >
                                     <div className="flex items-center justify-between w-full mb-1">
                                       <span className="font-semibold text-sm">{toLabel(item.content_type)}</span>
                                       <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">v{item.version}</span>
                                     </div>
                                     <span className="text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</span>
                                   </button>
                                 ))}
                               </div>
                             )}
                           </div>
                         </CardContent>
                       </Card>

                     </div>

                     {/* RIGHT COLUMN: EDITOR & PREVIEW */}
                     <div className="xl:col-span-8 flex flex-col h-[calc(100vh-14rem)] min-h-[600px]">
                       <Card className="flex-1 flex flex-col border-border/50 bg-card/80 backdrop-blur-xl shadow-lg rounded-2xl overflow-hidden ring-1 ring-border/50">
                         {loading ? (
                           <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
                             <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                             Loading workspace...
                           </div>
                         ) : !active ? (
                           <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
                             <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-2">
                               <FileCode className="h-8 w-8 text-muted-foreground/50" />
                             </div>
                             Generate content to start editing.
                           </div>
                         ) : (
                           <>
                             {/* Editor Header */}
                             <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/50 bg-muted/30 p-3 lg:px-6 gap-4">
                               <div className="flex items-center gap-3">
                                 <div className="hidden sm:flex w-10 h-10 rounded-lg bg-emerald-500/10 items-center justify-center border border-emerald-500/20">
                                   <FileText className="h-5 w-5 text-emerald-500" />
                                 </div>
                                 <div>
                                   <div className="flex items-center gap-2">
                                      <h3 className="font-semibold text-foreground tracking-tight">{active.title || toLabel(active.content_type)}</h3>
                                      <span className="text-xs font-mono bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded">v{active.version}</span>
                                   </div>
                                   <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(active.created_at)}</p>
                                 </div>
                               </div>
                               
                               <div className="flex items-center gap-3 bg-background/50 p-1 rounded-lg border border-border/50 backdrop-blur-sm self-start sm:self-auto w-full sm:w-auto overflow-x-auto">
                                 <Tabs value={tab} onValueChange={(value) => setTab(value as "preview" | "edit")} className="w-full sm:w-auto">
                                   <TabsList className="bg-transparent h-8 p-0 gap-1 w-full sm:w-auto grid grid-cols-2 sm:flex">
                                     <TabsTrigger value="preview" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 h-full text-xs font-medium"><Eye className="mr-2 h-3.5 w-3.5" />Preview</TabsTrigger>
                                     <TabsTrigger value="edit" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 h-full text-xs font-medium"><Pencil className="mr-2 h-3.5 w-3.5" />Edit Raw</TabsTrigger>
                                   </TabsList>
                                 </Tabs>
                               </div>
                             </div>

                             {/* Editor Body */}
                             <div className="flex-1 overflow-hidden relative bg-background/30 flex flex-col">
                               <Tabs value={tab} className="w-full flex-1 flex flex-col [&>div]:flex-1 overflow-hidden h-full">
                                 <TabsContent value="preview" className="m-0 h-full p-0">
                                   <ScrollArea className="h-full w-full custom-scroll">
                                     <div className="max-w-4xl mx-auto p-6 lg:p-12 markdown-preview prose prose-sm md:prose-base dark:prose-invert">
                                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || active.content}</ReactMarkdown>
                                     </div>
                                   </ScrollArea>
                                 </TabsContent>
                                 <TabsContent value="edit" className="m-0 p-0 h-full flex flex-col">
                                   <textarea 
                                     className="flex-1 w-full resize-none bg-transparent p-6 font-mono text-sm leading-relaxed focus:outline-none custom-scroll text-foreground/90 font-medium" 
                                     value={content} 
                                     onChange={(event) => setContent(event.target.value)} 
                                     spellCheck={false}
                                   />
                                 </TabsContent>
                               </Tabs>
                             </div>

                             {/* Editor Footer Actions */}
                             <div className="border-t border-border/50 bg-card p-4 lg:px-6">
                               <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                 <div className="flex items-center gap-2">
                                   <Button size="sm" variant="outline" onClick={onDownload} disabled={downloading} className="rounded-lg h-9 bg-background/50">
                                     <Download className="mr-2 h-4 w-4 text-emerald-500" /> .md
                                   </Button>
                                   <Button size="sm" variant="outline" onClick={onExportPdf} className="rounded-lg h-9 bg-background/50">
                                     <Download className="mr-2 h-4 w-4 text-cyan-500" /> .pdf
                                   </Button>
                                 </div>

                                 <div className="w-[1px] h-8 bg-border/50 hidden sm:block mx-1"></div>

                                 <div className="flex items-center gap-2 w-full sm:w-auto">
                                   <Input type="password" placeholder="GH Token" className="h-9 w-28 text-xs bg-background/50" value={githubToken} onChange={(event) => setGithubToken(event.target.value)} />
                                   <Button size="sm" onClick={onSave} disabled={saving || content === active.content} className="rounded-lg h-9 border-0 bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 hover:from-emerald-500 hover:to-cyan-500 text-white shadow-sm transition-all ml-2 whitespace-nowrap">
                                     {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                     Commit Edit
                                   </Button>
                                   <Button size="sm" onClick={onPush} disabled={pushing} className="rounded-lg h-9 whitespace-nowrap bg-foreground text-background hover:bg-foreground/90 font-medium px-4">
                                     {pushing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />} Push
                                   </Button>
                                 </div>
                               </div>
                             </div>
                           </>
                         )}
                       </Card>
                     </div>
                   </div>
                 )}

                 {/* INSIGHTS WORKSPACE */}
                 {module === "insights" && (
                   <div className="space-y-6">
                     <Card className="border-border/50 bg-card/40 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden ring-1 ring-border/50">
                       <CardContent className="p-4 lg:p-6 flex flex-col md:flex-row gap-6 items-center justify-between">
                         <div className="flex-1 flex flex-col gap-2">
                           <h3 className="font-semibold text-lg flex items-center gap-2">
                             <Users className="h-5 w-5 text-cyan-500" /> Contributor Analytics
                           </h3>
                           <p className="text-sm text-muted-foreground">Generate a comprehensive report spanning multiple past months to uncover community health metrics.</p>
                         </div>
                         <div className="flex w-full md:w-auto gap-3 items-end">
                           <div className="flex flex-col gap-1.5 w-full md:w-28">
                             <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground ml-1">Timeframe (Mos)</label>
                             <input
                               type="number" min={1} max={24} value={monthsBack}
                               onChange={(event) => setMonthsBack(Number(event.target.value) || 6)}
                               className="w-full rounded-lg border border-border bg-background focus:ring-2 focus:ring-cyan-500/50 outline-none transition-shadow h-10 px-3 text-sm font-mono"
                             />
                           </div>
                           <Button className="h-10 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-md border-0 w-full md:w-auto rounded-lg px-6" onClick={onGenerate} disabled={generating}>
                             {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                             Process Analytics
                           </Button>
                         </div>
                       </CardContent>
                     </Card>

                     {!analytics ? (
                       <div className="h-[400px] rounded-2xl border border-dashed border-border/60 bg-muted/10 flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-4">
                         <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center">
                           <Users className="h-8 w-8 text-cyan-500/50" />
                         </div>
                         <p>Analytics not generated for this session yet.<br/>Configure timeframe and generate to reveal insights.</p>
                       </div>
                     ) : (
                       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                         {/* KPI ROW */}
                         <div className="grid gap-4 md:grid-cols-4">
                           <Card className="rounded-xl border-border/50 bg-gradient-to-br from-card to-card/50 shadow-sm relative overflow-hidden group">
                             <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                             <CardContent className="p-5 relative z-10">
                               <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><Users className="h-4 w-4 text-emerald-500" />Total Contributors</p>
                               <p className="text-3xl font-bold font-mono tracking-tight text-foreground drop-shadow-sm">{formatNumber(analytics.contributor_activity.total)}</p>
                             </CardContent>
                           </Card>
                           <Card className="rounded-xl border-border/50 bg-gradient-to-br from-card to-card/50 shadow-sm relative overflow-hidden group">
                             <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                             <CardContent className="p-5 relative z-10">
                               <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><ArrowRight className="h-4 w-4 text-cyan-500" />Active in Period</p>
                               <p className="text-3xl font-bold font-mono tracking-tight text-foreground drop-shadow-sm">{formatNumber(analytics.contributor_activity.active)}</p>
                             </CardContent>
                           </Card>
                           <Card className="rounded-xl border-border/50 bg-gradient-to-br from-card to-card/50 shadow-sm relative overflow-hidden group">
                             <div className="absolute right-0 top-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
                             <CardContent className="p-5 relative z-10">
                               <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1"><Sparkles className="h-4 w-4 text-blue-500" />PR Success Rate</p>
                               <p className="text-3xl font-bold font-mono tracking-tight text-foreground drop-shadow-sm">{analytics.pull_request_stats.success_ratio}%</p>
                             </CardContent>
                           </Card>
                           <Card className="rounded-xl border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent shadow-sm hover:from-emerald-500/20 transition-colors cursor-pointer" onClick={onDownload}>
                             <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center">
                               <Download className="h-6 w-6 text-emerald-500 mb-2 drop-shadow-sm" />
                               <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Export Full Report</span>
                             </CardContent>
                           </Card>
                         </div>

                         {/* CHARTS MASONRY */}
                         <div className="grid gap-6 lg:grid-cols-2 lg:grid-rows-2">
                           <ChartCard title="Commit Distribution" className="lg:row-span-2 shadow-md">
                             <div className="flex flex-col h-[380px] justify-center items-center">
                               <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                   <Pie data={analytics.commit_distribution.slice(0, 6)} dataKey="commits" nameKey="author" innerRadius={80} outerRadius={120} paddingAngle={2} label>
                                     {analytics.commit_distribution.slice(0, 6).map((entry, index) => (
                                       <Cell key={\`\${entry.author}-\${index}\`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                                     ))}
                                   </Pie>
                                   <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                                 </PieChart>
                               </ResponsiveContainer>
                             </div>
                           </ChartCard>

                           <ChartCard title="Activity Timeline" className="h-[240px] shadow-sm">
                             <ResponsiveContainer width="100%" height="100%">
                               <LineChart data={analytics.weekly_activity.slice(-10)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                 <XAxis dataKey="period" hide />
                                 <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                                 <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                                 <Line type="monotone" dataKey="commits" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#fff' }} />
                               </LineChart>
                             </ResponsiveContainer>
                           </ChartCard>

                           <ChartCard title="Key Personnel Highlights" className="h-[240px] flex flex-col shadow-sm">
                             <div className="flex-1 space-y-4 pt-2">
                               <div className="flex items-start gap-4 p-3 rounded-lg bg-background/50 border border-border/50">
                                 <div className="w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 shadow-inner">
                                   <Star className="h-6 w-6 text-cyan-500" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most Active Dev</p>
                                   <p className="text-base font-semibold truncate mt-0.5 text-foreground">{analytics.top_contributors.most_active || "N/A"}</p>
                                 </div>
                               </div>
                               <div className="flex items-start gap-4 p-3 rounded-lg bg-background/50 border border-border/50">
                                 <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 shadow-inner">
                                   <Users className="h-6 w-6 text-blue-500" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Core Maintainers</p>
                                   <p className="text-sm truncate mt-1 text-muted-foreground">{analytics.top_contributors.core_maintainers.join(", ") || "N/A"}</p>
                                 </div>
                               </div>
                             </div>
                           </ChartCard>
                         </div>
                       </div>
                     )}
                   </div>
                 )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      {/* SESSIONS BAR */}
      <Card className="border-border/50 shadow-sm bg-card/60 backdrop-blur-xl mt-12 rounded-2xl">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 overflow-x-auto custom-scroll pb-2 mt-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap hidden md:block px-2">Recent Repos :</span>
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2">No history.</p>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => void onSelectSession(session)}
                  className={\`flex-shrink-0 flex items-center gap-3 rounded-lg border px-4 py-2 cursor-pointer transition-all hover:bg-accent/80 group \${currentSession?.id === session.id ? "border-emerald-500/50 bg-emerald-500/5 shadow-sm" : "border-border/50 bg-background/50"}\`}
                >
                  <div className="w-7 h-7 rounded bg-muted flex items-center justify-center shadow-inner">
                    <Github className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="max-w-[140px]">
                    <p className="text-xs font-bold truncate tracking-tight text-foreground">{session.repo_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{session.repo_owner}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 -mr-2 ml-1 transition-opacity" onClick={(event) => void onDeleteSession(session.id, event)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
\`;

content = content.substring(0, startIdx) + newReturnStatement + content.substring(endIdx);
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Update complete.');
