import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";
import { toast } from "sonner";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Log in — JarWise" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lockUntil <= now) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockUntil, now]);

  const locked = lockUntil > now;
  const secondsLeft = locked ? Math.ceil((lockUntil - now) / 1000) : 0;

  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [authLoading, user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (locked) return;
    const cleanEmail = email.trim();
    const cleanPassword = password;
    if (/<[^>]*>/.test(cleanEmail) || /<script/i.test(cleanPassword)) {
      return toast.error("Invalid characters in input.");
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
    setLoading(false);
    if (error) {
      const next = failed + 1;
      setFailed(next);
      if (next >= 5) {
        setLockUntil(Date.now() + 30_000);
        setFailed(0);
        return toast.error(t("auth.tooManyAttempts"));
      }
      return toast.error(error.message);
    }
    setFailed(0);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (result.error) toast.error(result.error.message || "Google sign-in failed");
    if (!result.redirected && !result.error) navigate({ to: "/dashboard" });
  }

  if (authLoading || user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to keep growing your jars.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot?</Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <Button type="submit" className="w-full" disabled={loading || locked}>
          {locked ? `${t("auth.tooManyAttempts")} (${secondsLeft}s)` : loading ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
      </div>
      <Button variant="outline" className="w-full" onClick={onGoogle}>Continue with Google</Button>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
      </p>
    </AuthShell>
  );
}