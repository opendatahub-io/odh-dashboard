# Agent Ops

Agent Ops is an ODH Dashboard federated module. The existing frontend remains
in `frontend/`; its BFF is consumed as a published OpenShell Dashboard image
rather than built from Go source in this repository.

The authoritative upstream artifact is recorded in
[`bff/upstream.lock.yaml`](./bff/upstream.lock.yaml). The package Dockerfiles
copy only the upstream executable, then add the existing Agent Ops frontend
assets to the downstream runtime image.

## ODH module integration

ODH keeps its established Agent Ops service and proxy prefixes while adapting
their targets to the upstream runtime:

| ODH path | Upstream path |
| --- | --- |
| `/agent-ops/api/...` | `/api/...` |
| `/agent-ops/healthcheck` | `/api/v1/healthz` |

The deployed module uses HTTPS on port `8843`, backed by the OpenShift
serving-cert secret mounted at `/etc/tls/private`. The dashboard proxy forwards
the authenticated user token in `x-forwarded-access-token`; the upstream BFF
forwards that identity to the OpenShell gateway. The standard
`Authorization: Bearer` fallback is used by the command-line ROSA smoke test.

This integration assumes the imported upstream image includes inbound BFF TLS
support. Production promotion still requires an ODH-compatible FIPS provenance
story for the imported executable.

## Local development

From `packages/agent-ops`, build the assembled image and run it with the
existing frontend:

```bash
export OPENSHELL_GATEWAY_URL=grpcs://gateway.example.com:443
export GATEWAY_CERT_DIR=/path/to/gateway-certificates # optional
make dev-start-federated
```

For BFF-only build, run, gateway, and authentication instructions, see the
[Agent Ops BFF README](./bff/README.md).

When supplied, `GATEWAY_CERT_DIR` must contain `ca.crt`, `tls.crt`, and
`tls.key`. The directory is mounted read-only and mapped to the upstream
gateway TLS environment variables.

Frontend-only targets remain available:

```bash
make dev-frontend
make dev-frontend-federated
make frontend-build
```

## Verification

Run downstream packaging and module-integration checks:

```bash
npm run test:contract
```

These tests do not duplicate upstream API behavior. To prove that the assembled
image can reach a ROSA-hosted gateway with an authenticated request, run:

```bash
AGENT_OPS_IMAGE=agent-ops-openshell-federated:local \
OPENSHELL_GATEWAY_URL=grpcs://gateway.example.com:443 \
GATEWAY_CERT_DIR=/path/to/gateway-certificates \
ROSA_BEARER_TOKEN=... \
OPENSHELL_WORKSPACE=my-workspace \
npm run test:integration:rosa
```

The ROSA check is read-only. It does not print the bearer token or response and
does not create or delete sandboxes.

## Scope

The local Agent Ops Go BFF and its OpenAPI contract have been removed. The
upstream project owns BFF behavior and API tests. Frontend API migration,
versioned upstream releases, production gateway-secret management, and FIPS
hardening remain separate work.
