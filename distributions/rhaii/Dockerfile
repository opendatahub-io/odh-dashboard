# Multi-stage Dockerfile for the RHAII distribution.
# Builds the RHAII frontend shell and packages it with the core-bff Go binary.
#
# Build from repository root:
#   docker build -f distributions/rhaii/Dockerfile -t rhaii-dashboard:latest .
#
ARG NODE_BASE_IMAGE=node:22
ARG GOLANG_BASE_IMAGE=golang:1.25
ARG DISTROLESS_BASE_IMAGE=gcr.io/distroless/static:nonroot
ARG BUILDPLATFORM

# ── Stage 1: UI Builder ──────────────────────────────────────────────────────
FROM --platform=$BUILDPLATFORM ${NODE_BASE_IMAGE} AS ui-builder

WORKDIR /usr/src/workspace

# Copy root workspace manifest and lockfile for pnpm workspace resolution
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages required by the RHAII distribution
COPY frontend/package.json ./frontend/
COPY frontend/src/ ./frontend/src/
COPY packages/plugin-core/ ./packages/plugin-core/
COPY packages/app-config/ ./packages/app-config/
COPY packages/tsconfig/ ./packages/tsconfig/

# Copy feature packages used by the RHAII distribution.
COPY packages/model-serving/ ./packages/model-serving/
COPY packages/kserve/ ./packages/kserve/
COPY packages/llmd-serving/ ./packages/llmd-serving/
COPY packages/analytics/ ./packages/analytics/
COPY packages/trustyai/ ./packages/trustyai/
COPY packages/foundation/ ./packages/foundation/
COPY packages/hardware-profiles/ ./packages/hardware-profiles/
COPY packages/connection-types/ ./packages/connection-types/
COPY packages/k8s-core/ ./packages/k8s-core/
COPY packages/model-registry/ ./packages/model-registry/
COPY packages/ui-core/ ./packages/ui-core/

# Copy build scripts required by rspack/webpack configs
COPY scripts/ ./scripts/

# Copy the base distribution (shell components + shared rspack config)
COPY distributions/base/ ./distributions/base/

# Copy the RHAII distribution
COPY distributions/rhaii/ ./distributions/rhaii/

# Install pnpm and workspace dependencies
RUN npm install -g pnpm@11.22.0
RUN CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile

# Build the RHAII frontend
WORKDIR /usr/src/workspace/distributions/rhaii
ARG ENABLE_MODEL_SERVING=false
ENV ENABLE_MODEL_SERVING=${ENABLE_MODEL_SERVING}
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
FROM --platform=$BUILDPLATFORM ${GOLANG_BASE_IMAGE} AS bff-builder

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
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -o bff ./cmd

# ── Stage 3: Final ───────────────────────────────────────────────────────────
FROM ${DISTROLESS_BASE_IMAGE}

WORKDIR /
COPY --from=bff-builder /usr/src/app/bff ./
COPY --from=bff-builder /usr/src/app/openapi/ ./openapi/
COPY --from=ui-builder /usr/src/workspace/distributions/rhaii/public ./static/
COPY --from=ui-builder /usr/src/workspace/packages/model-serving/frontend/dist ./static/_mf/modelServing/
USER 65532:65532

EXPOSE 8443

ENTRYPOINT ["/bff"]
