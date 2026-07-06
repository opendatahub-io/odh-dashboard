# Backend build stage
# Build from repository root: docker build -f packages/gen-ai/bff/Dockerfile .
FROM registry.redhat.io/ubi9/go-toolset:1.26 AS builder
WORKDIR /usr/src/app
COPY packages/gen-ai/bff/go.mod packages/gen-ai/bff/go.sum ./
COPY pkg/tls/ /pkg/tls/
RUN go mod download
COPY packages/gen-ai/bff/cmd/ cmd/
COPY packages/gen-ai/bff/internal/ internal/
RUN CGO_ENABLED=0 GOOS=linux go build -a -o /tmp/bff ./cmd

# Final minimal image
FROM registry.access.redhat.com/ubi9/ubi-minimal:9.3
WORKDIR /
COPY --from=builder /tmp/bff ./
COPY packages/gen-ai/bff/static/ ./static/
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
