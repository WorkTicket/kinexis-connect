"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { createSupabaseRecoveryRequestClient } from "@/lib/db/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    setLinkError(new URLSearchParams(window.location.search).get("error") ?? "");
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const { error: resetError } = await createSupabaseRecoveryRequestClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Reset your password" description="We’ll email you a secure link to choose a new password.">
      {linkError && <AuthNotice tone="error">{linkError}</AuthNotice>}
      {sent ? <AuthNotice tone="success">If an account exists for <strong>{email}</strong>, a reset link is on its way.</AuthNotice> : (
        <>
          {error && <AuthNotice tone="error">{error}</AuthNotice>}
          <form className="auth-form" onSubmit={submit}>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <button className="brand-button" disabled={loading}>{loading ? "Sending…" : "Send reset link"}</button>
          </form>
        </>
      )}
      <p className="auth-switch"><Link href="/login">Back to login</Link></p>
    </AuthShell>
  );
}
