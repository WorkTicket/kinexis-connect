'use client';
import { useState } from 'react';
export default function NewClient() {
  const [f, setF] = useState({ email: '', company: '' }), [msg, setMsg] = useState(null), [err, setErr] = useState('');
  async function add(e) {
    e.preventDefault(); setErr(''); setMsg(null);
    const r = await fetch('/api/team/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }), d = await r.json();
    if (!r.ok) return setErr(d.error);
    setMsg(d); setF({ email: '', company: '' });
  }
  return (<form onSubmit={add} style={{ marginTop: 18 }}><h3>Add a client</h3>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      <input aria-label="Business name" placeholder="Business name" style={{ maxWidth: 220 }} value={f.company} onChange={e => setF({ ...f, company: e.target.value })} />
      <input aria-label="Client email" type="email" required placeholder="client@company.com" style={{ maxWidth: 280 }} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
      <button className="btn">Create account</button></div>
    {err && <p className="err" role="alert">{err}</p>}
    {msg && <p className="banner mt">Send {msg.email} this temporary password: <b>{msg.password}</b>. It is shown once. Refresh the page to see them in the list.</p>}
  </form>);
}
