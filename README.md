# KINEXIS Connect

KINEXIS Connect is a multi-tenant missed-call text-back SaaS. It includes Supabase authentication, business onboarding, PayPal subscriptions, entitlement-gated bundled plans, customer and admin dashboards, settings, inbox history, and team management.

Telnyx delivery is gated by provider credentials, a verified toll-free number, forwarding tests, documented caller consent, compliance approval, and an active subscription or included entitlement. The application never reports an unsent message as sent.

## Local development

Requirements: Node.js 20+, npm, and a Supabase project.

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Apply the SQL files in `supabase/migrations/` in filename order before testing authenticated flows.

## Required configuration

- Supabase URL, anonymous key, and service-role key
- `NEXT_PUBLIC_APP_URL` set to the exact application origin
- PayPal client credentials, webhook ID, and three plan IDs
- A strong `INTERNAL_JOB_SECRET`

Telnyx variables may remain blank before phone activation. See [`.env.example`](.env.example) and [`docs/deployment.md`](docs/deployment.md).

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run cf:build
```

## Deployment

The repository is configured for Cloudflare Workers through OpenNext and Wrangler. Follow [`docs/deployment.md`](docs/deployment.md), including Supabase redirects and PayPal webhook setup, before deploying.
