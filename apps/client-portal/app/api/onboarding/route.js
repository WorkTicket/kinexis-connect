import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';
const TEXT = ['company', 'site', 'industry', 'goal'];
export async function POST(req) {
  const u = await getUser();
  if (u?.role !== 'client') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({})), sets = [], vals = [];
  for (const k of TEXT) if (typeof b[k] === 'string') { sets.push(k + '=?'); vals.push(b[k].trim().slice(0, 200)); }
  if (typeof b.ga4 === 'string') { sets.push('ga4=?'); vals.push(b.ga4.replace(/\D/g, '').slice(0, 20)); }
  if (b.finish) sets.push('onboarded=1');
  if (sets.length) await (await db()).prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).bind(...vals, u.id).run();
  return Response.json({ ok: true });
}
