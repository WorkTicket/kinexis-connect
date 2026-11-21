import { cookies } from 'next/headers';
import { env } from './db';
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hmac = async (secret, use) => crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, use);

export async function hashPw(pw, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return b64(salt) + '.' + b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, k, 256));
}
export async function checkPw(pw, stored) { return (await hashPw(pw, unb64(stored.split('.')[0]))) === stored; }

const aes = async s => crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', enc.encode(s)), 'AES-GCM', false, ['encrypt', 'decrypt']);
export async function seal(text, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return b64(iv) + '.' + b64(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(secret), enc.encode(text)));
}
export async function unseal(s, secret) {
  const [i, c] = s.split('.');
  return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(i) }, await aes(secret), unb64(c)));
}

export async function setSession(id) {
  const e = await env(), p = b64(enc.encode(JSON.stringify({ id, exp: Date.now() + 7 * 864e5 })));
  const sig = b64(await crypto.subtle.sign('HMAC', await hmac(e.SESSION_SECRET, ['sign']), enc.encode(p)));
  (await cookies()).set('kx_session', p + '.' + sig, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 604800 });
}
export async function clearSession() { (await cookies()).delete('kx_session'); }

// The role always comes from the database, never from the browser.
export async function getUser() {
  const c = (await cookies()).get('kx_session')?.value; if (!c) return null;
  const [p, sig] = c.split('.'), e = await env();
  try {
    if (!(await crypto.subtle.verify('HMAC', await hmac(e.SESSION_SECRET, ['verify']), unb64(sig), enc.encode(p)))) return null;
    const { id, exp } = JSON.parse(dec.decode(unb64(p))); if (exp < Date.now()) return null;
    return await e.DB.prepare('SELECT id,email,role,company,site,industry,goal,ga4,onboarded,google_token IS NOT NULL AS google FROM users WHERE id=?').bind(id).first();
  } catch { return null; }
}
