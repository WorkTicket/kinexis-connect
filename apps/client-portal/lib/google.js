const sum = a => a.reduce((x, y) => x + y, 0);
const iso = d => new Date(Date.now() - d * 864e5).toISOString().slice(0, 10);
export async function accessToken(refresh, e) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: e.GOOGLE_CLIENT_ID, client_secret: e.GOOGLE_CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }) });
  if (!r.ok) throw new Error('token');
  return (await r.json()).access_token;
}
export async function ga4(tok, prop, range) {
  const dr = [{ startDate: `${range}daysAgo`, endDate: 'today' }], N = name => ({ name });
  const rep = (dims, mets, x = {}) => ({ dateRanges: dr, dimensions: dims.map(N), metrics: mets.map(N), ...x });
  const top = m => ({ orderBys: [{ metric: { metricName: m }, desc: true }], limit: 5 });
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${prop}:batchRunReports`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [rep(['date'], ['sessions'], { orderBys: [{ dimension: { dimensionName: 'date' } }] }), rep([], ['sessions', 'totalUsers', 'keyEvents', 'engagementRate']),
      rep(['sessionDefaultChannelGroup'], ['sessions'], top('sessions')), rep(['deviceCategory'], ['sessions']), rep(['pagePath'], ['screenPageViews'], top('screenPageViews'))] }) });
  if (!r.ok) throw new Error('ga4 ' + r.status);
  const [a, t, c, dv, p] = (await r.json()).reports, rows = x => x.rows || [], dim = w => w.dimensionValues[0].value, met = (w, i = 0) => +w.metricValues[i].value;
  const share = x => { const T = sum(rows(x).map(w => met(w))) || 1; return rows(x).map(w => [dim(w), met(w) / T]); };
  const sessions = rows(a).map(w => met(w)), tot = rows(t)[0];
  return { sessions, kpi: { sessions: sum(sessions), users: tot ? met(tot, 1) : 0, conversions: tot ? met(tot, 2) : 0, engagement: tot ? met(tot, 3) : 0 }, sources: share(c), devices: share(dv), pages: rows(p).map(w => [dim(w), met(w)]) };
}
export async function gsc(tok, site, range) {
  const prop = site.startsWith('sc-domain:') ? site : (/^https?:\/\//.test(site) ? site : 'https://' + site).replace(/\/*$/, '/');
  const q = body => fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(prop)}/searchAnalytics/query`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ startDate: iso(range), endDate: iso(1), ...body }) })
    .then(r => { if (!r.ok) throw new Error('gsc ' + r.status); return r.json(); });
  const [t, qs] = await Promise.all([q({}), q({ dimensions: ['query'], rowLimit: 5 })]), x = t.rows?.[0] || {};
  return { search: { clicks: x.clicks ?? 0, impressions: x.impressions ?? 0, ctr: x.ctr ?? 0, position: +(x.position ?? 0).toFixed(1) }, queries: (qs.rows || []).map(w => [w.keys[0], w.clicks, +w.position.toFixed(1)]) };
}
