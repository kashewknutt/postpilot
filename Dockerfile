# Build from repository root:
#   docker build -t postpilot-api .
#   gcloud builds submit --config cloudbuild.yaml
#   gcloud run deploy --source .

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend-api/package.json ./apps/backend-api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/backend-api/node_modules ./apps/backend-api/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @postpilot/shared-types build \
 && pnpm --filter @postpilot/shared-utils build \
 && pnpm --filter @postpilot/backend-api build \
 && pnpm --filter @postpilot/backend-api deploy --prod /prod/backend-api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=8080
COPY --from=build /prod/backend-api ./
EXPOSE 8080
CMD ["node", "dist/index.js"]
