# Source code for the repos
ARG UI_SOURCE_CODE=./frontend
ARG OPENSHELL_BFF_IMAGE=quay.io/gkrumbach07/openshell-dashboard@sha256:6b09b05323a8ff39ae7ff14567687ed6e7ec244ef59b7663a9c1a2021dcee5e8

# Set the base images for the build stages
ARG NODE_BASE_IMAGE=node:22
ARG DISTROLESS_BASE_IMAGE=gcr.io/distroless/static:nonroot

# The OpenShell project owns this executable. Keep the digest synchronized
# with bff/upstream.lock.yaml.
FROM ${OPENSHELL_BFF_IMAGE} AS upstream-bff

# UI build stage
FROM ${NODE_BASE_IMAGE} AS ui-builder

ARG UI_SOURCE_CODE
ARG DEPLOYMENT_MODE
ARG STYLE_THEME

WORKDIR /usr/src/app

# Copy the source code to the container
COPY ${UI_SOURCE_CODE} /usr/src/app

# Install the dependencies and build
RUN npm cache clean --force
RUN npm ci
RUN npm run build:prod

# Final stage
# Keep the ODH runtime and frontend assets; import only the upstream binary.
FROM ${DISTROLESS_BASE_IMAGE}
WORKDIR /
COPY --from=upstream-bff /usr/local/bin/openshell-dashboard /openshell-dashboard
COPY --from=ui-builder /usr/src/app/dist ./static/
USER 65532:65532

ENV PORT=8080 \
    STATIC_DIR=/static

EXPOSE 8080

ENTRYPOINT ["/openshell-dashboard"]
