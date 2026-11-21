import { db } from '@/lib/db';
import { hashPw, setSession } from '@/lib/auth';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim().slice(0, 254);
  const company = String(body.company || '').trim().slice(0, 200);
  const password = String(body.password || '');

  if (company.length < 2) return Response.json({ error: 'Enter your business name.' }, { status: 400 });
  if (!EMAIL.test(email)) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 10) return Response.json({ error: 'Use at least 10 characters for your password.' }, { status: 400 });

  const database = await db();
  if (await database.prepare('SELECT id FROM users WHERE email=?').bind(email).first()) {
    return Response.json({ error: 'An account already exists for this email. Sign in instead.' }, { status: 409 });
  }

  const id = crypto.randomUUID();
  try {
    await database.prepare("INSERT INTO users(id,email,pass,role,company,onboarded,created) VALUES(?,?,?,'client',?,0,?)")
      .bind(id, email, await hashPw(password), company, Date.now()).run();
  } catch {
    return Response.json({ error: 'We could not create your account. Try again.' }, { status: 500 });
  }
  await setSession(id);
  return Response.json({ ok: true });
}
