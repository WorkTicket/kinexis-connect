'use client';
import { useEffect, useState } from 'react';
const fmt = n => Math.round(n).toLocaleString('en-US'), sum = a => a.reduce((x, y) => x + y, 0);
function Line({ v }) {
  if (v.length < 2) return <p className="mut">Not enough data for this period yet.</p>;
  const w = 640, h = 200, mx = Math.max(...v) * 1.1 || 1, p = v.map((y, i) => [30 + i * (w - 40) / (v.length - 1), h - 20 - y / mx * (h - 40)]);
  const d = p.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
  return (<svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Sessions over time">
    {[0, .5, 1].map(t => { const y = h - 20 - t * (h - 40); return <g key={t}><line x1="30" x2={w - 10} y1={y} y2={y} stroke="var(--line)" /><text x="0" y={y + 4}>{fmt(mx * t)}</text></g>; })}
    <path d={`${d}L${p.at(-1)[0]} ${h - 20}L30 ${h - 20}Z`} fill="var(--acc)" opacity=".12" /><path d={d} fill="none" stroke="var(--acc)" strokeWidth="2.5" /></svg>);
}
const Kpi = ({ l, v, d }) => (<div className="card kpi"><small>{l}</small><div className="v">{v}</div>{d != null && <small className={d >= 0 ? 'up' : 'dn'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}% vs previous period</small>}</div>);
const Table = ({ h, rows }) => (<div style={{ overflowX: 'auto' }}><table><thead><tr>{h.map((x, i) => <th key={x} className={i ? 'n' : ''}>{x}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'n' : ''}>{c}</td>)}</tr>)}</tbody></table></div>);
const Bars = ({ list, s }) => list.map(([n, x]) => (<div key={n}><div className="row"><span>{n}</span><b>{fmt(s * x)}</b></div><div className="bar"><i style={{ width: x * 200 + '%' }} /></div></div>));
const Note = ({ live }) => !live && <p className="note">Sample data. Connect this source to see your real numbers.</p>;

export default function Dashboard({ id, viewing, name, goal, tab0 }) {
  const [tab, setTab] = useState(tab0), [range, setRange] = useState(30), [m, setM] = useState(null), [err, setErr] = useState(''), [n, setN] = useState(0);
  useEffect(() => {
    let dead = false; setM(null); setErr('');
    fetch(`/api/metrics?range=${range}${viewing ? '&as=' + id : ''}`).then(r => r.ok ? r.json() : Promise.reject()).then(d => !dead && setM(d)).catch(() => !dead && setErr('We could not load your data.'));
    return () => { dead = true; };
  }, [range, id, viewing, n]);
  function csv() {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['day,sessions\n' + m.sessions.map((v, i) => `${i + 1},${v}`).join('\n')], { type: 'text/csv' })); a.download = `sessions-${range}d.csv`; a.click();
  }
  const d = i => m?.d?.[i];
  return (<main className="wrap dashboard">
    {viewing && <div className="banner"><span>Viewing as <b>{name}</b></span><a className="btn sm ghost" href="/team">Back to clients</a></div>}
    <div className="page-heading"><div><span className="eyebrow">Performance dashboard</span><h1>{name}</h1><p className="mut">A clear view of how your digital presence is performing.{goal && <> Your focus: <b>{goal}</b>.</>}</p></div><div className="status-badge"><i /> Data overview</div></div>
    <div className="tabs"><div className="section-label">Reporting</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div className="seg">{[['overview', 'Overview'], ['search', 'Search'], ['ads', 'Ads']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="seg">{[7, 30, 90].map(r => <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r} days</button>)}</div>
        <button className="btn ghost sm" disabled={!m} onClick={csv}>Export CSV</button></div></div>
    {err && <div><p className="err" role="alert">{err}</p><button className="btn" onClick={() => setN(n + 1)}>Try again</button></div>}
    {!m && !err && <p className="mut">Loading your numbers…</p>}
    {m && tab === 'overview' && <><div className="grid g4"><Kpi l="Sessions" v={fmt(m.kpi.sessions)} d={d(0)} /><Kpi l="Users" v={fmt(m.kpi.users)} d={d(1)} /><Kpi l="Conversions" v={fmt(m.kpi.conversions)} d={d(2)} /><Kpi l="Engagement rate" v={Math.round(m.kpi.engagement * 100) + '%'} d={d(3)} /></div>
      <div className="card mt"><h3>Sessions, last {range} days</h3><Line v={m.sessions} /></div>
      <div className="grid g2 mt"><div className="card"><h3>Where visitors come from</h3><Bars list={m.sources} s={m.kpi.sessions} /></div>
        <div className="card"><h3>Devices</h3><Bars list={m.devices} s={m.kpi.sessions} /><h3 style={{ marginTop: 22 }}>Top pages</h3><Table h={['Page', 'Views']} rows={m.pages.map(p => [p[0], fmt(p[1])])} /></div></div><Note live={m.live.ga4} /></>}
    {m && tab === 'search' && <><div className="grid g4"><Kpi l="Search clicks" v={fmt(m.search.clicks)} d={d(4)} /><Kpi l="Impressions" v={fmt(m.search.impressions)} d={d(5)} /><Kpi l="Avg. CTR" v={(m.search.ctr * 100).toFixed(1) + '%'} /><Kpi l="Avg. position" v={m.search.position} /></div>
      <div className="card mt"><h3>Top search queries</h3><Table h={['Query', 'Clicks', 'Position']} rows={m.queries.map(q => [q[0], fmt(q[1]), q[2]])} /></div><Note live={m.live.gsc} /></>}
    {m && tab === 'ads' && (() => { const c = m.campaigns, sp = sum(c.map(x => x[1])), ld = sum(c.map(x => x[3])); return <><div className="grid g4"><Kpi l="Ad spend" v={'$' + fmt(sp)} d={d(6)} /><Kpi l="Clicks" v={fmt(sum(c.map(x => x[2])))} /><Kpi l="Leads" v={fmt(ld)} d={d(7)} /><Kpi l="Cost per lead" v={'$' + (sp / ld).toFixed(2)} /></div>
      <div className="card mt"><h3>Campaigns</h3><Table h={['Campaign', 'Spend', 'Clicks', 'Leads']} rows={c.map(x => [x[0], '$' + fmt(x[1]), fmt(x[2]), x[3]])} /></div><Note live={m.live.ads} /></>; })()}
  </main>);
}
