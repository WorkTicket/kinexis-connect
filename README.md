# Kinexis Platform

Monorepo for two independent Kinexis applications. Each app keeps its own Next.js configuration, dependencies, Cloudflare Worker, domain, data bindings, and deployment command:

| App | Directory | Worker / domain |
| --- | --- | --- |
| KINEXIS Connect | repository root | `kinexis-connect` / `connect.kinexisdigital.com` |
| Client Portal | [`apps/client-portal`](apps/client-portal) | `kinexis-client-portal` / `portal.kinexisdigital.com` |

Combining source control does **not** combine runtime environments, databases, credentials, or production releases.

## KINEXIS Connect

Requirements: Node.js 24+, npm, and a Supabase project.

```bash
npm ci
npm run dev
```

Connect's Supabase migrations and configuration remain scoped to the repository root. See [Connect deployment](docs/deployment.md).

Useful checks and deployment commands:

```bash
npm run lint
npm run typecheck
npm test
npm run cf:build
npm run deploy
```

## Client Portal

Requirements: Node.js 22+ and npm. Install dependencies in the Portal app directory:

```bash
cd apps/client-portal
npm ci
npm run dev
```

Configure local values in `apps/client-portal/.dev.vars` using the tracked `.dev.vars.example` template. Never commit `.dev.vars`, Worker secrets, or generated seed data. Portal's D1 binding, schema, Worker configuration, and deployment instructions are app-local.

```bash
npm run build
npm run preview
npm run deploy
```

Deploy each Worker only through its own app directory and only with explicit release approval. Portal deployment commands do not deploy Connect, and vice versa.
