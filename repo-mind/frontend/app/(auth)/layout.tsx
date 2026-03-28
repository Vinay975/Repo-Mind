"use client";

import Link from "next/link";
import { Terminal, FileText, BookOpen, BarChart2, Star, GitFork, Sparkles, Zap, Shield, Code2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const FLOATING_ICONS = [
  { icon: FileText,  color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20",  top: "8%",   left: "8%",   delay: "0s",    dur: "3s"   },
  { icon: BookOpen,  color: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20",  top: "20%",  left: "75%",  delay: "0.5s",  dur: "3.5s" },
  { icon: BarChart2, color: "text-purple-400",  bg: "bg-purple-500/10",  border: "border-purple-500/20",  top: "60%",  left: "5%",   delay: "1s",    dur: "4s"   },
  { icon: Star,      color: "text-fuchsia-400", bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/20", top: "75%",  left: "80%",  delay: "1.5s",  dur: "2.8s" },
  { icon: Zap,       color: "text-violet-300",  bg: "bg-violet-500/8",   border: "border-violet-500/15",  top: "40%",  left: "88%",  delay: "0.8s",  dur: "3.2s" },
  { icon: Shield,    color: "text-indigo-300",  bg: "bg-indigo-500/8",   border: "border-indigo-500/15",  top: "85%",  left: "30%",  delay: "2s",    dur: "3.8s" },
  { icon: Code2,     color: "text-purple-300",  bg: "bg-purple-500/8",   border: "border-purple-500/15",  top: "15%",  left: "45%",  delay: "1.2s",  dur: "4.2s" },
  { icon: GitFork,   color: "text-fuchsia-300", bg: "bg-fuchsia-500/8",  border: "border-fuchsia-500/15", top: "50%",  left: "60%",  delay: "0.3s",  dur: "3.6s" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Left panel — branding + animation ── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-background border-r border-border">
        {/* grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

        {/* ambient glows */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-2xl" />

        {/* floating icons */}
        {FLOATING_ICONS.map((item, i) => (
          <div
            key={i}
            className={`absolute w-10 h-10 rounded-xl ${item.bg} border ${item.border} flex items-center justify-center`}
            style={{
              top: item.top,
              left: item.left,
              animation: `float ${item.dur} ease-in-out infinite`,
              animationDelay: item.delay,
            }}
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
          </div>
        ))}

        {/* logo */}
        <div className="relative z-10 p-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/40">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">RepoMind</span>
          </Link>
        </div>

        {/* center content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-12 text-center">
          {/* rotating ring */}
          <div className="relative w-40 h-40 mb-10">
            <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-spin" style={{ animationDuration: "12s" }} />
            <div className="absolute inset-3 rounded-full border border-dashed border-indigo-500/20 animate-spin" style={{ animationDuration: "18s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-violet-500/15 animate-ping" style={{ animationDuration: "2.5s" }} />
                <div className="w-16 h-16 rounded-2xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
              </div>
            </div>
            {[0, 90, 180, 270].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const r = 68;
              const icons = [FileText, BookOpen, BarChart2, Star];
              const colors = ["text-violet-400", "text-indigo-400", "text-purple-400", "text-fuchsia-400"];
              const bgs = ["bg-violet-500/15", "bg-indigo-500/15", "bg-purple-500/15", "bg-fuchsia-500/15"];
              const Icon = icons[i];
              return (
                <div key={i}
                  className={`absolute w-9 h-9 rounded-xl ${bgs[i]} border border-white/10 flex items-center justify-center`}
                  style={{
                    left: `calc(50% + ${Math.cos(rad) * r}px - 18px)`,
                    top: `calc(50% + ${Math.sin(rad) * r}px - 18px)`,
                  }}>
                  <Icon className={`w-4 h-4 ${colors[i]}`} />
                </div>
              );
            })}
          </div>

          <h2 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Repository Intelligence<br />
            <span className="text-gradient">Powered by AI</span>
          </h2>
          <p className="text-sm text-white/50 max-w-xs leading-relaxed">
            Generate READMEs, documentation, and contributor insights for any GitHub repository — instantly.
          </p>

          {/* feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {["README Generator", "Docs Builder", "Contributor Insights", "Version History", "GitHub Push"].map((f) => (
              <span key={f} className="text-[11px] font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* bottom */}
        <div className="relative z-10 p-8 text-center">
          <p className="text-xs text-white/30">© 2024 RepoMind. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* topbar */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-border/50">
          {/* mobile logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">RepoMind</span>
          </Link>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </div>

        {/* form area */}
        <div className="flex-1 flex items-center justify-center p-6">
          {children}
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}
