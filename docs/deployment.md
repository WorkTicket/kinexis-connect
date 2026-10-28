# Deployment runbook

## 1. Supabase

Create or select the production project, then apply every file in `supabase/migrations/` in filename order. Do not skip migrations `0003` through `0007`; they add bundled plans, included entitlements, team invitations, operational RLS, PayPal event linkage, and the Telnyx phone system.

Apply `0006_rls_paypal_event_linkage.sql` before deploying code that writes `provider_events.subscription_id` and `provider_events.provider_subscription_id`. After deployment, resend any previously processed PayPal activation/payment events so their provider payload can be used to repair linkage and billing amounts safely.

In Supabase Auth URL configuration:

- Set the site URL to the exact production `NEXT_PUBLIC_APP_URL`.
- Allow `<APP_URL>/auth/callback` as a redirect URL.
- Configure the production SMTP provider so signup, recovery, and team invitation emails can be delivered.

Grant platform administration by setting the user’s `profiles.global_role` to `platform_admin` through a trusted database/admin operation.

## 2. PayPal

Create monthly subscription plans for Starter, Professional, and Premium. Set their IDs in the matching environment variables.

Create a webhook pointing to:

```text
<APP_URL>/api/webhooks/paypal
```

Subscribe at minimum to subscription activation, cancellation, suspension, expiration, payment failure, and sale completion/denial events. Store the resulting webhook ID as `PAYPAL_WEBHOOK_ID`. Use sandbox credentials for staging and `PAYPAL_ENVIRONMENT=production` only with live credentials and live plan IDs.

## 3. Cloudflare configuration

Authenticate Wrangler, then set all secrets from `.env.example`. Public Supabase values and `NEXT_PUBLIC_APP_URL` must also be available at build time; secrets must not be committed.

Keep production-only public build values in the deployment platform or an ignored `.env.production.local`. The Wrangler configuration preserves dashboard-managed runtime variables during deployment.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run cf:build
npm run deploy
```

Set a strong random `INTERNAL_JOB_SECRET`. Store `TELNYX_API_KEY` and `TELNYX_PUBLIC_KEY` as Worker secrets. The voice application ID and messaging profile ID are non-secret Wrangler variables. Trigger `POST /api/internal/jobs/process` on a short authenticated schedule using the internal secret.

Configure Telnyx webhooks exactly as follows:

- Voice: `<APP_URL>/api/webhooks/telnyx/voice`
- Messaging: `<APP_URL>/api/webhooks/telnyx/sms`

Do not activate automation until the end business's toll-free verification is approved and the two-call forwarding test confirms original caller-ID preservation.

## 4. Acceptance checks

1. Sign up and confirm the email.
2. Create a business and verify owner membership and default settings.
3. Select a paid plan, approve it in PayPal, and confirm the webhook activates both subscription and business.
4. Refresh billing and verify the provider state reconciles.
5. Save business, forwarding, template, quiet-hour, and notification settings.
6. Invite a new user and add an existing user; verify seat limits and removal.
7. Confirm non-admin users cannot access `/admin`.
8. Confirm the inbox send controls remain disabled without Telnyx approval and no job is marked sent.

## 5. Rollback and operations

- A canceled, suspended, or past-due PayPal subscription suspends the business.
- PayPal webhook processing is idempotent through `provider_events.event_key`.
- Outbound jobs stay queued when the Telnyx adapter is unavailable.
- Database migrations are forward-only; take a Supabase backup before applying schema changes in production.
