# Kinexis Client Portal (Next.js on Cloudflare)

Stack: Next.js 15 (App Router) + OpenNext for Cloudflare Workers + D1 (SQLite) database. No other services needed.

## Run locally
1. `npm install`
2. `copy .dev.vars.example .dev.vars` (Windows) and fill in the secrets (see below).
3. `npx wrangler d1 create kinexis` and paste the `database_id` into `wrangler.jsonc`.
4. `npx wrangler d1 execute kinexis --local --file=schema.sql`
5. `node scripts/seed.mjs team@kinexis.com "YourPassword" > seed.sql` then `npx wrangler d1 execute kinexis --local --file=seed.sql`
6. `npm run dev` and open http://localhost:3000. Sign in as the team user, add a client, copy its temporary password, sign out, sign in as the client.

Clients can also create their own account at `/register`. Registration signs them in and sends them directly through portal onboarding.

## Google connection (GA4 + Search Console)
1. Google Cloud Console: create a project, enable "Google Analytics Data API" and "Google Search Console API".
2. OAuth consent screen: add scopes `analytics.readonly` and `webmasters.readonly`. While in "Testing" mode add each client's Google email as a test user. Publishing to everyone requires Google's app verification.
3. Credentials > OAuth client ID (Web). Authorized redirect URIs: `http://localhost:3000/api/connect/google/callback` and `https://YOUR-DOMAIN/api/connect/google/callback`.
4. Put the client ID and secret in `.dev.vars` (local) or Wrangler secrets (production).
5. The Google account the client signs in with must have access to the GA4 property and Search Console site.

## Deploy to Cloudflare
1. `npx wrangler d1 execute kinexis --remote --file=schema.sql` and the same for `seed.sql`.
2. The production URL and custom-domain route are configured as `https://portal.kinexisdigital.com` in `wrangler.jsonc`. The domain is created when the Worker is deployed by an account that controls the `kinexisdigital.com` Cloudflare zone.
3. `npx wrangler secret put SESSION_SECRET`, then `TOKEN_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
4. `npm run deploy`. Confirm `portal.kinexisdigital.com` under Workers > your worker > Settings > Domains. This is separate from `connect.kinexisdigital.com` and does not modify that product.

## Where things live
- `public/assets/logo/` logos and favicon, `public/assets/img/login-hero.jpg` login photo (optional), `public/assets/fonts/` self-hosted fonts if wanted.
- `lib/config.js` brand name, logo paths, tagline, goals.
- `app/globals.css` all styling.
- `app/login`, `app/portal`, `app/team` the three screens. `app/api/*` the server endpoints.
- `lib/auth.js` passwords, sessions, token encryption. `lib/google.js` GA4 and Search Console calls. `lib/demo.js` sample data.

## Not built yet
Google Ads and Meta Ads (Ads tab is sample data; Google Ads needs a developer token), password reset email, login rate limiting (add a Cloudflare rate-limit rule on /api/auth/login), and a "previous period" comparison on live data.
