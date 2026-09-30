# Data Registry Development Setup

## Requirements

- [Node.js](https://nodejs.org/) `>=22.18.0`
- [pnpm](https://pnpm.io/) `11.22.0` (pinned in the repository root)
- Go `>=1.24.3` for the BFF
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
make dev-start-federated
```

The cluster must already provide a Data Registry API and the developer must be
able to reach it through the configured port-forward or API URL. This command
does not install the Data Registry backend.

For an RHOAI 3.6 deployment walkthrough, see the pinned
[Data Registry getting-started example](https://github.com/briangallagher/red-hat-ai-examples/blob/d242ab256f34519883643ec5a7f07341f97f772d/examples/data-registry/rhoai-3.6/getting-started.md).
That example covers enabling the Technology Preview component, PostgreSQL,
and the registry instance; use the current RHOAI documentation to validate
cluster-specific manifests before applying them.

See [Environment Variables](env-variables.md) for upstream API discovery,
authentication, and proxy settings.
