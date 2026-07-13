# Environment Variables

Copy `.env.example` to `.env` at the repo root for local development.

## Backend (`apps/backend-api`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key for JWT validation |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side DB access |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | Default subscription price ID |
| `GEMINI_API_KEY` | Google Gemini API key |
| `API_PORT` | API port (default `8080`) |
| `CORS_ORIGIN` | Allowed CORS origins |

## Extension (`apps/chrome-extension`)

Set via Vite env vars:

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_BASE_URL` | Backend API base URL |

## Supabase Auth Redirect

Register this redirect URI in Google Cloud Console and Supabase Auth:

```text
https://<extension-id>.chromiumapp.org/oauth2
```
