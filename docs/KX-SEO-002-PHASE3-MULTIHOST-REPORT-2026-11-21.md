# KX-SEO-002 — Phase 3 Connect / Client Portal remediation

**Status:** Local candidate only; neither host was deployed.
**Connect branch:** `seo/phase-3-connect`
**Connect repository:** `WorkTicket/kinexis-connect`; Worker `kinexis-connect`; custom domain `connect.kinexisdigital.com`.
**Portal source:** `C:\Users\Slay3r\Desktop\websites\Kinexis\kinexis-client-portal`; owner (you) is confirmed, but this directory has no `.git` metadata or repository remote, so its source-control/PR path remains unverified.

## Evidence and findings

- **FACT — historical Ahrefs observation:** The November 18 crawl reported Connect homepage TTFB of 3,138 ms. This is an Ahrefs observation, not a repeatable timing baseline by itself.
- **FACT — production sample on November 21:** Three read-only GETs per route were collected from one client vantage point. Connect median TTFB was 182.3 ms for `/`, 175.0 ms for `/pricing`, and 128.9 ms for `/login`. Fresh-connection values were 310.1, 175.0, and 134.7 ms; subsequent same-origin keep-alive requests were also recorded. All returned HTTP 200. Portal medians were 149.5 ms for `/` (HTTP 307 to `/login`), 176.6 ms for `/login`, and 158.4 ms for `/register`; all three requests per route returned the same expected status.
- The complete DNS/TCP/TLS/TTFB/total/body-size and selected response-header records are in `KX-SEO-002-PHASE3-MULTIHOST-TTFB-BASELINE-2026-11-21.csv`. Cloudflare responses reported `CF-RAY` POP `MIA`; no `Age` or `CF-Cache-Status` was present. Connect/Portal HTML carried `Cache-Control: s-maxage=31536000`, but these headers do not prove that an edge cache served a response.
- **INFERENCE, not isolated cause:** Connect's `src/middleware.ts` previously matched essentially every non-static request, constructed a Supabase SSR client, and awaited `auth.getUser()` even for public marketing routes and APIs. Narrowing the matcher removes this unnecessary middleware auth lookup from public routes. The observed timing data do not prove that middleware caused the historical Ahrefs delay; worker/cache behavior remains unisolated.
- **FACT — Portal indexing intent:** Portal contains authenticated workspaces plus public login/registration forms, with no public acquisition content. Before the change, the root metadata had no `robots` directive, so login and registration inherited indexable defaults.
- **FACT — current live robots endpoint:** `https://portal.kinexisdigital.com/robots.txt` served Cloudflare content-signal text without normal path directives. The candidate now generates explicit crawler rules in Next; production must be checked after an approved deployment to confirm Cloudflare's edge behavior preserves them.
- The live Connect `robots.txt` listed auth paths as disallowed and linked a sitemap containing privacy/terms/SMS-policy URLs. Those endpoints and sitemap contents are not represented by a `robots.txt` or sitemap source file in the checked-out Connect tree/build. This source/deployment discrepancy is handed to Cloudflare/Connect operations for investigation; no live zone setting or indexing policy was changed.

## Changes in the Connect candidate

- `src/middleware.ts`: limit middleware execution to `/app/:path*`, `/onboarding/:path*`, and `/admin/:path*`. API route handlers retain their own authorization and webhook verification.
- `tests/unit/middleware-matcher.test.ts`: assert protected roots and nested paths match, while marketing, auth, API, and webhook paths do not.
- `docs/KX-SEO-002-PHASE3-MULTIHOST-TTFB-BASELINE-2026-11-21.csv`: six public routes, three GETs each, with fresh and reused connections distinguished.

## Changes in the local Portal source

- `app/layout.js`: emit `noindex,nofollow` for all Portal pages, including Googlebot-specific no-index directives. This host is a private client workspace, not an SEO landing site.
- `app/robots.js`: allow `/login` and `/register` to be crawled so crawlers can read their no-index metadata; disallow `/portal`, `/team`, and `/api/`.
- Authentication, redirects, and the private data paths were not weakened.

## Verification

| Check | Result |
|---|---|
| Connect focused matcher/auth-path tests | PASS — 5 tests |
| Connect complete unit suite | PASS — 8 files, 23 tests |
| Connect ESLint | PASS |
| Connect TypeScript | PASS |
| Connect OpenNext Cloudflare build (`npm run cf:build`) | PASS; Windows compatibility warning from OpenNext |
| Connect local Worker preview | PASS — `/`, `/login`, `/signup` returned 200; unauthenticated `/app`, `/admin`, `/onboarding` redirected to login; unauthenticated `/api/me` returned 401 |
| Portal Next production build (`npm run build`) | PASS |
| Portal local built-server metadata check | PASS — `/login` and `/register` returned 200 with `noindex,nofollow`; Googlebot was also no-indexed |
| Portal generated `robots.txt` check | PASS — login/register allowed; portal/team/API disallowed |
| Production after-change verification | NOT RUN — no deployment authorization |
| Independent QA | PASS on safety/auth, robots/indexing intent, evidence claims, and regression-test coverage; QA did not rerun commands. Release readiness is FAIL/not deployable until the handoff, live crawl-source discrepancy, rollback verification, and owner-approval gates are resolved. |

## Open items and gates

1. **Portal source-control handoff — P1:** You confirmed that you are the owner. The Client Portal checkout still has no Git metadata or remote; identify its canonical source repository or confirm that this standalone folder is the intended source before preparing a tracked PR/deployment.
2. **Connect crawl-source discrepancy — P1:** Connect/Cloudflare Operations should identify which deployment/configuration serves the current robots and sitemap resources and reconcile it with the checked-out Worker. Do not alter Cloudflare settings without authorization.
3. **Performance target — NOT CLAIMED:** The November 21 single-vantage sample medians are below 800 ms, but the historical 3,138 ms Ahrefs Connect flag is not explained or disproven globally. Repeat comparable multi-region/crawl measurements after an approved release; do not attribute a production improvement to the local middleware change.
4. **Independent QA / owner approval — P0 deployment gate:** QA reviewed this candidate and returned PASS on safety/auth, robots intent, evidence, and regression coverage, but FAIL for deployment readiness. Confirm the rollback artifact/version and recovery procedure, resolve the source-control and crawl-source discrepancies, then obtain your explicit approval for this specific deployment.
5. **Agent Board / playbook records:** The Agent Board, Coding Playbook, Repo Map, Failure Log, Lessons Log, and Estimate Log were not found in the checked-out project folders. No substitute records were invented; create/update them only after the owners provide the canonical locations.

No production deployment, DNS/cache change, secret change, database action, or rollback was performed.
