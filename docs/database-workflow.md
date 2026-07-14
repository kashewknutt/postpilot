# Database Workflow

Postpilot uses a TypeScript schema as the source of truth.

```text
packages/db/src/schema.ts   ← edit this
pnpm db:sync                ← push changes to Supabase
```

## Setup

1. Copy `.env.example` → `.env`
2. Add your Supabase API keys
3. Add `DATABASE_URL` from:
   **Supabase Dashboard → Project Settings → Database → Connection string → URI**

Example:

```bash
DATABASE_URL=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres
```

Use the **Session mode** pooler URI (port `5432` or `6543` depending on your project).

## Sync flow

1. Edit [`packages/db/src/schema.ts`](../packages/db/src/schema.ts)
2. Run:

```bash
pnpm db:sync
```

That script:
1. Pushes table/index/schema changes with `drizzle-kit push`
2. Applies [`packages/db/src/policies.sql`](../packages/db/src/policies.sql) for auth FKs, RLS, and triggers
3. Verifies remote tables exist

## Rules

- `schema.ts` is the editable source of truth for tables
- Do **not** hand-run migration files for routine updates
- Do **not** edit production tables in the Supabase dashboard for routine changes
- Put RLS / auth triggers in `policies.sql` when needed
