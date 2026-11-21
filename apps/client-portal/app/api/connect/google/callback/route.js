import { cookies } from 'next/headers';
import { env } from '@/lib/db';
import { getUser, seal } from '@/lib/auth';
export async function GET(req) {
  const u = await getUser(), e = await env(), url = new URL(req.url), jar = await cookies();
  const back = n => Response.redirect(`${e.APP_URL}/portal?step=${n}`, 302);
  if (u?.role !== 'client' || !url.searchParams.get('code') || url.searchParams.get('state') !== jar.get('kx_oauth')?.value) return back(1);
  jar.delete('kx_oauth');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ code: url.searchParams.get('code'), client_id: e.GOOGLE_CLIENT_ID, client_secret: e.GOOGLE_CLIENT_SECRET, redirect_uri: e.APP_URL + '/api/connect/google/callback', grant_type: 'authorization_code' }) });
  const t = await r.json();
  if (!t.refresh_token) return back(1);
  await e.DB.prepare('UPDATE users SET google_token=? WHERE id=?').bind(await seal(t.refresh_token, e.TOKEN_KEY), u.id).run();
  return back(2);
}
