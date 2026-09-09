# Agent Ops BFF

Agent Ops consumes the BFF published by the
[OpenShell Dashboard](https://github.com/Gkrumbach07/openshell-dashboard)
project. This repository does not copy, compile, or modify the upstream Go
source.

The exact source tag, commit, image digest, and executable path are recorded in
[`upstream.lock.yaml`](./upstream.lock.yaml). Both Agent Ops Dockerfiles import
the executable from that immutable image and package it with the existing Agent
Ops frontend assets.

## Runtime contract

The pinned upstream BFF:

- listens on the configured `PORT`;
- serves HTTPS when `TLS_CERT_FILE` and `TLS_KEY_FILE` are provided;
- serves health at `/api/v1/healthz`;
- serves its API below `/api/v1`;
- reads the gateway address from `OPENSHELL_GATEWAY_URL`;
- reads optional gateway TLS files from `GATEWAY_CA_CERT`,
  `GATEWAY_CLIENT_CERT`, and `GATEWAY_CLIENT_KEY`; and
- accepts the proxy-injected token through `x-forwarded-access-token`, with an
  `Authorization: Bearer` fallback.

The ODH Dashboard proxy maps `/agent-ops/api` to `/api` and
`/agent-ops/healthcheck` to `/api/v1/healthz`.

## Run locally

Build the assembled Agent Ops image, then start its imported BFF.

1. Install the repository dependencies with `npm install` from the repository
   root.
2. Choose Docker or Podman. Set `CONTAINER_TOOL=podman` when using Podman.
3. Set `OPENSHELL_GATEWAY_URL` to a gateway that the BFF container can reach.
4. Build the workspace-aware image and start the BFF.

```bash
cd packages/agent-ops

export CONTAINER_TOOL=podman
export OPENSHELL_GATEWAY_URL=grpcs://gateway.example.com:443

make docker-build-workspace
make dev-bff
```

The BFF listens on `http://127.0.0.1:4021`. Keep the `make dev-bff` terminal
open while testing it from another terminal.

Check the BFF process first:

```bash
curl -fsS http://127.0.0.1:4021/api/v1/healthz | jq .
```

Expect `{"status":"ok"}`. This checks only that the BFF process is running.

Then check the gateway connection:

```bash
curl -fsS http://127.0.0.1:4021/api/v1/readyz | jq .
```

Expect `{"status":"ready"}`. This checks that the BFF can reach its
configured OpenShell gateway.

## Connect to a gateway

This step is optional. Use it when the gateway runs on an OpenShift cluster
that is not otherwise reachable from your machine.

In one terminal, forward the gateway service port. Replace the placeholder
values with the namespace, service, and gRPC port for your cluster.

```bash
oc -n <gateway-namespace> port-forward svc/<gateway-service> 8090:<gateway-grpc-port>
```

Keep that command running. Then configure the BFF in another terminal.

On macOS with Podman, the BFF runs inside the Podman virtual machine. Use
`host.containers.internal`, not `127.0.0.1`, to reach the port-forward on your
Mac.

```bash
export CONTAINER_TOOL=podman
export OPENSHELL_GATEWAY_URL=grpc://host.containers.internal:8090
make dev-bff
```

Use `grpc://` only when the forwarded gateway port serves plaintext gRPC. Use
`grpcs://` for a TLS-enabled gateway. For a TLS gateway that requires a client
certificate, set `GATEWAY_CERT_DIR` before starting the BFF. The directory must
contain `ca.crt`, `tls.crt`, and `tls.key`.

```bash
export OPENSHELL_GATEWAY_URL=grpcs://gateway.example.com:443
export GATEWAY_CERT_DIR=/path/to/gateway-certificates
make dev-bff
```

## Authentication and compatibility

By default, the BFF forwards a user token from
`x-forwarded-access-token` or `Authorization: Bearer`. The gateway validates
that token and decides what the user may do.

For a local-development gateway that explicitly allows unauthenticated users,
start the BFF with development authentication disabled:

```bash
AUTH_DISABLED=true make dev-bff
```

This setting is for local development only. Do not use it for a deployed BFF.
An `oc whoami -t` token works only when the OpenShell gateway is configured to
accept that token's issuer and audience.

Gateway features depend on the gateway version. In particular, lifecycle
endpoints such as sandbox stop and start require a gateway that implements
those operations.

## POC limitations

This artifact is a proof of concept. The upstream binary is not built by the
ODH toolchain with `strictfipsruntime`. Production promotion requires an
ODH-compatible FIPS provenance story.

Gateway configuration and mTLS material are provided only to local and ROSA
test runs in this POC; no Dashboard custom-resource API is introduced.
