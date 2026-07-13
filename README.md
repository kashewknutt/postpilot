# Postpilot

Multi-platform AI creator copilot for LinkedIn, X, and YouTube Studio.

## Monorepo layout

```text
apps/
  backend-api/      # Fastify API for GCP Cloud Run
  chrome-extension/ # Manifest V3 browser extension
packages/
  shared-types/     # Shared API and domain types
  shared-utils/     # Shared validation and helpers
supabase/
  database/         # Declarative schema source of truth
scripts/
  supabase-sync.mjs # Schema sync automation
```

## Quick start

```bash
pnpm install
pnpm build
pnpm dev
```

## Database sync

Edit `supabase/database/*.sql`, then run:

```bash
pnpm db:sync
pnpm db:types
```

See [docs/database-workflow.md](docs/database-workflow.md).

## Development

- Extension: `pnpm --filter @postpilot/chrome-extension dev`
- Backend: `pnpm --filter @postpilot/backend-api dev`

Copy `.env.example` to `.env` and configure Supabase, Stripe, and Gemini credentials.

## Deployment

- Backend: [docs/deploy/cloud-run.md](docs/deploy/cloud-run.md)
- Extension: [docs/release/chrome-web-store.md](docs/release/chrome-web-store.md)
