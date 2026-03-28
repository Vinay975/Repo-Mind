"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Lock, Loader2, ArrowRight, Eye, EyeOff, Terminal } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing credentials", description: "Please enter both email and password.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast({ title: "Welcome back!", description: "You have successfully logged in.", variant: "success" });
      router.push("/dashboard");
    } catch (error) {
      toast({ title: "Login failed", description: error instanceof Error ? error.message : "Invalid credentials", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    toast({ title: "Reset link sent", description: `Check ${forgotEmail} for a password reset link.` });
  };

  if (showForgot) {
    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to sign in
          </button>
          <h1 className="text-2xl font-extrabold text-foreground mb-1">Forgot password?</h1>
          <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
        </div>

        {forgotSent ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Mail className="w-7 h-7 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Check your inbox</p>
              <p className="text-sm text-muted-foreground mt-1">We sent a reset link to <span className="text-violet-500 font-medium">{forgotEmail}</span></p>
            </div>
            <button onClick={() => { setShowForgot(false); setForgotSent(false); }}
              className="text-sm text-violet-500 hover:text-violet-400 font-medium transition-colors">
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email" required
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                />
              </div>
            </div>
            <button type="submit"
              className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2">
              Send reset link <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">RepoMind</span>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="email" type="email" required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Password</label>
            <button type="button" onClick={() => setShowForgot(true)}
              className="text-xs text-violet-500 hover:text-violet-400 font-medium transition-colors">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="password" type={showPassword ? "text" : "password"} required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 pl-10 pr-11 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all disabled:opacity-50"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading}
          className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-600 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2 group mt-2">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</>
            : <>Sign In <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
          }
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <p className="text-sm text-center text-muted-foreground">
        Don't have an account?{" "}
        <Link href="/register" className="text-violet-500 hover:text-violet-400 font-semibold transition-colors">
          Create one free
        </Link>
      </p>
    </div>
  );
}
