# Frontend build stage
# Build from repository root: docker build -f packages/gen-ai/Dockerfile .
FROM registry.access.redhat.com/ubi9/nodejs-20 AS ui-builder
USER root
WORKDIR /usr/src/workspace
# Copy root workspace manifest (needed for npm workspaces)
COPY package.json package-lock.json* ./
# Copy frontend workspace manifests (for @odh-dashboard/internal)
COPY frontend/package.json ./frontend/
COPY frontend/src/package.json ./frontend/src/
# Copy required workspace packages
COPY packages/plugin-core/ ./packages/plugin-core/
COPY packages/tsconfig/ ./packages/tsconfig/
# Copy frontend source (for @odh-dashboard/internal exports)
COPY frontend/src/ ./frontend/src/
# Copy gen-ai module package.json
COPY packages/gen-ai/package.json ./packages/gen-ai/
COPY packages/gen-ai/frontend/package*.json ./packages/gen-ai/frontend/
# Copy gen-ai module source code
COPY packages/gen-ai/frontend/ ./packages/gen-ai/frontend/
RUN chown -R default:root /usr/src/workspace && chmod -R g+w /usr/src/workspace
USER default
# Install workspace dependencies at root level
RUN npm ci --omit=optional --ignore-scripts
# Change to module directory and install module dependencies
WORKDIR /usr/src/workspace/packages/gen-ai/frontend
RUN npm ci --omit=optional --ignore-scripts
ENV DEPLOYMENT_MODE=standalone
RUN npm run build:prod

# Backend build stage
FROM registry.redhat.io/ubi9/go-toolset:1.24 AS bff-builder
WORKDIR /usr/src/app
COPY packages/gen-ai/bff/go.mod packages/gen-ai/bff/go.sum ./
RUN go mod download
COPY packages/gen-ai/bff/cmd/ cmd/
COPY packages/gen-ai/bff/internal/ internal/
RUN CGO_ENABLED=0 GOOS=linux go build -a -o /tmp/bff ./cmd

# Final minimal image
FROM registry.access.redhat.com/ubi9/ubi-minimal:9.3
WORKDIR /
COPY --from=bff-builder /tmp/bff ./
COPY --from=ui-builder /usr/src/workspace/packages/gen-ai/frontend/dist/ ./static/
COPY packages/gen-ai/bff/openapi/ ./openapi/

# OAuth environment variables
ENV OAUTH_ENABLED=false \
    OAUTH_CLIENT_ID="" \
    OAUTH_CLIENT_SECRET="" \
    OAUTH_REDIRECT_URI="" \
    OAUTH_SERVER_URL=""

USER 1001
EXPOSE 8080
CMD ["/bff"] 
