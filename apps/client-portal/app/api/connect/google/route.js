import { cookies } from 'next/headers';
import { env } from '@/lib/db';
import { getUser } from '@/lib/auth';
export async function GET() {
  const u = await getUser(), e = await env();
  if (u?.role !== 'client') return Response.redirect(e.APP_URL + '/login', 302);
  const state = crypto.randomUUID();
  (await cookies()).set('kx_oauth', state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
  const q = new URLSearchParams({ client_id: e.GOOGLE_CLIENT_ID, redirect_uri: e.APP_URL + '/api/connect/google/callback', response_type: 'code', access_type: 'offline', prompt: 'consent', state,
    scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly' });
  return Response.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + q, 302);
}
