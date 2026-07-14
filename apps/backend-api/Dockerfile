# Deprecated for Cloud Build / Cloud Run.
# Use the repository-root Dockerfile instead:
#   docker build -t postpilot-api .
#   gcloud builds submit --config cloudbuild.yaml
#
# Cloud Run continuous deployment must use the REPO ROOT as the build
# context. Building from apps/backend-api alone fails because this is a
# pnpm monorepo (needs pnpm-workspace.yaml + packages/*).

FROM node:22-alpine
RUN echo "Build from repository root with ./Dockerfile" && exit 1
