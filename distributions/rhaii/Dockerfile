# Multi-stage Dockerfile for the RHAII distribution.
# Builds the RHAII frontend shell and packages it with the core-bff Go binary.
#
# Build from repository root:
#   docker build -f distributions/rhaii/Dockerfile -t rhaii-dashboard:latest .
#
ARG NODE_BASE_IMAGE=registry.access.redhat.com/ubi9/nodejs-22:latest
ARG GOLANG_BASE_IMAGE=registry.access.redhat.com/ubi9/go-toolset:1.26
ARG RUNTIME_BASE_IMAGE=registry.access.redhat.com/ubi9/ubi-minimal:latest

# ── Stage 1: UI Builder ──────────────────────────────────────────────────────
FROM ${NODE_BASE_IMAGE} AS ui-builder

WORKDIR /usr/src/workspace

# Install the pinned pnpm CLI from the npm-prefetched bootstrap package. Hermeto
# supplies .npmrc during Konflux builds, allowing these installs to use the
# prefetched registry rather than the public npm registry.
COPY --chown=default:root prefetch/pnpm/package.json prefetch/pnpm/package-lock.json ./prefetch/pnpm/
COPY --chown=default:root package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=default:root .npmrc ./

# Copy workspace packages required by the RHAII distribution
COPY --chown=default:root frontend/package.json ./frontend/
COPY --chown=default:root frontend/src/ ./frontend/src/
COPY --chown=default:root packages/plugin-core/ ./packages/plugin-core/
COPY --chown=default:root packages/app-config/ ./packages/app-config/
COPY --chown=default:root packages/tsconfig/ ./packages/tsconfig/

# Copy feature packages used by the RHAII distribution.
COPY --chown=default:root packages/model-serving/ ./packages/model-serving/
COPY --chown=default:root packages/kserve/ ./packages/kserve/
COPY --chown=default:root packages/llmd-serving/ ./packages/llmd-serving/
COPY --chown=default:root packages/analytics/ ./packages/analytics/
COPY --chown=default:root packages/trustyai/ ./packages/trustyai/
COPY --chown=default:root packages/foundation/ ./packages/foundation/
COPY --chown=default:root packages/hardware-profiles/ ./packages/hardware-profiles/
COPY --chown=default:root packages/connection-types/ ./packages/connection-types/
COPY --chown=default:root packages/k8s-core/ ./packages/k8s-core/
COPY --chown=default:root packages/model-registry/ ./packages/model-registry/
COPY --chown=default:root packages/ui-core/ ./packages/ui-core/

# Copy build scripts required by rspack/webpack configs
COPY --chown=default:root scripts/ ./scripts/

# Copy the base distribution (shell components + shared rspack config)
COPY --chown=default:root distributions/base/ ./distributions/base/

# Copy the RHAII distribution
COPY --chown=default:root distributions/rhaii/ ./distributions/rhaii/

# The UBI Node builder uses the non-root assemble user for package installation.
USER default
ENV PATH="/usr/src/workspace/prefetch/pnpm/node_modules/.bin:${PATH}"
RUN npm ci --prefix ./prefetch/pnpm --prefer-offline --ignore-scripts --no-audit --no-fund --no-progress \
    && test "$(pnpm --version)" = "11.22.0"
RUN CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile --prefer-offline

# Build the RHAII frontend
WORKDIR /usr/src/workspace/distributions/rhaii
# Production images serve the federated Model Serving remote from the same
# origin. This matches the main dashboard's module-federation URL convention.
# Tilt overrides it with its local development server on port 9109.
ARG MODEL_SERVING_REMOTE_ENTRY="/_mf/modelServing/remoteEntry.js"
ENV MODEL_SERVING_REMOTE_ENTRY=${MODEL_SERVING_REMOTE_ENTRY}
ARG RHAII_TILT_FIXTURES=false
ENV RHAII_TILT_FIXTURES=${RHAII_TILT_FIXTURES}
RUN pnpm run build

# Build the Model Serving module as a federated remote. The final stage places
# these assets at the conventional /_mf/modelServing path in the RHAII BFF's
# static root, so the browser can load the remote from the same origin without
# a separate UI deployment or CORS policy.
WORKDIR /usr/src/workspace/packages/model-serving/frontend
ENV DEPLOYMENT_MODE=federated
ENV PUBLIC_PATH=/_mf/modelServing/
RUN pnpm run build:prod

# ── Stage 2: BFF Builder ─────────────────────────────────────────────────────
FROM ${GOLANG_BASE_IMAGE} AS bff-builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /usr/src/app

# Copy Go module files and download dependencies
COPY distributions/core-bff/bff/go.mod distributions/core-bff/bff/go.sum ./
# The core-bff module has a replace directive for the shared pkg/tls module
# (../../../pkg/tls, which resolves to /pkg/tls from this WORKDIR).
COPY pkg/tls/go.mod pkg/tls/go.sum /pkg/tls/
RUN go mod download

# Copy source code
COPY pkg/tls/ /pkg/tls/
COPY distributions/core-bff/bff/cmd/ cmd/
COPY distributions/core-bff/bff/internal/ internal/
COPY distributions/core-bff/bff/openapi/ openapi/

# Build the Go binary
RUN CGO_ENABLED=1 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} \
    go build -a -ldflags="-s -w" -tags strictfipsruntime -o /tmp/bff ./cmd

# ── Stage 3: Final ───────────────────────────────────────────────────────────
FROM ${RUNTIME_BASE_IMAGE}

WORKDIR /
COPY --from=bff-builder /tmp/bff ./bff
COPY --from=bff-builder /usr/src/app/openapi/ ./openapi/
COPY --from=ui-builder /usr/src/workspace/distributions/rhaii/public ./static/
COPY --from=ui-builder /usr/src/workspace/packages/model-serving/frontend/dist ./static/_mf/modelServing/
USER 65532:65532

EXPOSE 8443

ENTRYPOINT ["/bff"]
