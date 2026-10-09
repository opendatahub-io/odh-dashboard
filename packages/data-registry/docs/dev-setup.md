# Data Registry Development Setup

## Requirements

- [Node.js](https://nodejs.org/) `>=22.18.0`
- [pnpm](https://pnpm.io/) `11.22.0` (pinned in the repository root)
- Go `>=1.26.0` for the BFF (see `packages/data-registry/bff/go.mod`)
- `oc` or `kubectl` when using a real cluster

## Install

From the repository root:

```bash
pnpm install
cd packages/data-registry
```

## Mock Development

Use mock mode for normal UI and BFF development. It requires no cluster:

```bash
make dev-start
```

This starts the frontend and BFF together. The BFF uses an envtest Kubernetes
client and mocked upstream HTTP calls.

Build the package without starting it:

```bash
make build
```

## Federated Development

Use federated mode when testing the dashboard integration against a real
RHOAI/OpenShift environment:

```bash
oc whoami
oc config current-context
DATA_REGISTRY_API_URL=https://127.0.0.1:8443 make dev-start-federated
```

The cluster must already provide a Data Registry API and the developer must be
able to reach it through the configured port-forward or API URL. Set
`DATA_REGISTRY_API_URL` explicitly for local federated development: the BFF's
in-cluster ConfigMap discovery depends on `POD_NAMESPACE`, which is injected
into a deployed pod but is not present in a local shell. Without the explicit
URL, registry requests can return `503`.

This command does not install the Data Registry backend. The full cluster and
port-forward setup is in [Full Environment Setup](environment-setup.md).

See [Environment Variables](env-variables.md) for upstream API discovery,
authentication, and proxy settings.
