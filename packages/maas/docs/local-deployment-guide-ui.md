# Local UI Development Guide

This guide covers running and building the MaaS frontend locally.

## Prerequisites

- Node.js >= 22.18.0
- pnpm 11.22.0 — install dependencies from the repository root with `pnpm install`

## Quick Start (No Cluster Required)

The fastest way to start the full stack locally in standalone mode:

```shell
cd packages/maas
make dev-start
```

This starts the BFF on port 4000 (mocked) and the frontend in standalone/MUI mode. Access the UI at http://localhost:4000.

## Frontend-Only Development

If the BFF is already running (or you just want to iterate on UI code), start the frontend separately:

```shell
cd packages/maas/frontend
DEPLOYMENT_MODE=standalone STYLE_THEME=mui-theme pnpm run start:dev
```

For federated/PatternFly mode (expects BFF on port 8081):

```shell
AUTH_METHOD=internal DEPLOYMENT_MODE=federated STYLE_THEME=patternfly PORT=9104 PROXY_PORT=8081 pnpm run start:dev
```

## Federated Mock Mode (No Cluster Required)

Runs both servers in federated/PatternFly mode with mocked backends — the closest experience to production without needing a cluster:

```shell
make dev-start-mock-federated
```

Access the UI at http://localhost:9104.

## Theme Differences Between Modes

| Mode | Theme | Port |
|------|-------|------|
| `standalone` | Material UI (MUI) | 4000 |
| `kubeflow` | Material UI (MUI) | 4000 |
| `federated` | PatternFly | 9104 |

Do not use PatternFly components in standalone/kubeflow mode, or MUI components in federated mode. The theme is determined by `STYLE_THEME` and `DEPLOYMENT_MODE`.

## Build Commands

Build the frontend for production:

```shell
# Federated (PatternFly) — used in production RHOAI builds
cd packages/maas/frontend && DEPLOYMENT_MODE=federated pnpm run build:prod

# Standalone (MUI)
cd packages/maas/frontend && DEPLOYMENT_MODE=standalone pnpm run build:prod
```

Or use the Makefile shortcuts from `packages/maas/`:

```shell
make frontend-build              # kubeflow mode
make frontend-build-standalone   # standalone mode
```

## Testing

Run unit tests:

```shell
pnpm run test-unit
```

Run Cypress mock tests (component + integration):

```shell
# Build first, then run tests headlessly
pnpm run cypress:server:build
pnpm run cypress:mock:dev
```

For full testing guidance, see [`frontend/docs/testing.md`](../frontend/docs/testing.md).
