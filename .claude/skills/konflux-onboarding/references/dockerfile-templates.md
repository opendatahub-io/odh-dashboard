# Dockerfile Templates

Templates for container images in `odh-dashboard`. Each component needs up to 2 Dockerfiles:

1. **Upstream (ODH)**: Used by Konflux CI in `opendatahub-io/odh-dashboard`
2. **Downstream (RHOAI)**: Used by Konflux in `red-hat-data-services/odh-dashboard`

## Upstream vs Downstream Differences

| Aspect                  | Upstream (ODH)                                 | Downstream (RHOAI)                                   |
| ----------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Image tags              | Tag-based (e.g., `ubi9/nodejs-22:latest`)      | **SHA-pinned** (e.g., `ubi9/nodejs-22@sha256:...`)   |
| Go build flags (Type A) | `CGO_ENABLED=1 -tags strictfipsruntime` (FIPS) | Same as upstream                                     |
| Go build flags (Type B) | `CGO_ENABLED=0` (static, no FIPS)              | `CGO_ENABLED=1 -tags strictfipsruntime` (FIPS)       |
| Labels                  | Minimal                                        | Full Red Hat labels required                         |
| Location                | Component directory or `packages/<name>/`      | Repo root as `Dockerfile.konflux.<component>`        |
| Registry                | `registry.access.redhat.com`                   | `registry.access.redhat.com` or `registry.redhat.io` |

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
ARG GOLANG_BASE_IMAGE=registry.access.redhat.com/ubi9/go-toolset:1.26
ARG DISTROLESS_BASE_IMAGE=registry.access.redhat.com/ubi9-minimal:latest

# UI build stage
FROM ${NODE_BASE_IMAGE} AS ui-builder
ARG UI_SOURCE_CODE
ARG MODULE_NAME
WORKDIR /usr/src/workspace

# Workspace setup — copy npm bootstrap, root manifests + shared packages
COPY --chown=default:root prefetch/pnpm/package.json prefetch/pnpm/package-lock.json ./prefetch/pnpm/
COPY --chown=default:root package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=default:root .npmrc ./
COPY --chown=default:root frontend/package.json ./frontend/
COPY --chown=default:root packages/plugin-core/ ./packages/plugin-core/
COPY --chown=default:root packages/tsconfig/ ./packages/tsconfig/
COPY --chown=default:root packages/app-config/ ./packages/app-config/
COPY --chown=default:root frontend/src/ ./frontend/src/
COPY --chown=default:root ${UI_SOURCE_CODE} ./${UI_SOURCE_CODE}

USER default
# Install the pinned pnpm CLI from the npm-prefetched bootstrap package.
ENV PATH="/usr/src/workspace/prefetch/pnpm/node_modules/.bin:${PATH}"
RUN npm ci --prefix ./prefetch/pnpm --prefer-offline --ignore-scripts --no-audit --no-fund --no-progress \
    && test "$(pnpm --version)" = "11.22.0"
RUN pnpm install --frozen-lockfile --prefer-offline --ignore-scripts

WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN pnpm run build:prod

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

Copy of `$REF_DOCKERFILE` (normally `Dockerfile.konflux.data-connect-hub`; see SKILL.md Phase 3) on the target downstream branch (`red-hat-data-services/odh-dashboard`, repo root), with the module name replaced. Re-copy from the branch rather than trusting this snapshot: MintMaker refreshes the digests there, and the install steps change with the workspace.

Key differences from upstream `Dockerfile.workspace`:

- All base images pinned by SHA digest; runtime is `registry.redhat.io/ubi9/ubi-minimal-pqc`
- `pnpm install --offline` against the Hermeto-prefetched store, `CYPRESS_INSTALL_BINARY=0`
- Red Hat labels named after the image: `com.redhat.component="<image>-container"` and `name="managed-open-data-hub/<image>-rhel9"`, where `<image>` is the Phase 0 image name (default `odh-mod-arch-<name>`). The ProdSec registration key is a separate identifier, `rhoai/<image>-rhel9` (see SKILL.md Phase 6)
- `CACHITO_ENV_FILE` support is optional — Konflux Cachi2 injects this file automatically during hermetic builds when prefetch is enabled; no Dockerfile changes are needed unless you opt into sourcing it explicitly

The committed downstream file installs with `pnpm install --frozen-lockfile --offline`, which only works with the dependencies Hermeto prefetches in Konflux. A plain local `podman build` / `docker build` of it fails at that step even with network access. For a local smoke test, build a temporary copy with `--offline` replaced by `--prefer-offline` (for example `sed 's/--offline/--prefer-offline/' Dockerfile.konflux.<name> > /tmp/Dockerfile.local`), and keep `--offline` in the committed file.

Snapshot from `rhoai-3.7-ea.1` (digests replaced with placeholders):

```dockerfile
# Multi-stage workspace-aware Dockerfile for Module Federation packages (RHOAI downstream)
# This Dockerfile is designed to build federated modules that depend on workspace packages
# Build from repository root: docker build --file ./Dockerfile.konflux.<name> .

# Source code arguments - can be overridden for different modules
ARG MODULE_NAME=<name>
ARG UI_SOURCE_CODE=./packages/${MODULE_NAME}/frontend
ARG BFF_SOURCE_CODE=./packages/${MODULE_NAME}/bff

# SHA-pinned base images for RHOAI builds
ARG NODE_BASE_IMAGE=registry.access.redhat.com/ubi9/nodejs-22@sha256:<digest>
ARG GOLANG_BASE_IMAGE=registry.access.redhat.com/ubi9/go-toolset:1.26@sha256:<digest>
ARG DISTROLESS_BASE_IMAGE=registry.redhat.io/ubi9/ubi-minimal-pqc@sha256:<digest>

# UI build stage
FROM ${NODE_BASE_IMAGE} AS ui-builder

ARG UI_SOURCE_CODE
ARG MODULE_NAME
ARG DEPLOYMENT_MODE
ARG PLATFORM_MODE

WORKDIR /usr/src/workspace

# Install the pinned pnpm CLI from the npm-prefetched bootstrap package.
COPY --chown=default:root prefetch/pnpm/package.json prefetch/pnpm/package-lock.json ./prefetch/pnpm/

### Workspace setup
# Copy root workspace manifest and lockfile for pnpm workspace resolution
# Hermeto rewrites .npmrc to point pnpm at its prefetched, offline tarball mirror.
COPY --chown=default:root package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
# Copy the frontend workspace manifest so its dependencies can be resolved if referenced
COPY --chown=default:root frontend/package.json ./frontend/
# Copy required shared workspace packages needed for module builds
COPY --chown=default:root packages/app-config/ ./packages/app-config/
COPY --chown=default:root packages/foundation/ ./packages/foundation/
COPY --chown=default:root packages/k8s-core/ ./packages/k8s-core/
COPY --chown=default:root packages/plugin-core/ ./packages/plugin-core/
COPY --chown=default:root packages/tsconfig/ ./packages/tsconfig/
COPY --chown=default:root packages/ui-core/ ./packages/ui-core/
# Copy only the frontend source (not the entire frontend build artifacts) for cross-module imports
COPY --chown=default:root frontend/src/ ./frontend/src/
COPY --chown=default:root scripts/ ./scripts/

# Copy the specific module source code
COPY --chown=default:root ${UI_SOURCE_CODE} ./${UI_SOURCE_CODE}

# Change file ownership to the assemble user
USER default

# Install pnpm and workspace dependencies. Lifecycle scripts are restricted by
# pnpm-workspace.yaml allowBuilds; Cypress binary installation is disabled explicitly.
# Install the pinned pnpm CLI from the npm-prefetched bootstrap package.
ENV PATH="/usr/src/workspace/prefetch/pnpm/node_modules/.bin:${PATH}"
RUN npm ci --prefix ./prefetch/pnpm --prefer-offline --ignore-scripts --no-audit --no-fund --no-progress \
    && test "$(pnpm --version)" = "11.22.0" # NOSONAR
RUN CYPRESS_INSTALL_BINARY=0 pnpm install --frozen-lockfile --offline # NOSONAR

# Build the module
WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN pnpm run build:prod

# BFF build stage
FROM ${GOLANG_BASE_IMAGE} AS bff-builder

ARG BFF_SOURCE_CODE
ARG TARGETOS
ARG TARGETARCH

WORKDIR /usr/src/app

# Copy the Go Modules manifests
COPY ${BFF_SOURCE_CODE}/go.mod ${BFF_SOURCE_CODE}/go.sum ./
COPY pkg/tls/go.mod pkg/tls/go.sum /pkg/tls/

# Download dependencies
RUN go mod download

# Copy the go source files
COPY pkg/tls/ /pkg/tls/
COPY ${BFF_SOURCE_CODE}/cmd/ cmd/
COPY ${BFF_SOURCE_CODE}/internal/ internal/

# Build the Go application
RUN CGO_ENABLED=1 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -ldflags="-s -w" -tags strictfipsruntime -o bff ./cmd

# Final stage
FROM ${DISTROLESS_BASE_IMAGE}

ARG UI_SOURCE_CODE

WORKDIR /
COPY --from=bff-builder /usr/src/app/bff ./
COPY --from=ui-builder /usr/src/workspace/${UI_SOURCE_CODE}/dist ./static/
USER 65532:65532

# Expose port 8080
EXPOSE 8080

ENTRYPOINT ["/bff"]

LABEL com.redhat.component="<image>-container" \
      name="managed-open-data-hub/<image>-rhel9" \
      description="<image>" \
      summary="<image>" \
      maintainer="['managed-open-data-hub@redhat.com']" \
      io.openshift.expose-services="" \
      io.k8s.display-name="<image>" \
      io.k8s.description="<image>" \
      com.redhat.license_terms="https://www.redhat.com/licenses/Red_Hat_Standard_EULA_20191108.pdf"
```

### Hermetic prefetch configuration

Both Type A templates require `hermetic: true` and typed prefetch inputs on the Konflux PipelineRun:

```yaml
- name: hermetic
  value: true
- name: prefetch-input
  value: >-
    [{"path":".","type":"pnpm"},
    {"path":"prefetch/pnpm","type":"npm"},
    {"path":"packages/<name>/bff","type":"gomod"}]
```

Use the component's actual Go module path, and omit the `gomod` input for UI-only modules. Include `prefetch/pnpm/**` in path-change filters so bootstrap updates trigger builds. Copy Hermeto's injected root `.npmrc` with the workspace manifests to retain the prefetched registry configuration. Do not use a global pnpm install or a generic tarball input.

For upstream subtree frontends (Model Registry and Notebooks), also declare the frontend path as an `npm` prefetch input and install its npm lockfile with `--userconfig /usr/src/workspace/.npmrc`. See [Workspace Dockerfiles](../../../../docs/workspace-dockerfiles.md) for the hybrid pnpm/npm pattern.

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

FROM registry.access.redhat.com/ubi9/ubi-minimal:latest
# Do not pin a minor tag such as :9.3 upstream: it stops receiving security rebuilds.
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
FROM registry.access.redhat.com/ubi9/go-toolset:<go-version>@sha256:<digest> AS builder

USER root
WORKDIR /usr/src/app

COPY <name>/go.mod <name>/go.sum ./
RUN go mod download

COPY <name>/cmd/ cmd/
COPY <name>/api/ api/
COPY <name>/internal/ internal/

# FIPS-compliant build: CGO_ENABLED=1 + strictfipsruntime
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags="-s -w" -tags strictfipsruntime -o /tmp/<binary-name> ./cmd/<entry-dir>

FROM registry.redhat.io/ubi9/ubi-minimal-pqc@sha256:<digest>

LABEL com.redhat.component="<image>-container" \
      name="managed-open-data-hub/<image>-rhel9" \
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
- **All downstream**: Uses `registry.access.redhat.com/ubi9/go-toolset` with `CGO_ENABLED=1 -tags strictfipsruntime`
- `go-toolset` requires `USER root` before writing files (runs as non-root by default)
- The FIPS runtime tag enables BoringCrypto for FIPS 140-2 compliance
- Check `go.mod` for the required Go toolchain version

## SHA Digest Management

Downstream Dockerfiles use SHA digests instead of tags. Complete this workflow **before Phase 4** generates the downstream Dockerfile.

### Step 1: Take current digests from the target branch

Copy the `ARG *_BASE_IMAGE=` lines from an image that already ships on the target downstream branch. MintMaker keeps those digests current, including security rebuilds such as the eMudhra CA remediation (RHSB-2026-012):

```bash
git show "$DOWNSTREAM_REMOTE/$TARGET_BRANCH:$REF_DOCKERFILE" | grep -E '^ARG .*_BASE_IMAGE='
```

Only when no module exists on the branch, query the registry:

```bash
skopeo inspect docker://registry.access.redhat.com/ubi9/nodejs-22:latest --format '{{.Digest}}'
skopeo inspect docker://registry.access.redhat.com/ubi9/go-toolset:1.26 --format '{{.Digest}}'
skopeo inspect docker://registry.redhat.io/ubi9/ubi-minimal-pqc:latest --format '{{.Digest}}'
```

Use the Go minor version from the `go.mod` of the module actually built: for Type A, `go.mod` under the package Dockerfile's `BFF_SOURCE_CODE` (usually `packages/<name>/bff`, but `packages/model-registry/upstream/bff` for model-registry); for Type B, `<name>/go.mod`.

### Step 2: Validate digests

Verify each returned digest matches the expected image by pulling and inspecting:

```bash
# Pull with the digest and confirm the image runs
podman pull registry.redhat.io/ubi9/ubi-minimal-pqc@sha256:<digest>
podman inspect registry.redhat.io/ubi9/ubi-minimal-pqc@sha256:<digest> \
  --format '{{.RepoDigests}}'
# The runtime must carry the current ca-certificates RPM (Go uses the system trust store)
podman run --rm registry.redhat.io/ubi9/ubi-minimal-pqc@sha256:<digest> rpm -q ca-certificates
```

Compare the `ca-certificates` version with the other dashboard images on the branch; an older one means the digest predates a security rebuild.

### Step 3: Insert digests into the Dockerfile

Replace all `@sha256:<digest>` placeholders in the downstream Dockerfile with the actual digest values from Step 1.

### Step 4: After merge — Renovate takes over

Once the Dockerfile is merged to the downstream repo, MintMaker/Renovate (configured by DevOps onboarding) opens "Update Dockerfile Digest Updates" PRs with refreshed digests. Someone still has to review and merge them: during a security bulletin, check that the new file is included in the next digest PR before the rebuild deadline.
