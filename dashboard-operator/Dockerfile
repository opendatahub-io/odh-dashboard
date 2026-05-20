FROM golang:1.25 AS builder

WORKDIR /usr/src/app

COPY dashboard-operator/go.mod dashboard-operator/go.sum ./
RUN go mod download

COPY dashboard-operator/cmd/ cmd/
COPY dashboard-operator/api/ api/
COPY dashboard-operator/internal/ internal/

RUN CGO_ENABLED=0 GOOS=linux go build -a -o /tmp/manager ./cmd/manager

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.3

WORKDIR /

COPY --from=builder /tmp/manager .
COPY manifests/ /opt/manifests/dashboard/
RUN chmod -R g+w /opt/manifests/dashboard/

USER 65532:65532

ENTRYPOINT ["/manager"]
