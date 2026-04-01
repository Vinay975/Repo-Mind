"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/lib/store";
import {
  ArrowRight, Terminal, FileText, BookOpen, BarChart2,
  Star, GitFork, Zap, Shield, Code2, CheckCircle2,
  Github, Sparkles, ChevronRight, Users, GitBranch,
  Download, RefreshCw, Eye,
} from "lucide-react";

const NAV_LINKS = ["Features", "How it works", "Pricing"];

const FEATURES = [
  {
    icon: FileText,
    title: "README Generator",
    desc: "AI analyzes your entire codebase — structure, tech stack, dependencies — and crafts a professional README in seconds.",
    points: ["Auto-detected tech stack", "Custom AI instructions", "Badge generation", "Version history"],
    color: "violet",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    border: "hover:border-violet-500/40",
    glow: "group-hover:shadow-violet-500/10",
  },
  {
    icon: BookOpen,
    title: "Documentation Builder",
    desc: "Generate comprehensive project summaries, architecture overviews, and license files that stay in sync with your code.",
    points: ["Project summary docs", "License generation", "Architecture diagrams", "Markdown & PDF export"],
    color: "indigo",
    iconBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    iconColor: "text-indigo-500",
    border: "hover:border-indigo-500/40",
    glow: "group-hover:shadow-indigo-500/10",
  },
  {
    icon: BarChart2,
    title: "Contributor Insights",
    desc: "Deep analytics on contributor activity, commit velocity, PR patterns, and team dynamics over any time horizon.",
    points: ["Commit activity charts", "Contributor breakdown", "PR & issue metrics", "Rolling time windows"],
    color: "purple",
    iconBg: "bg-purple-500/10 dark:bg-purple-500/15",
    iconColor: "text-purple-500",
    border: "hover:border-purple-500/40",
    glow: "group-hover:shadow-purple-500/10",
  },
];

const STEPS = [
  { n: "01", title: "Connect a Repository", desc: "Paste any public GitHub URL. RepoMind maps the file structure, tech stack, branches, and metadata instantly.", icon: Github },
  { n: "02", title: "Choose a Workspace Tool", desc: "Select README Generator, Documentation Builder, or Contributor Insights from the sidebar.", icon: Zap },
  { n: "03", title: "Generate & Customize", desc: "AI generates content in seconds. Edit inline, add custom instructions, and save versioned drafts.", icon: Sparkles },
  { n: "04", title: "Export or Push to GitHub", desc: "Download as Markdown or PDF, or push directly to your repository via GitHub API with one click.", icon: GitBranch },
];

const STATS = [
  { value: "10x", label: "Faster documentation" },
  { value: "100%", label: "AI-powered analysis" },
  { value: "∞", label: "Version history" },
  { value: "3", label: "Workspace tools" },
];

const TESTIMONIALS = [
  { name: "Sarah K.", role: "Senior Engineer", text: "RepoMind cut our onboarding docs time from 2 days to 20 minutes. The README quality is genuinely impressive.", avatar: "S" },
  { name: "Marcus T.", role: "Open Source Maintainer", text: "I maintain 12 repos. RepoMind keeps all my documentation fresh without me lifting a finger.", avatar: "M" },
  { name: "Priya R.", role: "Engineering Manager", text: "The contributor insights helped us identify burnout risks early. Invaluable for team health.", avatar: "P" },
];

const LANG_COLORS = ["bg-violet-500", "bg-indigo-500", "bg-purple-500", "bg-fuchsia-500", "bg-blue-500"];

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => { if (!isLoading && isAuthenticated) router.push("/dashboard"); }, [isAuthenticated, isLoading, router]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center shadow-md shadow-violet-500/30">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">RepoMind</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                {l}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
              Sign in
            </Link>
            <Link href="/register"
              className="h-9 px-4 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all shadow-md shadow-violet-500/25 flex items-center gap-1.5">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* bg glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-violet-500/8 dark:bg-violet-500/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/6 rounded-full blur-3xl pointer-events-none" />

        {/* grid */}
        <div className="absolute inset-0 bg-grid opacity-50 dark:opacity-30 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-6 tracking-wide">
            <Zap className="w-3 h-3 fill-current" /> AI-Powered Repository Intelligence
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-[1.05]">
            Turn any GitHub repo into<br />
            <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              living documentation
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            RepoMind uses AI to generate professional READMEs, rich documentation, and deep contributor analytics for any public GitHub repository — in seconds.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/register"
              className="h-12 px-8 rounded-xl bg-violet-500 hover:bg-violet-600 active:scale-[0.98] text-white font-semibold transition-all shadow-xl shadow-violet-500/30 flex items-center gap-2 group text-sm">
              <Sparkles className="w-4 h-4" />
              Start for free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/login"
              className="h-12 px-8 rounded-xl border border-border bg-card hover:bg-secondary text-foreground font-semibold transition-all flex items-center gap-2 text-sm">
              <Github className="w-4 h-4" /> Sign in
            </Link>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-extrabold text-gradient">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Hero mockup */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* window chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/50">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                <div className="w-3 h-3 rounded-full bg-green-400/70" />
                <div className="flex-1 mx-4">
                  <div className="h-6 rounded-md bg-background/60 border border-border flex items-center px-3 gap-2">
                    <Github className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">repomind.app/dashboard</span>
                  </div>
                </div>
              </div>
              {/* mock content */}
              <div className="grid grid-cols-4 h-64">
                {/* sidebar */}
                <div className="col-span-1 border-r border-border bg-card/50 p-3 space-y-1">
                  {[
                    { icon: Terminal, label: "Dashboard", active: false },
                    { icon: FileText, label: "README", active: true },
                    { icon: BookOpen, label: "Docs", active: false },
                    { icon: BarChart2, label: "Insights", active: false },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium ${item.active ? "bg-violet-500/10 text-violet-500" : "text-muted-foreground"}`}>
                      <item.icon className="w-3.5 h-3.5" />{item.label}
                    </div>
                  ))}
                </div>
                {/* main */}
                <div className="col-span-3 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-32 rounded bg-violet-500/20" />
                    <div className="h-7 w-24 rounded-lg bg-violet-500/20" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-border/60" />
                    <div className="h-3 w-4/5 rounded bg-border/60" />
                    <div className="h-3 w-3/5 rounded bg-border/60" />
                  </div>
                  <div className="h-px bg-border" />
                  <div className="space-y-1.5">
                    {["# RepoMind", "## Installation", "```bash", "npm install repomind", "```"].map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground/40 w-4 text-right">{i + 1}</span>
                        <span className={`text-[11px] font-mono ${line.startsWith("#") ? "text-violet-400 font-bold" : line.startsWith("```") ? "text-indigo-400" : "text-foreground"}`}>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-4">
              <Sparkles className="w-3 h-3" /> Core Features
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Everything your repo needs</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">Three powerful AI tools that work together to keep your repository documentation professional, accurate, and always up to date.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title}
                className={`group relative flex flex-col p-7 rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${f.border} ${f.glow}`}>
                <div className={`absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-${f.color}-500/10 to-transparent pointer-events-none`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-2xl ${f.iconBg} border border-border/50 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                    <f.icon className={`w-6 h-6 ${f.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${f.iconColor}`} />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24 bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-4">
              <Zap className="w-3 h-3" /> How it works
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">From URL to docs in 4 steps</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">No setup, no configuration. Just paste a GitHub URL and let RepoMind do the rest.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative flex flex-col p-6 rounded-2xl border border-border bg-card hover:border-violet-500/30 transition-all duration-200 hover:shadow-lg">
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-3 z-10">
                    <ChevronRight className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-extrabold text-violet-500/20 leading-none">{step.n}</span>
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <step.icon className="w-4 h-4 text-violet-500" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-4">
              <Users className="w-3 h-3" /> Testimonials
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Loved by developers</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">Join thousands of engineers who use RepoMind to keep their repositories professional.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="flex flex-col p-6 rounded-2xl border border-border bg-card hover:border-violet-500/30 transition-all hover:shadow-lg">
                <div className="flex mb-3 gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-violet-500 text-violet-500" />)}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-violet-500/20">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 bg-secondary/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-4">
              <Shield className="w-3 h-3" /> Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-base">Start free. No credit card required.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                name: "Free", price: "$0", period: "forever",
                desc: "Perfect for personal projects and open source.",
                features: ["5 repositories", "README generation", "Basic documentation", "Community support"],
                cta: "Get started free", href: "/register", highlight: false,
              },
              {
                name: "Pro", price: "$12", period: "per month",
                desc: "For professional developers and small teams.",
                features: ["Unlimited repositories", "All workspace tools", "GitHub push integration", "Version history", "Priority support"],
                cta: "Start Pro trial", href: "/register", highlight: true,
              },
              {
                name: "Team", price: "$39", period: "per month",
                desc: "For engineering teams that need collaboration.",
                features: ["Everything in Pro", "Team workspaces", "Advanced analytics", "SSO & audit logs", "Dedicated support"],
                cta: "Contact sales", href: "/register", highlight: false,
              },
            ].map((plan) => (
              <div key={plan.name}
                className={`relative flex flex-col p-7 rounded-2xl border transition-all duration-200 ${
                  plan.highlight
                    ? "border-violet-500/60 bg-card shadow-2xl shadow-violet-500/10 ring-1 ring-violet-500/20 scale-[1.02]"
                    : "border-border bg-card hover:border-violet-500/30 hover:shadow-lg"
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white bg-violet-500 px-3 py-1 rounded-full shadow-md shadow-violet-500/30">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-muted-foreground mb-1">{plan.name}</p>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-4xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground mb-1">/{plan.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{plan.desc}</p>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}
                  className={`flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlight
                      ? "bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                      : "border border-border hover:bg-secondary text-foreground"
                  }`}>
                  {plan.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/8 via-indigo-500/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-violet-500/30">
            <Terminal className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
            Ready to document smarter?
          </h2>
          <p className="text-muted-foreground text-base mb-8 max-w-lg mx-auto leading-relaxed">
            Join thousands of developers who use RepoMind to keep their repositories professional, documented, and insightful.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register"
              className="h-12 px-8 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold transition-all shadow-xl shadow-violet-500/30 flex items-center gap-2 text-sm group">
              <Sparkles className="w-4 h-4" />
              Get started free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="/login"
              className="h-12 px-8 rounded-xl border border-border hover:bg-secondary text-foreground font-semibold transition-all flex items-center gap-2 text-sm">
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground">RepoMind</span>
            <span className="text-xs text-muted-foreground ml-2">© 2024 All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            {["Privacy Policy", "Terms of Service", "Contact"].map((l) => (
              <a key={l} href="#" className="hover:text-foreground transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
