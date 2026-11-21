// node scripts/seed.mjs team@kinexis.com 'YourPassword' > seed.sql
const [email, pw] = process.argv.slice(2);
if (!email || !pw) { console.error('Usage: node scripts/seed.mjs <email> <password>'); process.exit(1); }
const b64 = b => Buffer.from(b).toString('base64url');
const salt = crypto.getRandomValues(new Uint8Array(16));
const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, k, 256);
console.log(`INSERT INTO users(id,email,pass,role,onboarded,created) VALUES('${crypto.randomUUID()}','${email.toLowerCase().replace(/'/g, '')}','${b64(salt)}.${b64(bits)}','team',1,${Date.now()});`);
