# Deploy Backend to Cloud Run

## Why builds failed before

1. **GitHub Actions** built only `@postpilot/backend-api` / `@postpilot/chrome-extension` without building `@postpilot/shared-types` and `@postpilot/shared-utils` first → `Cannot find module '@postpilot/shared-*'`.
2. **Cloud Build / Cloud Run** used `apps/backend-api` as the Docker context (`--source apps/backend-api`). That folder does not contain `pnpm-workspace.yaml` or `packages/*`, so Docker failed copying monorepo files.

This monorepo **must be built from the repository root**.

## Correct Cloud Run / Cloud Build setup

### Option A — GitHub Actions (recommended)

Workflow: [`.github/workflows/deploy-backend.yml`](../.github/workflows/deploy-backend.yml)

Uses:

```bash
gcloud run deploy postpilot-api --source .
```

### Option B — Cloud Build trigger

1. In GCP → Cloud Build → Triggers
2. Set **configuration** to `cloudbuild.yaml` in the **repo root**
3. Do **not** set Dockerfile directory to `apps/backend-api`
4. Build context = repository root

```bash
gcloud builds submit --config cloudbuild.yaml
```

### Option C — Manual

```bash
docker build -t postpilot-api .
gcloud run deploy postpilot-api --image ... --region asia-south1
```

## Secret Manager secrets required on Cloud Run

| Secret | Required |
|--------|----------|
| `SUPABASE_URL` | yes |
| `SUPABASE_ANON_KEY` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes |
| `DATABASE_URL` | yes |
| `GEMINI_API_KEY` | yes |
| `STRIPE_SECRET_KEY` | yes |
| `STRIPE_WEBHOOK_SECRET` | yes |
| `STRIPE_PRICE_ID` | yes |
| `CORS_ORIGIN` | yes (`chrome-extension://YOUR_ID`) |

## GitHub secrets for CI extension zip

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Extension build |
| `VITE_SUPABASE_ANON_KEY` | Extension build |
| `VITE_API_BASE_URL` | Cloud Run URL, e.g. `https://postpilot-api-xxx.asia-south1.run.app` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/4092394746/locations/global/workloadIdentityPools/github-pool/providers/postpilot` |
| `GCP_SERVICE_ACCOUNT` | `postpilot@valneetrivial.iam.gserviceaccount.com` |

Do **not** reuse `providers/github-provider` — that provider is locked to `kashewknutt/laravelmix` and will fail Postpilot with `rejected by the attribute condition`.

## Health check

```bash
curl https://YOUR-CLOUD-RUN-URL/health
```
