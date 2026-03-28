"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { Mail, Lock, User, Loader2, ArrowRight, Eye, EyeOff, Terminal, CheckCircle2, Circle } from "lucide-react";

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "bg-red-500" };
  if (score <= 3) return { score, label: "Fair",   color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Good",   color: "bg-indigo-500" };
  return              { score, label: "Strong", color: "bg-violet-500" };
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);

  const requirements = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "One uppercase letter",  met: /[A-Z]/.test(password) },
    { label: "One number",            met: /[0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await register(email, username, password);
      toast({ title: "Account created!", description: "Welcome to RepoMind!", variant: "success" });
      router.push("/dashboard");
    } catch (error) {
      toast({ title: "Registration failed", description: error instanceof Error ? error.message : "Could not create account", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="mb-7">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-foreground">RepoMind</span>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-1">Create your account</h1>
        <p className="text-sm text-muted-foreground">Get started with RepoMind for free</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Username</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="username" type="text" required minLength={3}
              placeholder="johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all disabled:opacity-50"
            />
          </div>
        </div>

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
          <label className="text-sm font-medium text-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="password" type={showPassword ? "text" : "password"} required minLength={6}
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

          {/* Strength bar */}
          {password && (
            <div className="space-y-2 pt-1">
              <div className="flex gap-1">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : "bg-border"}`} />
                ))}
                <span className={`text-[10px] font-semibold ml-1 ${strength.score <= 1 ? "text-red-500" : strength.score <= 3 ? "text-yellow-500" : strength.score <= 4 ? "text-indigo-500" : "text-violet-500"}`}>
                  {strength.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {requirements.map((r) => (
                  <span key={r.label} className={`flex items-center gap-1 text-[10px] transition-colors ${r.met ? "text-violet-500" : "text-muted-foreground"}`}>
                    {r.met ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                    {r.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Confirm password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              id="confirmPassword" type={showConfirm ? "text" : "password"} required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className={`w-full h-11 pl-10 pr-11 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 transition-all disabled:opacity-50 ${
                confirmPassword && confirmPassword !== password
                  ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                  : confirmPassword && confirmPassword === password
                  ? "border-violet-500/50"
                  : "border-border focus:border-violet-500/50"
              }`}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && confirmPassword !== password && (
            <p className="text-[11px] text-red-500">Passwords do not match</p>
          )}
        </div>

        {/* Submit */}
        <button type="submit" disabled={isLoading}
          className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-600 active:scale-[0.98] text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 flex items-center justify-center gap-2 group mt-2">
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account...</>
            : <>Create Account <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>
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
        Already have an account?{" "}
        <Link href="/login" className="text-violet-500 hover:text-violet-400 font-semibold transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
