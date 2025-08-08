# Source code for the repos
ARG UI_SOURCE_CODE=./frontend
ARG BFF_SOURCE_CODE=./bff

# Set the base images for the build stages
ARG NODE_BASE_IMAGE=registry.access.redhat.com/ubi9/nodejs-20:latest
ARG GOLANG_BASE_IMAGE=registry.access.redhat.com/ubi9/go-toolset:1.24.4-1754467841
ARG DISTROLESS_BASE_IMAGE=registry.access.redhat.com/ubi9-minimal:latest

# UI build stage
FROM ${NODE_BASE_IMAGE} AS ui-builder

ARG UI_SOURCE_CODE
ARG DEPLOYMENT_MODE
ARG PLATFORM_MODE

WORKDIR /usr/src/app

# Copy the source code to the container
COPY --chown=default:root ${UI_SOURCE_CODE} /usr/src/app

# Change file ownership to the assemble user
USER default

# Install the dependencies and build
RUN npm cache clean --force
RUN npm ci --omit=optional
RUN npm run build

# BFF build stage
FROM ${GOLANG_BASE_IMAGE} AS bff-builder

ARG BFF_SOURCE_CODE

ARG TARGETOS
ARG TARGETARCH

WORKDIR /usr/src/app

# Copy the Go Modules manifests
COPY ${BFF_SOURCE_CODE}/go.mod ${BFF_SOURCE_CODE}/go.sum ./

# Download dependencies
RUN go mod download

# Copy the go source files
COPY ${BFF_SOURCE_CODE}/cmd/ cmd/
COPY ${BFF_SOURCE_CODE}/internal/ internal/

# Build the Go application
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -a -o bff ./cmd

# Final stage
# Use distroless as minimal base image to package the application binary
FROM ${DISTROLESS_BASE_IMAGE}
WORKDIR /
COPY --from=bff-builder /usr/src/app/bff ./
COPY --from=ui-builder /usr/src/app/dist ./static/
USER 65532:65532

# Expose port 8080
EXPOSE 8080

ENTRYPOINT ["/bff"]
