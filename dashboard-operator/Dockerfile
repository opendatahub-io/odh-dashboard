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
COPY --chown=65532:0 manifests/ /opt/manifests/dashboard/
RUN chmod -R g+w /opt/manifests/dashboard/modular-architecture/modules/ \
    && chmod g+w /opt/manifests/dashboard/odh/params.env \
    && chmod g+w /opt/manifests/dashboard/modular-architecture/params.env

USER 65532:65532

ENTRYPOINT ["/manager"]
