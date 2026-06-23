FROM golang:1.26 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /usr/src/app

COPY dashboard-operator/go.mod dashboard-operator/go.sum ./
RUN go mod download

COPY dashboard-operator/cmd/ cmd/
COPY dashboard-operator/api/ api/
COPY dashboard-operator/internal/ internal/

RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH:-amd64} go build -a -ldflags="-s -w" -o /tmp/manager ./cmd/manager

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.3

WORKDIR /

COPY --from=builder /tmp/manager .
COPY manifests/ /opt/manifests/dashboard/

USER 65532:65532

ENTRYPOINT ["/manager"]
