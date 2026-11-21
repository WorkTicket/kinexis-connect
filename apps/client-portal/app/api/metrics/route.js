import { env } from '@/lib/db';
import { getUser, unseal } from '@/lib/auth';
import { demo } from '@/lib/demo';
import { accessToken, ga4, gsc } from '@/lib/google';
export async function GET(req) {
  const u = await getUser();
  if (!u) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const p = new URL(req.url).searchParams, range = [7, 30, 90].includes(+p.get('range')) ? +p.get('range') : 30;
  // Clients can only ever read themselves. Only team accounts may pass ?as=<client id>.
  const id = u.role === 'team' && p.get('as') ? p.get('as') : u.id, e = await env();
  const c = await e.DB.prepare("SELECT id,site,ga4,google_token FROM users WHERE id=? AND role='client'").bind(id).first();
  if (!c) return Response.json({ error: 'Not found' }, { status: 404 });
  const m = demo(c.id, range);
  if (c.google_token) {
    try {
      const tok = await accessToken(await unseal(c.google_token, e.TOKEN_KEY), e);
      const [a, s] = await Promise.allSettled([c.ga4 ? ga4(tok, c.ga4, range) : Promise.reject(), c.site ? gsc(tok, c.site, range) : Promise.reject()]);
      if (a.status === 'fulfilled') { Object.assign(m, a.value); m.live.ga4 = true; }
      if (s.status === 'fulfilled') { Object.assign(m, s.value); m.live.gsc = true; }
      if (m.live.ga4 || m.live.gsc) m.d = null; // no fake "vs previous period" on real data
    } catch {}
  }
  return Response.json(m);
}
