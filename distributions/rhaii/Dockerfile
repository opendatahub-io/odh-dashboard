# Multi-stage Dockerfile for the RHAII distribution.
# Builds the RHAII frontend shell and packages it with the core-bff Go binary.
#
# Build from repository root:
#   docker build -f distributions/rhaii/Dockerfile -t rhaii-dashboard:latest .

ARG NODE_BASE_IMAGE=node:22
ARG GOLANG_BASE_IMAGE=golang:1.25
ARG DISTROLESS_BASE_IMAGE=gcr.io/distroless/static:nonroot

# ── Stage 1: UI Builder ──────────────────────────────────────────────────────
FROM ${NODE_BASE_IMAGE} AS ui-builder

WORKDIR /usr/src/workspace

# Copy root workspace manifest (npm needs it to resolve workspace graph)
COPY package.json package-lock.json* ./

# Copy workspace packages required by the RHAII distribution
COPY frontend/package.json ./frontend/
COPY frontend/src/ ./frontend/src/
COPY packages/plugin-core/ ./packages/plugin-core/
COPY packages/tsconfig/ ./packages/tsconfig/

# Copy the base distribution (shell components + shared webpack config)
COPY distributions/base/ ./distributions/base/

# Copy the RHAII distribution
COPY distributions/rhaii/ ./distributions/rhaii/

# Install workspace dependencies
# Cannot use --omit=optional or --ignore-scripts: @swc/core distributes its
# native bindings as optional deps and needs its postinstall to set them up.
RUN npm cache clean --force
RUN npm ci

# Build the RHAII frontend
WORKDIR /usr/src/workspace/distributions/rhaii
RUN npm run build

# ── Stage 2: BFF Builder ─────────────────────────────────────────────────────
FROM ${GOLANG_BASE_IMAGE} AS bff-builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /usr/src/app

# Copy Go module files and download dependencies
COPY distributions/core-bff/bff/go.mod distributions/core-bff/bff/go.sum ./
RUN go mod download

# Copy source code
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
USER 65532:65532

EXPOSE 4000

ENTRYPOINT ["/bff"]
