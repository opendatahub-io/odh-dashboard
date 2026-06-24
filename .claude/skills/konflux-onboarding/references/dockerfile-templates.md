# Dockerfile Templates

Templates for container images in `odh-dashboard`. Each component needs up to 2 Dockerfiles:
1. **Upstream (ODH)**: Used by Konflux CI in `opendatahub-io/odh-dashboard`
2. **Downstream (RHOAI)**: Used by Konflux in `red-hat-data-services/odh-dashboard`

## Upstream vs Downstream Differences

| Aspect | Upstream (ODH) | Downstream (RHOAI) |
|--------|----------------|---------------------|
| Image tags | Tag-based (e.g., `ubi9/nodejs-22:latest`) | **SHA-pinned** (e.g., `ubi9/nodejs-22@sha256:...`) |
| Go build flags (Type A) | `CGO_ENABLED=1 -tags strictfipsruntime` (FIPS) | Same as upstream |
| Go build flags (Type B) | `CGO_ENABLED=0` (static, no FIPS) | `CGO_ENABLED=1 -tags strictfipsruntime` (FIPS) |
| Labels | Minimal | Full Red Hat labels required |
| Location | Component directory or `packages/<name>/` | Repo root as `Dockerfile.konflux.<component>` |
| Registry | `registry.access.redhat.com` | `registry.access.redhat.com` or `registry.redhat.io` |

## Type A: Modular-Arch Package

### Upstream — `packages/<name>/Dockerfile.workspace`

Multi-stage build with Node.js UI + Go BFF. Build from repo root: `docker build --file ./packages/<name>/Dockerfile.workspace .`

```dockerfile
# Source code arguments
ARG MODULE_NAME=<name>
ARG UI_SOURCE_CODE=./packages/${MODULE_NAME}/frontend
ARG BFF_SOURCE_CODE=./packages/${MODULE_NAME}/bff

# Base images
ARG NODE_BASE_IMAGE=registry.access.redhat.com/ubi9/nodejs-22:latest
ARG GOLANG_BASE_IMAGE=registry.access.redhat.com/ubi9/go-toolset:1.24
ARG DISTROLESS_BASE_IMAGE=registry.access.redhat.com/ubi9-minimal:latest

# UI build stage
FROM ${NODE_BASE_IMAGE} AS ui-builder
ARG UI_SOURCE_CODE
ARG MODULE_NAME
WORKDIR /usr/src/workspace

# Workspace setup — copy root manifests + shared packages
COPY --chown=default:root package.json package-lock.json* ./
COPY --chown=default:root frontend/package.json ./frontend/
COPY --chown=default:root packages/plugin-core/ ./packages/plugin-core/
COPY --chown=default:root packages/tsconfig/ ./packages/tsconfig/
COPY --chown=default:root frontend/src/ ./frontend/src/
COPY --chown=default:root ${UI_SOURCE_CODE} ./${UI_SOURCE_CODE}

USER default
RUN npm cache clean --force
RUN npm ci --omit=optional --ignore-scripts

WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN npm ci --omit=optional --ignore-scripts
RUN npm run build:prod

# BFF build stage
FROM ${GOLANG_BASE_IMAGE} AS bff-builder
ARG BFF_SOURCE_CODE
ARG TARGETOS
ARG TARGETARCH
WORKDIR /usr/src/app

COPY ${BFF_SOURCE_CODE}/go.mod ${BFF_SOURCE_CODE}/go.sum ./
RUN go mod download
COPY ${BFF_SOURCE_CODE}/cmd/ cmd/
COPY ${BFF_SOURCE_CODE}/internal/ internal/
RUN CGO_ENABLED=1 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -ldflags="-s -w" -tags strictfipsruntime -o bff ./cmd

# Final stage
FROM ${DISTROLESS_BASE_IMAGE}
ARG UI_SOURCE_CODE
WORKDIR /
COPY --from=bff-builder /usr/src/app/bff ./
COPY --from=ui-builder /usr/src/workspace/${UI_SOURCE_CODE}/dist ./static/
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/bff"]
```

### Downstream — `Dockerfile.konflux.<name>`

Same structure as upstream but with SHA-pinned images and Red Hat labels. Placed at repo root in `red-hat-data-services/odh-dashboard`.

Key differences from upstream:
- All base images pinned by SHA digest
- Red Hat labels added to final stage
- `CACHITO_ENV_FILE` support is optional — Konflux Cachi2 injects this file automatically during hermetic builds when prefetch is enabled; no Dockerfile changes are needed unless you opt into sourcing it explicitly
- Additional `io.openshift.build.commit.*` labels

```dockerfile
# SHA-pinned base images (update digests via Renovate)
ARG MODULE_NAME=<name>
ARG UI_SOURCE_CODE=./packages/${MODULE_NAME}/frontend
ARG BFF_SOURCE_CODE=./packages/${MODULE_NAME}/bff

ARG NODE_BASE_IMAGE=registry.access.redhat.com/ubi9/nodejs-22@sha256:<digest>
ARG GOLANG_BASE_IMAGE=registry.redhat.io/ubi9/go-toolset@sha256:<digest>
ARG DISTROLESS_BASE_IMAGE=registry.access.redhat.com/ubi9-minimal@sha256:<digest>

# UI build stage (same as upstream, using SHA-pinned NODE_BASE_IMAGE)
FROM ${NODE_BASE_IMAGE} AS ui-builder
ARG UI_SOURCE_CODE
ARG MODULE_NAME
WORKDIR /usr/src/workspace

COPY --chown=default:root package.json package-lock.json* ./
COPY --chown=default:root frontend/package.json ./frontend/
COPY --chown=default:root packages/plugin-core/ ./packages/plugin-core/
COPY --chown=default:root packages/tsconfig/ ./packages/tsconfig/
COPY --chown=default:root frontend/src/ ./frontend/src/
COPY --chown=default:root ${UI_SOURCE_CODE} ./${UI_SOURCE_CODE}

USER default
RUN npm cache clean --force
RUN npm ci --omit=optional --ignore-scripts

WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN npm ci --omit=optional --ignore-scripts
RUN npm run build:prod

# BFF build stage (same as upstream, using SHA-pinned GOLANG_BASE_IMAGE)
FROM ${GOLANG_BASE_IMAGE} AS bff-builder
ARG BFF_SOURCE_CODE
ARG TARGETOS
ARG TARGETARCH
WORKDIR /usr/src/app

COPY ${BFF_SOURCE_CODE}/go.mod ${BFF_SOURCE_CODE}/go.sum ./
RUN go mod download
COPY ${BFF_SOURCE_CODE}/cmd/ cmd/
COPY ${BFF_SOURCE_CODE}/internal/ internal/
RUN CGO_ENABLED=1 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -ldflags="-s -w" -tags strictfipsruntime -o bff ./cmd

# Final stage — add Red Hat labels
FROM ${DISTROLESS_BASE_IMAGE}
ARG UI_SOURCE_CODE

LABEL com.redhat.component="odh-<name>-container" \
      name="managed-open-data-hub/odh-<name>-rhel9" \
      summary="ODH <Name> Module" \
      description="<Name> module for Red Hat OpenShift AI Dashboard" \
      io.k8s.display-name="ODH <Name>" \
      io.k8s.description="<Name> module for Red Hat OpenShift AI Dashboard" \
      io.openshift.tags="rhods,rhoai,odh,<name>"

WORKDIR /
COPY --from=bff-builder /usr/src/app/bff ./
COPY --from=ui-builder /usr/src/workspace/${UI_SOURCE_CODE}/dist ./static/
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/bff"]
```

## Type B: Standalone Go Component

### Upstream — `<name>/Dockerfile`

Simple Go builder + UBI minimal runtime. Build from repo root.

```dockerfile
FROM golang:<go-version> AS builder
WORKDIR /usr/src/app

COPY <name>/go.mod <name>/go.sum ./
RUN go mod download

COPY <name>/cmd/ cmd/
COPY <name>/api/ api/
COPY <name>/internal/ internal/

RUN CGO_ENABLED=0 GOOS=linux go build -a -o /tmp/<binary-name> ./cmd/<entry-dir>

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.3
WORKDIR /
COPY --from=builder /tmp/<binary-name> .
# Copy any required static assets (e.g., manifests)
COPY manifests/ /opt/manifests/dashboard/
RUN chmod -R g+w /opt/manifests/dashboard/

USER 65532:65532
ENTRYPOINT ["/<binary-name>"]
```

### Downstream — `Dockerfile.konflux.<name>`

SHA-pinned, FIPS-compliant, Red Hat labels. Placed at repo root in `red-hat-data-services/odh-dashboard`.

```dockerfile
FROM registry.redhat.io/ubi9/go-toolset:<go-version>@sha256:<digest> AS builder

USER root
WORKDIR /usr/src/app

COPY <name>/go.mod <name>/go.sum ./
RUN go mod download

COPY <name>/cmd/ cmd/
COPY <name>/api/ api/
COPY <name>/internal/ internal/

# FIPS-compliant build: CGO_ENABLED=1 + strictfipsruntime
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags="-s -w" -tags strictfipsruntime -o /tmp/<binary-name> ./cmd/<entry-dir>

FROM registry.access.redhat.com/ubi9/ubi-minimal@sha256:<digest>

LABEL com.redhat.component="odh-<name>-container" \
      name="managed-open-data-hub/odh-<name>-rhel9" \
      summary="ODH <Name>" \
      description="<Name> for Red Hat OpenShift AI Dashboard" \
      io.k8s.display-name="ODH <Name>" \
      io.k8s.description="<Name> for Red Hat OpenShift AI Dashboard" \
      io.openshift.tags="rhods,rhoai,odh,<name>"

WORKDIR /
COPY --from=builder /tmp/<binary-name> .
COPY manifests/ /opt/manifests/dashboard/
RUN chmod -R g+w /opt/manifests/dashboard/

USER 65532:65532
ENTRYPOINT ["/<binary-name>"]
```

## Go Toolset Notes

- **Type A upstream (BFF)**: Uses `ubi9/go-toolset` with `CGO_ENABLED=1 -tags strictfipsruntime` (FIPS-enabled, matching downstream)
- **Type B upstream (standalone)**: Uses Docker Hub `golang:<version>` with `CGO_ENABLED=0` (static binary, no FIPS)
- **All downstream**: Uses `registry.redhat.io/ubi9/go-toolset` with `CGO_ENABLED=1 -tags strictfipsruntime`
- `go-toolset` requires `USER root` before writing files (runs as non-root by default)
- The FIPS runtime tag enables BoringCrypto for FIPS 140-2 compliance
- Check `go.mod` for the required Go toolchain version

## SHA Digest Management

Downstream Dockerfiles use SHA digests instead of tags. Complete this workflow **before Phase 4** generates the downstream Dockerfile.

### Step 1: Query current digests for each base image

```bash
# Node.js base image (Type A only)
skopeo inspect docker://registry.access.redhat.com/ubi9/nodejs-22:latest \
  --format '{{.Digest}}'

# Go toolset (Type A BFF or Type B)
skopeo inspect docker://registry.redhat.io/ubi9/go-toolset:1.25 \
  --format '{{.Digest}}'

# UBI minimal runtime
skopeo inspect docker://registry.access.redhat.com/ubi9/ubi-minimal:latest \
  --format '{{.Digest}}'
```

### Step 2: Validate digests

Verify each returned digest matches the expected image by pulling and inspecting:

```bash
# Pull with the digest and confirm the image runs
podman pull registry.access.redhat.com/ubi9/ubi-minimal@sha256:<digest>
podman inspect registry.access.redhat.com/ubi9/ubi-minimal@sha256:<digest> \
  --format '{{.RepoDigests}}'
```

### Step 3: Insert digests into the Dockerfile

Replace all `@sha256:<digest>` placeholders in the downstream Dockerfile with the actual digest values from Step 1.

### Step 4: After merge — Renovate takes over

Once the Dockerfile is merged to the downstream repo, Renovate (configured by DevOps onboarding) automatically monitors for base image updates and opens PRs with refreshed digests. No manual digest management is needed after the initial setup.
