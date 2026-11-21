'use client';
import { useState } from 'react';
import { BRAND } from '@/lib/config';
import Logo from '@/components/Logo';
export default function Login() {
  const [email, setEmail] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); setErr(d.error || 'Sign in failed. Try again.'); return; }
    window.location.href = d.role === 'team' ? '/team' : '/portal'; // the server decides where you land
  }
  return (<div className="split"><main><div className="login"><Logo /><h1>{BRAND.tagline}</h1><p className="mut login-copy">Sign in to review progress, see your results, and keep your project moving.</p>
    <form className="login-form" onSubmit={submit}>
      <div className="form-heading"><span className="eyebrow">Welcome back</span><b>Sign in to your account</b></div>
      <label htmlFor="em">Email address</label><input id="em" type="email" autoComplete="username" placeholder="you@yourbusiness.com" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="pw">Password</label><input id="pw" type="password" autoComplete="current-password" placeholder="Enter your password" required value={pw} onChange={e => setPw(e.target.value)} />
      <div className="password-help"><a href="mailto:hello@kinexisdigital.com?subject=Portal password help">Need help signing in?</a></div>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn login-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to your portal'}<span aria-hidden="true">→</span></button>
    </form><p className="note login-note">New to the portal? <a href="/register">Create an account</a></p><p className="auth-help">Need a hand? <a href={`mailto:${BRAND.support}`}>{BRAND.support}</a></p></div></main>
    <aside className="hero"><div className="hero-content"><span className="hero-kicker">Built for your business</span><h2>Clear progress.<br />Real results.</h2><p>Your website, search visibility, and lead performance—organized in one straightforward dashboard.</p></div><img src={BRAND.loginImage} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /><div className="hero-proof"><b>Websites &amp; SEO, nationwide</b><span>Simple reporting. No jargon.</span></div></aside></div>);
}
