# Deploy Backend to Cloud Run

## Prerequisites

- Google Cloud project with Cloud Run and Artifact Registry enabled
- Supabase project linked locally via `supabase link`
- Secrets stored in Google Secret Manager

## Local Docker build

```bash
pnpm install
pnpm --filter @postpilot/backend-api build
docker build -f apps/backend-api/Dockerfile -t postpilot-api .
docker run --rm -p 8080:8080 --env-file .env postpilot-api
```

## Cloud Run deployment

Use the GitHub Actions workflow in `.github/workflows/deploy-backend.yml` or deploy manually:

```bash
gcloud run deploy postpilot-api \
  --source apps/backend-api \
  --region us-central1 \
  --allow-unauthenticated
```

## Health check

```bash
curl http://localhost:8080/health
```
