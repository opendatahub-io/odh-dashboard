# Compatibility Dockerfile for root-context builds.
# Keep this aligned with Dockerfile.workspace; new deployment definitions should
# reference Dockerfile.workspace directly.
# Build from repository root: docker build -f packages/gen-ai/Dockerfile .

# Multi-stage workspace-aware Dockerfile for Module Federation packages
ARG MODULE_NAME=gen-ai
ARG UI_SOURCE_CODE=./packages/${MODULE_NAME}/frontend
ARG BFF_SOURCE_CODE=./packages/${MODULE_NAME}/bff

ARG NODE_BASE_IMAGE=registry.access.redhat.com/ubi9/nodejs-22:latest
ARG GOLANG_BASE_IMAGE=registry.access.redhat.com/ubi9/go-toolset:1.26
ARG DISTROLESS_BASE_IMAGE=registry.access.redhat.com/ubi9-minimal:latest

FROM ${NODE_BASE_IMAGE} AS ui-builder

ARG UI_SOURCE_CODE
ARG MODULE_NAME
ARG DEPLOYMENT_MODE=standalone
ARG PLATFORM_MODE

WORKDIR /usr/src/workspace

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
COPY --chown=default:root ${UI_SOURCE_CODE} ./${UI_SOURCE_CODE}

USER default

RUN npm install -g pnpm@11.22.0
RUN pnpm install --frozen-lockfile

WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN pnpm run build:prod

FROM ${GOLANG_BASE_IMAGE} AS bff-builder

ARG BFF_SOURCE_CODE
ARG TARGETOS
ARG TARGETARCH

WORKDIR /usr/src/app

COPY ${BFF_SOURCE_CODE}/go.mod ${BFF_SOURCE_CODE}/go.sum ./
RUN go mod download
COPY ${BFF_SOURCE_CODE}/cmd/ cmd/
COPY ${BFF_SOURCE_CODE}/internal/ internal/
COPY ${BFF_SOURCE_CODE}/openapi/ openapi/
RUN CGO_ENABLED=1 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -ldflags="-s -w" -tags strictfipsruntime -o bff ./cmd

FROM ${DISTROLESS_BASE_IMAGE}

ARG UI_SOURCE_CODE

WORKDIR /
COPY --from=bff-builder /usr/src/app/bff ./
COPY --from=bff-builder /usr/src/app/openapi/ ./openapi/
COPY --from=ui-builder /usr/src/workspace/${UI_SOURCE_CODE}/dist ./static/
USER 65532:65532

EXPOSE 8080

ENTRYPOINT ["/bff"]
