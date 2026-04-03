[Guidelines]: ../guidelines.md
[BOOKMARKS]: ../../BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Module Federation Docs]: ../module-federation.md

# [Package Name]

**Last Updated**: YYYY-MM-DD | **Template**: package-template v1

## Overview

[1–3 sentences: what this package does, what user problem it solves, and its current maturity level.]

**Package path**: `packages/[package-name]/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` or `npm run start:dev` | `http://localhost:[port]` |
| Kubeflow | `make dev-start-kubeflow` | `http://localhost:[port]` |
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:4010` |

[Explain which modes apply to this package and any mode-specific behaviour differences.]

## BFF Architecture

> **Not applicable** — this package has no BFF. Skip to [Architecture](#architecture).

<!-- If BFF exists, replace the line above with: -->

```text
packages/[name]/bff/
├── cmd/main.go           # Entry point; accepts mock flags
├── internal/
│   ├── api/              # HTTP handlers
│   ├── models/           # Domain models
│   └── repositories/     # Data access (k8s, external APIs)
├── openapi/src/          # OpenAPI 3.0 specification
├── go.mod
└── Makefile
```

**Mock flags** accepted by `main.go`:
- `--mock-k8s-client` — use in-memory mock for Kubernetes
- `--mock-[service]-client` — [other mocks]

**Health endpoint**: `GET /healthcheck` — required for contract tests.

## OpenAPI Specification

> **Not applicable** — this package has no BFF.

<!-- If BFF exists, replace with: -->

**Location**: `packages/[name]/bff/openapi/src/[name].yaml` (or `upstream/api/openapi/`)

Key endpoint groups:
- `[/api/v1/resource]` — [description]

## Module Federation

**Config file**: `packages/[name]/frontend/config/webpack.common.js` (or `webpack.config.js`)

**Remote entry name**: `[remoteName]`

**Exposed modules**:
- `./[ModuleName]` — [what it exports; how the main dashboard loads it]

**Main dashboard registration**: `frontend/src/app/[extensionFile].ts` (or equivalent)

```bash
# Start in federated mode (also requires main dashboard running)
cd packages/[name]
make dev-start-federated
# Then in repo root:
npm run dev
```

## Architecture

```text
packages/[name]/
├── api/openapi/          # OpenAPI spec (if BFF)
├── bff/                  # Go BFF (if applicable)
├── frontend/
│   ├── src/
│   │   ├── app/          # App entry, routes, extensions
│   │   ├── components/   # Package-specific UI components
│   │   ├── pages/        # Page-level components
│   │   └── api/          # Frontend API calls to BFF
│   └── config/           # Webpack / Module Federation config
├── docs/
│   └── overview.md       # This file
├── Dockerfile
├── Makefile
└── package.json
```

[1–2 paragraphs on architectural decisions: why a BFF exists, how data flows from cluster through BFF to frontend.]

## Key Concepts

| Term | Definition |
|------|-----------|
| [Term] | [Definition scoped to this package] |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24 (if BFF)
- Access to an OpenShift / Kubernetes cluster (optional for mocked dev)

### Environment setup

```bash
cp packages/[name]/.env.local.example packages/[name]/.env.local
# Edit .env.local with your cluster details
```

### Start in standalone mode (recommended for development)

```bash
cd packages/[name]
make dev-start
# Frontend: http://localhost:[port]
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `4000` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `standalone` | No |
| `DEV_MODE` | Enable development features | `false` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |

[Full list in `packages/[name]/.env.local.example`.]

## Testing

### Contract Tests

```bash
cd packages/[name]
npm run test:contract
```

Validates frontend HTTP expectations against the BFF's OpenAPI schema.
Framework: `@odh-dashboard/contract-tests`. See [.claude/rules/contract-tests.md](../../.claude/rules/contract-tests.md).

### Frontend Unit Tests

```bash
npx turbo run test-unit --filter=@odh-dashboard/[package-name]
```

### Cypress Tests

```bash
# Mock tests
npm run test:cypress-ci -- --spec "**/[package-name]/**"
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package via Module Federation in federated mode |
| [Other package] | Package | [What this package needs from it] |
| [k8s resource] | Kubernetes API | [CRUD operations performed] |

## Known Issues / Gotchas

- [Known issue with context and workaround]
- [Deprecated pattern and preferred alternative]

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [BOOKMARKS] — full doc index
