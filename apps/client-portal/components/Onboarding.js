'use client';
import { useState } from 'react';
import { GOALS } from '@/lib/config';
const INDUSTRIES = ['Retail', 'Healthcare', 'Home services', 'Professional services', 'Hospitality', 'Other'];
export default function Onboarding({ user, step0 }) {
  const [st, setSt] = useState(step0), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const [f, setF] = useState({ company: user.company || '', site: user.site || '', industry: user.industry || 'Retail', ga4: user.ga4 || '', goal: user.goal || Object.keys(GOALS)[0] });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function save(body) {
    setBusy(true); setErr('');
    const r = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) setErr('We could not save that. Try again.');
    return r.ok;
  }
  async function next() {
    if (st === 0) { if (!f.company.trim()) return setErr('Enter your business name.'); if (await save({ company: f.company, site: f.site, industry: f.industry, ga4: f.ga4 })) setSt(1); return; }
    if (st === 1) return setSt(2);
    if (st === 2) { if (await save({ goal: f.goal })) setSt(3); return; }
    if (await save({ finish: true })) window.location.href = '/portal';
  }
  return (<main className="wrap onboarding" style={{ maxWidth: 680 }}><div className="onboarding-intro"><img src="/kinexis-client-portal-assets/assets/illustrations/business-profile.svg" alt="" /><div><span className="eyebrow">Portal setup</span><h1>Let’s personalize your dashboard</h1><p className="mut">A few details now will help us show the numbers that matter most to you.</p></div></div>
    <div className="steps">{[0, 1, 2, 3].map(i => <div key={i} className={i <= st ? 'on' : ''} />)}</div>
    <div className="card">
      {st === 0 && <><h2>Tell us about your business</h2><p className="mut">This sets up your dashboard.</p>
        <label htmlFor="co">Business name</label><input id="co" required value={f.company} onChange={set('company')} />
        <label htmlFor="si">Website address</label><input id="si" placeholder="https://example.com" value={f.site} onChange={set('site')} />
        <label htmlFor="in">Industry</label><select id="in" value={f.industry} onChange={set('industry')}>{INDUSTRIES.map(x => <option key={x}>{x}</option>)}</select>
        <label htmlFor="ga">Google Analytics 4 property ID (numbers only)</label><input id="ga" inputMode="numeric" placeholder="e.g. 123456789" value={f.ga4} onChange={set('ga4')} /></>}
      {st === 1 && <><h2>Connect your data</h2><p className="mut">Connect Google to see your website and search numbers. You can do this later.</p>
        <div className="conn"><div><b>Google Analytics and Search Console</b><span className="mut">One sign-in covers both. We only request read access.</span></div>
          {user.google ? <span className="ok">Connected</span> : <a className="btn ghost" href="/api/connect/google">Connect Google</a>}</div>
        <div className="conn"><div><b>Google Ads and Meta Ads</b><span className="mut">Coming soon. Ad figures are sample data for now.</span></div></div></>}
      {st === 2 && <><h2>What matters most?</h2><p className="mut">We open your dashboard on the numbers that match your goal.</p>
        {Object.keys(GOALS).map(g => <label key={g} style={{ fontWeight: 500 }}><input type="radio" name="goal" style={{ width: 'auto', marginRight: 8 }} checked={f.goal === g} onChange={() => setF({ ...f, goal: g })} />{g}</label>)}</>}
      {st === 3 && <><h2>You&apos;re set{f.company ? ', ' + f.company : ''}</h2><p className="mut">Your portal for {f.site || 'your website'} is ready.</p></>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="row" style={{ marginTop: 22 }}><button className="btn ghost" disabled={!st || busy} onClick={() => setSt(st - 1)}>Back</button>
        <button className="btn" disabled={busy} onClick={next}>{st === 3 ? 'Open my dashboard' : 'Continue'}</button></div>
    </div></main>);
}
