# Database Workflow

Postpilot uses a declarative schema-first workflow. The editable source of truth is:

```text
supabase/database/*.sql
```

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm db:sync` | Diff declarative schema files and apply to local Supabase |
| `pnpm db:push` | Push generated migrations to the linked remote project |
| `pnpm db:pull` | Pull remote schema for drift recovery only |
| `pnpm db:diff` | Generate a migration diff without applying |
| `pnpm db:types` | Regenerate TypeScript DB types |

## Recommended flow

1. Edit files in `supabase/database/`
2. Run `pnpm db:sync`
3. Review any generated migration in `supabase/migrations/`
4. Run `pnpm db:types`
5. Commit schema files and generated migration/types together
6. Run `pnpm db:push` when ready to update the linked remote project

## Rules

- Do not make routine schema edits directly in the remote Supabase dashboard
- Treat `supabase/database/*.sql` as the canonical schema definition
- Use `db:pull` only for initial import or emergency drift recovery
