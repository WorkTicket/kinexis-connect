"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    createSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      if (!active) return;
      setHasSession(Boolean(data.user));
      setCheckingSession(false);
    });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setLoading(true);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error?.message ?? "Your password could not be updated.");
      if (response.status === 401) setHasSession(false);
      setLoading(false);
      return;
    }
    window.location.assign("/login?reset=success");
  }

  return (
    <AuthShell eyebrow="Account recovery" title="Choose a new password" description="Use a strong password that you do not use for another account.">
      {checkingSession ? <AuthNotice tone="info">Verifying your recovery link…</AuthNotice> : !hasSession ? <><AuthNotice tone="error">This recovery link is invalid or has expired.</AuthNotice><p className="auth-switch"><Link href="/forgot-password">Request a new recovery link</Link></p></> : <>
        {error && <AuthNotice tone="error">{error}</AuthNotice>}
        <form className="auth-form" onSubmit={submit}>
          <label>New password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} /><span className="field-hint">Use 8 to 128 characters.</span></label>
          <label>Confirm new password<input type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
          <button className="brand-button" disabled={loading}>{loading ? "Updating…" : "Update password"}</button>
        </form>
      </>}
    </AuthShell>
  );
}
