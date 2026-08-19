# Backend build stage
FROM registry.redhat.io/ubi9/go-toolset:1.25 AS builder
WORKDIR /usr/src/app
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ cmd/
COPY internal/ internal/
RUN CGO_ENABLED=0 GOOS=linux go build -a -o /tmp/bff ./cmd

# Final minimal image
FROM registry.access.redhat.com/ubi9/ubi-minimal:9.3
WORKDIR /
COPY --from=builder /tmp/bff ./
COPY static/ ./static/
COPY openapi/ ./openapi/

# OAuth environment variables
ENV OAUTH_ENABLED=false \
    OAUTH_CLIENT_ID="" \
    OAUTH_CLIENT_SECRET="" \
    OAUTH_REDIRECT_URI="" \
    OAUTH_SERVER_URL=""

USER 1001
EXPOSE 8080
CMD ["/bff"]
