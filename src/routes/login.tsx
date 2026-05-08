import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + "/admin" },
        });
        if (error) throw error;
        if (data.user) {
          // First user → grant admin (best-effort; will fail silently if not first)
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
        }
        toast.success("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-[340px] rounded border border-border bg-card p-5 shadow-sm">
        <h1 className="mb-1 text-base font-semibold">Pharmacy ERP</h1>
        <p className="mb-4 text-xs text-muted-foreground">Mohaseb 3 compatible — admin sign in</p>
        <label className="mb-2 block text-xs">
          <span className="mb-1 block text-muted-foreground">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
        </label>
        <label className="mb-3 block text-xs">
          <span className="mb-1 block text-muted-foreground">Password</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-input bg-background px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
        </label>
        <button disabled={busy} type="submit"
          className="w-full rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
