"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
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
  const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);

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

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setIsForgotLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      setResetStep("code");
      toast({ title: "Code sent!", description: `Check ${forgotEmail} for your 6-digit code.`, variant: "success" });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Could not send code", variant: "destructive" });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode) return;
    setIsForgotLoading(true);
    try {
      await api.verifyResetCode(forgotEmail, resetCode);
      setResetStep("password");
    } catch (error) {
      toast({ title: "Invalid code", description: error instanceof Error ? error.message : "Code is wrong or expired", variant: "destructive" });
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setIsForgotLoading(true);
    try {
      await api.resetPassword(forgotEmail, resetCode, newPassword);
      toast({ title: "Password reset!", description: "You can now sign in with your new password.", variant: "success" });
      setShowForgot(false);
      setResetStep("email");
      setForgotEmail("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({ title: "Reset failed", description: error instanceof Error ? error.message : "Could not reset password", variant: "destructive" });
    } finally {
      setIsForgotLoading(false);
    }
  };

  if (showForgot) {
    const stepTitles = {
      email: { title: "Forgot password?", sub: "Enter your email and we'll send you a 6-digit code." },
      code: { title: "Enter reset code", sub: `We sent a 6-digit code to ${forgotEmail}` },
      password: { title: "Create new password", sub: "Choose a strong password for your account." },
    };

    return (
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <button
            onClick={() => {
              if (resetStep === "code") { setResetStep("email"); return; }
              if (resetStep === "password") { setResetStep("code"); return; }
              setShowForgot(false); setResetStep("email");
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-5">
            {(["email", "code", "password"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  resetStep === s ? "bg-violet-500 text-white" :
                  ["email", "code", "password"].indexOf(resetStep) > i ? "bg-violet-500/20 text-violet-500" :
                  "bg-muted text-muted-foreground"
                }`}>{i + 1}</div>
                {i < 2 && <div className={`h-px w-8 transition-all ${["email", "code", "password"].indexOf(resetStep) > i ? "bg-violet-500/40" : "bg-border"}`} />}
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-extrabold text-foreground mb-1">{stepTitles[resetStep].title}</h1>
          <p className="text-sm text-muted-foreground">{stepTitles[resetStep].sub}</p>
        </div>

        {/* Step 1 – Email */}
        {resetStep === "email" && (
          <form onSubmit={handleForgotEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" required placeholder="you@example.com"
                  value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all" />
              </div>
            </div>
            <button type="submit" disabled={isForgotLoading}
              className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
              {isForgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : <>Send code <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* Step 2 – OTP code */}
        {resetStep === "code" && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">6-digit code</label>
              <input type="text" required maxLength={6} placeholder="123456"
                value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground text-center tracking-[0.4em] font-mono placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all" />
              <p className="text-xs text-muted-foreground">Didn't receive it?{" "}
                <button type="button" onClick={handleForgotEmail} className="text-violet-500 hover:text-violet-400 font-medium">Resend</button>
              </p>
            </div>
            <button type="submit" disabled={isForgotLoading || resetCode.length < 6}
              className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
              {isForgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : <>Verify code <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        )}

        {/* Step 3 – New password */}
        {resetStep === "password" && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">New password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showNewPassword ? "text" : "password"} required minLength={6}
                  placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-11 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all" />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type={showNewPassword ? "text" : "password"} required minLength={6}
                  placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-background text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-violet-500/30 transition-all ${
                    confirmPassword && newPassword !== confirmPassword ? "border-red-500/60 focus:border-red-500/60" : "border-border focus:border-violet-500/50"
                  }`} />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">Passwords don't match</p>
              )}
            </div>
            <button type="submit" disabled={isForgotLoading || newPassword !== confirmPassword}
              className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-2 disabled:opacity-50">
              {isForgotLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Resetting...</> : <>Reset password <ArrowRight className="w-4 h-4" /></>}
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
