import { db } from '@/lib/db';
import { getUser, hashPw } from '@/lib/auth';
export async function POST(req) {
  const u = await getUser();
  if (u?.role !== 'team') return Response.json({ error: 'Forbidden' }, { status: 403 });
  const { email, company } = await req.json().catch(() => ({})), em = String(email || '').toLowerCase().trim();
  if (!/\S+@\S+\.\S+/.test(em)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  const pw = crypto.randomUUID().slice(0, 13);
  try {
    await (await db()).prepare("INSERT INTO users(id,email,pass,role,company,created) VALUES(?,?,?,'client',?,?)")
      .bind(crypto.randomUUID(), em, await hashPw(pw), String(company || '').trim().slice(0, 200) || null, Date.now()).run();
  } catch { return Response.json({ error: 'That email already has an account.' }, { status: 409 }); }
  return Response.json({ email: em, password: pw });
}
