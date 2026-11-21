'use client';
export default function SignOut() {
  // A full page load clears every bit of client-side state, so nothing leaks between accounts.
  return <button className="btn ghost sm" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}>Sign out</button>;
}
