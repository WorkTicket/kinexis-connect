'use client';
import { useState } from 'react';
import Logo from '@/components/Logo';
import { BRAND } from '@/lib/config';

export default function Register() {
  const [form, setForm] = useState({ company: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const set = key => event => setForm({ ...form, [key]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    setErr('');
    if (form.password !== form.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setBusy(false); setErr(data.error || 'We could not create your account.'); return; }
    window.location.href = '/portal';
  }

  return (<div className="split"><main><div className="login register"><Logo /><h1>Create your client portal account.</h1><p className="mut login-copy">Set up secure access, then tell us about your business so we can personalize your dashboard.</p>
    <form className="login-form" onSubmit={submit}>
      <div className="form-heading"><span className="eyebrow">Get started</span><b>Your account details</b></div>
      <label htmlFor="company">Business name</label><input id="company" autoComplete="organization" required minLength="2" placeholder="Your business name" value={form.company} onChange={set('company')} />
      <label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" required placeholder="you@yourbusiness.com" value={form.email} onChange={set('email')} />
      <label htmlFor="password">Create password</label><input id="password" type="password" autoComplete="new-password" required minLength="10" placeholder="At least 10 characters" value={form.password} onChange={set('password')} />
      <label htmlFor="confirm">Confirm password</label><input id="confirm" type="password" autoComplete="new-password" required minLength="10" placeholder="Enter it again" value={form.confirm} onChange={set('confirm')} />
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn login-button" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'}<span aria-hidden="true">→</span></button>
    </form><p className="note login-note">Already have an account? <a href="/login">Sign in</a></p><p className="auth-terms">By creating an account, you agree to use the portal for your Kinexis services.</p></div></main>
    <aside className="hero"><div className="hero-content"><span className="hero-kicker">Your next step</span><h2>One place.<br />Zero guesswork.</h2><p>Finish your business profile, connect your data, and see the results Kinexis is driving.</p></div><img src={BRAND.loginImage} alt="" /><div className="hero-proof"><b>Secure client access</b><span>Your account information stays private.</span></div></aside></div>);
}
