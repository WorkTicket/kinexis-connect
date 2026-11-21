const sum = a => a.reduce((x, y) => x + y, 0);
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 1e6, 7) + 1;
export function demo(id, range) {
  const r = rng(hash(id) + range); let b = 300 + r() * 300; const sessions = [];
  for (let i = 0; i < range; i++) { b += (r() - .45) * 40; sessions.push(Math.max(100, Math.round(b + Math.sin(i / 2) * 50))); }
  const s = sum(sessions);
  return { sessions, kpi: { sessions: s, users: Math.round(s * .78), conversions: Math.round(s * .034), engagement: .58 },
    sources: [['Organic search', .42], ['Direct', .24], ['Paid search', .15], ['Social', .11], ['Referral', .08]],
    devices: [['mobile', .58], ['desktop', .36], ['tablet', .06]],
    pages: [['/', .28], ['/services', .17], ['/pricing', .12], ['/blog/seo-checklist', .09], ['/contact', .07]].map(([p, x]) => [p, Math.round(s * 1.6 * x)]),
    search: { clicks: Math.round(s * .9), impressions: Math.round(s * 9.5), ctr: .044, position: 7.9 },
    queries: [['local seo services', .09, 4.2], ['website analytics dashboard', .07, 6.8], ['how to track conversions', .06, 8.1], ['google ads management', .05, 5.3], ['seo checklist 2026', .04, 3.7]].map(([q, x, p]) => [q, Math.round(s * x), p]),
    campaigns: [['Brand search', 1240, 3420, 86], ['Local services', 2310, 5120, 141], ['Retargeting', 640, 1480, 52]],
    d: Array.from({ length: 8 }, () => Math.round(r() * 24 - 6)), live: { ga4: false, gsc: false, ads: false } };
}
