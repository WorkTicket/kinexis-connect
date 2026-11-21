import { db } from '@/lib/db';
import { checkPw, setSession } from '@/lib/auth';
export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  const u = await (await db()).prepare('SELECT id,pass,role FROM users WHERE email=?').bind(String(email || '').toLowerCase().trim()).first();
  if (!u || !(await checkPw(String(password || ''), u.pass))) return Response.json({ error: 'Wrong email or password.' }, { status: 401 });
  await setSession(u.id);
  return Response.json({ role: u.role });
}
