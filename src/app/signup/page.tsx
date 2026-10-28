"use client";
import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, business_name: business },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.session) {
      window.location.assign("/onboarding");
      return;
    }
    setSuccess(true);
    setLoading(false);
  }

  return (
    <AuthShell eyebrow="Get started" title="Turn missed calls into conversations" description="Create your account, choose a plan, and connect your business phone.">
      {success ? (
        <div className="auth-success">
          <Image src="/assets/connect/onboarding/verify-email.svg" alt="Email verification sent" width={480} height={360} />
          <AuthNotice tone="success"><strong>Check your email.</strong><br />Use the verification link we sent to finish setting up your business.</AuthNotice>
        </div>
      ) : (
        <>
          {error && <AuthNotice tone="error">{error}</AuthNotice>}
          <form onSubmit={submit} className="auth-form">
            <label>Full name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label>Business name<input autoComplete="organization" required value={business} onChange={(event) => setBusiness(event.target.value)} /></label>
            <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /><span className="field-hint">Use at least 8 characters.</span></label>
            <button className="brand-button" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button>
          </form>
          <p className="auth-legal">By continuing, you agree to the <Link href="/terms">Terms</Link>, <Link href="/privacy">Privacy Policy</Link>, and <Link href="/sms-policy">SMS Policy</Link>.</p>
        </>
      )}
      <p className="auth-switch">Already have an account? <Link href="/login">Log in</Link></p>
    </AuthShell>
  );
}
