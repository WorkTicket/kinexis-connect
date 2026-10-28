"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { safeNextPath } from "@/lib/auth/paths";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message === "Invalid login credentials" ? "The email or password is incorrect." : signInError.message);
      setLoading(false);
      return;
    }
    window.location.assign(safeNextPath(searchParams.get("next"), "/app"));
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Log in to Connect" description="Open your inbox, review missed calls, and keep customer conversations moving.">
      {searchParams.get("error") && <AuthNotice tone="error">{searchParams.get("error")}</AuthNotice>}
      {searchParams.get("reset") === "success" && <AuthNotice tone="success">Your password was updated. You can log in now.</AuthNotice>}
      {error && <AuthNotice tone="error">{error}</AuthNotice>}
      <form onSubmit={submit} className="auth-form">
        <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className="auth-form__row"><Link href="/forgot-password">Forgot password?</Link></div>
        <button className="brand-button" disabled={loading}>{loading ? "Logging in…" : "Log in"}</button>
      </form>
      <p className="auth-switch">New to Connect? <Link href="/signup">Create an account</Link></p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell eyebrow="Welcome back" title="Log in to Connect" description="Loading your secure sign-in…"><div className="auth-notice auth-notice--info">Loading…</div></AuthShell>}>
      <LoginForm />
    </Suspense>
  );
}
