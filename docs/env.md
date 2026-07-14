# Environment Variables

Copy `.env.example` to `.env` at the repo root for local development.

The Chrome extension Vite config loads env from the **repo root** (`envDir`), so keep `VITE_*` values in that root `.env`.

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
| `CORS_ORIGIN` | Allowed CORS origins (`chrome-extension://nljljbgbpoenjahibkeinhgdnmbackah`) |

## Extension (`apps/chrome-extension`)

Set via Vite env vars (repo root `.env`):

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_API_BASE_URL` | Backend API base URL |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID of type **Chrome Extension** |

## Google sign-in setup (Chrome extension)

Postpilot uses the native Chrome Identity + Supabase `signInWithIdToken` flow.

1. Load the unpacked extension once (or build it) and note the fixed extension ID:
   `nljljbgbpoenjahibkeinhgdnmbackah`
2. In Google Cloud Console → Credentials, create an OAuth client of type **Chrome Extension**.
   - Item ID: `nljljbgbpoenjahibkeinhgdnmbackah`
3. Copy the client ID into root `.env` as `VITE_GOOGLE_OAUTH_CLIENT_ID`.
4. In Supabase → Authentication → Providers → Google:
   - Keep your existing Web client ID + secret (for the Supabase callback).
   - Add the Chrome Extension client ID under **Client IDs** (comma-separated is fine).
   - Enable **Skip nonce check** if Google ID token verification fails on nonce.
5. Rebuild / reload the extension:
   `pnpm --filter @postpilot/chrome-extension build`
6. Set backend `CORS_ORIGIN=chrome-extension://nljljbgbpoenjahibkeinhgdnmbackah`.

Redirect URI used by Chrome Identity (informational):

```text
https://nljljbgbpoenjahibkeinhgdnmbackah.chromiumapp.org/
```

For this native Google flow you do **not** need to add that URL to Google's web redirect list. Google's Chrome Extension client type uses the extension ID instead.
