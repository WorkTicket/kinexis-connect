# KX-SEO-002 — Phase 3 Connect / Client Portal remediation

**Status:** PR candidate only; neither host was deployed.
**Connect branch:** `seo/phase-3-connect`
**Combined PR:** https://github.com/WorkTicket/kinexis-platform/pull/1 (open; not merged)
**Current pushed PR head:** `37b9b77e9958ae318b7e924ec859c9db1c5acd68`
**Connect implementation commit:** `5bf0642694b2c6c269e2e3d95448a464b8465bb6`
**Repository:** `WorkTicket/kinexis-platform` (renamed from `WorkTicket/kinexis-connect`)
**Connect Worker:** `kinexis-connect`; custom domain `connect.kinexisdigital.com`.
**Portal candidate:** `apps/client-portal` in this repository; Worker `kinexis-client-portal`; custom domain `portal.kinexisdigital.com`.

## Evidence and findings

- **FACT — historical Ahrefs observation:** The November 18 crawl reported Connect homepage TTFB of 3,138 ms. This is an Ahrefs observation, not a repeatable timing baseline by itself.
- **FACT — production sample on November 21:** Three read-only GETs per route were collected from one client vantage point. Connect median TTFB was 182.3 ms for `/`, 175.0 ms for `/pricing`, and 128.9 ms for `/login`. Fresh-connection values were 310.1, 175.0, and 134.7 ms; subsequent same-origin keep-alive requests were also recorded. All returned HTTP 200. Portal medians were 149.5 ms for `/` (HTTP 307 to `/login`), 176.6 ms for `/login`, and 158.4 ms for `/register`; all three requests per route returned the same expected status.
- The complete DNS/TCP/TLS/TTFB/total/body-size and selected response-header records are in `KX-SEO-002-PHASE3-MULTIHOST-TTFB-BASELINE-2026-11-21.csv`. Cloudflare responses reported `CF-RAY` POP `MIA`; no `Age` or `CF-Cache-Status` was present. Connect/Portal HTML carried `Cache-Control: s-maxage=31536000`, but these headers do not prove that an edge cache served a response.
- **INFERENCE, not isolated cause:** Connect's `src/middleware.ts` previously matched essentially every non-static request, constructed a Supabase SSR client, and awaited `auth.getUser()` even for public marketing routes and APIs. Narrowing the matcher removes this unnecessary middleware auth lookup from public routes. The observed timing data do not prove that middleware caused the historical Ahrefs delay; worker/cache behavior remains unisolated.
- **FACT — Portal indexing intent:** Portal contains authenticated workspaces plus public login/registration forms, with no public acquisition content. Before the change, the root metadata had no `robots` directive, so login and registration inherited indexable defaults.
- **FACT — current live robots endpoint:** `https://portal.kinexisdigital.com/robots.txt` served Cloudflare content-signal text without normal path directives. The candidate now generates explicit crawler rules in Next; production must be checked after an approved deployment to confirm Cloudflare's edge behavior preserves them.
- The live Connect crawler policy is now represented by `src/app/robots.ts` and `src/app/sitemap.ts`. The candidate's generated `.next/server/app/robots.txt.body` and `sitemap.xml.body` match the captured production directives, URL list, and priorities exactly. This reconciles the source/content discrepancy without changing the observed indexing policy or Cloudflare configuration. Verify the endpoints after an approved deployment.

## Read-only rollback inspection

On November 21, `wrangler deployments list` reported the active 100% Worker versions before this candidate:

| Worker | Current 100% version (rollback target after a future release) | Previous history version |
|---|---|---|
| `kinexis-connect` | `539c9f4d-bf5d-4859-9b6c-c9306a023a65` (Nov 19) | `ef9b97b9-cd0e-4833-b489-7b9c14ff93a6` (Nov 15) |
| `kinexis-client-portal` | `b1f20fa3-4f46-45f4-b543-e9821d1afa8e` (Oct 28) | `28686ca6-646a-4a2b-8466-f7d9cd3591bf` (Oct 28) |

Wrangler CLI help confirms the rollback command accepts a target version ID. If a later deployment is approved and rollback is authorized, the recovery command shape is `npx wrangler rollback <pre-release-version-id> --name <worker-name>`. The command was **not executed**; remote history and CLI syntax are verified, but rollback/recovery has not been exercised. Recheck the active version immediately before any approved deployment.

## Changes in the Connect candidate

- `src/middleware.ts`: limit middleware execution to `/app/:path*`, `/onboarding/:path*`, and `/admin/:path*`. API route handlers retain their own authorization and webhook verification.
- `tests/unit/middleware-matcher.test.ts`: assert protected roots and nested paths match, while marketing, auth, API, and webhook paths do not.
- `docs/KX-SEO-002-PHASE3-MULTIHOST-TTFB-BASELINE-2026-11-21.csv`: six public routes, three GETs each, with fresh and reused connections distinguished.

## Changes in the Portal candidate

- `app/layout.js`: emit `noindex,nofollow` for all Portal pages, including Googlebot-specific no-index directives. This host is a private client workspace, not an SEO landing site.
- `app/robots.js`: allow `/login` and `/register` to be crawled so crawlers can read their no-index metadata; disallow `/portal`, `/team`, and `/api/`.
- `apps/client-portal/package.json` / lockfile: update within existing major ranges and pin safe transitive `glob`/`postcss` versions with scoped overrides. `npm audit` now reports zero advisories; `npm ci`, Next build, and OpenNext Cloudflare build pass on the pushed candidate.
- Authentication, redirects, and the private data paths were not weakened.

## Verification

| Check | Result |
|---|---|
| Connect focused matcher/auth-path tests | PASS — 5 tests |
| Connect complete unit suite | PASS — 9 files, 25 tests |
| Connect ESLint | PASS |
| Connect TypeScript | PASS |
| Connect OpenNext Cloudflare build (`npm run cf:build`) | PASS; Windows compatibility warning from OpenNext |
| Connect local Worker preview | PASS — `/`, `/login`, `/signup` returned 200; unauthenticated `/app`, `/admin`, `/onboarding` redirected to login; unauthenticated `/api/me` returned 401 |
| Portal Next production build (`npm run build`) | PASS |
| Portal local built-server metadata check | PASS — `/login` and `/register` returned 200 with `noindex,nofollow`; Googlebot was also no-indexed |
| Portal generated `robots.txt` check | PASS — login/register allowed; portal/team/API disallowed |
| Portal dependency audit | PASS — `npm ci` followed by `npm audit --audit-level=low`; 0 vulnerabilities |
| Portal OpenNext Cloudflare build | PASS after clean install; Windows compatibility and old compatibility-date warnings remain |
| Combined-repository lint | PASS — 0 errors; 6 existing Portal warnings. Generated nested `.next`/`.open-next` outputs are ignored. |
| Release 3 GitHub Actions | The prior run at `37b9b77` passed Connect and Portal install/audit, but Portal's clean Linux build failed. The workflow now includes failing-build diagnostics in its run summary; recheck the new run before release. |
| Production after-change verification | NOT RUN — no deployment authorization |
| Independent QA | PASS on safety/auth, robots/indexing intent, evidence claims, and regression-test coverage; QA did not rerun commands. Rollback target and command shape PASS by read-only review; actual recovery remains NOT VERIFIED. The repo consolidation has not yet had independent QA. Release readiness remains FAIL/not deployable pending follow-up QA, the live crawl-source discrepancy, recovery verification, and specific owner approval. |

## Open items and gates

1. **Repository rename — DONE:** GitHub repository is now `WorkTicket/kinexis-platform`; GitHub redirects the former repository URL. The local `origin` remote has been updated. Review any external integrations that do not follow redirects.
2. **Connect crawl-source discrepancy — SOURCE RECONCILED:** Connect's generated crawler files now reproduce the observed production robots/sitemap content exactly. No zone configuration was changed. Confirm endpoint content and cache behavior after each separately approved deployment.
3. **Performance target — NOT CLAIMED:** The November 21 single-vantage sample medians are below 800 ms, but the historical 3,138 ms Ahrefs Connect flag is not explained or disproven globally. Repeat comparable multi-region/crawl measurements after an approved release; do not attribute a production improvement to the local middleware change.
4. **Independent QA / owner approval — P0 deployment gate:** Existing local checks and Connect CI pass, but Portal CI fails and actual recovery remains NOT VERIFIED; release readiness remains FAIL. The repo consolidation and pushed follow-up still need independent review and passing remote CI. Recheck active versions, resolve the crawl-source discrepancy, confirm recovery with Cloudflare Operations, then obtain explicit approval for each specific deployment.
5. **Agent Board / playbook records:** The Agent Board, Coding Playbook, Repo Map, Failure Log, Lessons Log, and Estimate Log were not found in the checked-out project folders. No substitute records were invented; create/update them only after the owners provide the canonical locations.

No production deployment, DNS/cache change, secret change, database action, or rollback was performed.
