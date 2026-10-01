# Compatibility Dockerfile for repository-root builds.
# Active monorepo and CI builds use packages/gen-ai/Dockerfile.workspace.
# Build from repository root: docker build -f packages/gen-ai/Dockerfile .

# Frontend build stage
FROM registry.access.redhat.com/ubi9/nodejs-22 AS ui-builder

WORKDIR /usr/src/workspace

# Copy pnpm workspace metadata and the packages required by the Gen AI frontend.
COPY --chown=default:root package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=default:root frontend/package.json ./frontend/
COPY --chown=default:root packages/plugin-core/ ./packages/plugin-core/
COPY --chown=default:root packages/analytics/ ./packages/analytics/
COPY --chown=default:root packages/tsconfig/ ./packages/tsconfig/
COPY --chown=default:root packages/app-config/ ./packages/app-config/
COPY --chown=default:root packages/foundation/ ./packages/foundation/
COPY --chown=default:root packages/k8s-core/ ./packages/k8s-core/
COPY --chown=default:root packages/ui-core/ ./packages/ui-core/
COPY --chown=default:root packages/model-serving/ ./packages/model-serving/
COPY --chown=default:root packages/trustyai/ ./packages/trustyai/
COPY --chown=default:root packages/model-registry/package.json ./packages/model-registry/
COPY --chown=default:root packages/model-registry/shared/ ./packages/model-registry/shared/
COPY --chown=default:root packages/hardware-profiles/ ./packages/hardware-profiles/
COPY --chown=default:root packages/connection-types/ ./packages/connection-types/
COPY --chown=default:root frontend/src/ ./frontend/src/
COPY --chown=default:root scripts/ ./scripts/
COPY --chown=default:root packages/gen-ai/frontend/ ./packages/gen-ai/frontend/

USER default
RUN npm install -g pnpm@11.22.0
RUN CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile

WORKDIR /usr/src/workspace/packages/gen-ai/frontend
ENV DEPLOYMENT_MODE=standalone
RUN pnpm run build:prod

# Backend build stage
FROM registry.redhat.io/ubi9/go-toolset:1.26 AS bff-builder
WORKDIR /usr/src/app
COPY packages/gen-ai/bff/go.mod packages/gen-ai/bff/go.sum ./
COPY pkg/tls/go.mod pkg/tls/go.sum /pkg/tls/
RUN go mod download
COPY pkg/tls/ /pkg/tls/
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
