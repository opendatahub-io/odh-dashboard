---
description: Conventions for distribution variants — base app shell, core-bff, and rhaii
globs: "distributions/**"
alwaysApply: false
paths:
  - "distributions/**"
---

# Distribution Conventions

Distributions are independently-deployable dashboard variants in `distributions/`. They are NOT part of the npm workspace or Turbo pipeline — monorepo-wide `npm run` commands do not apply.

## Sub-distributions

| Directory | Type | Has BFF? | Build |
|-----------|------|----------|-------|
| `base/` | Shared app shell library (PatternFly chrome, no features) — **not deployed on its own** | Stub only | `npm run build` |
| `core-bff/` | Full Go BFF + React frontend for sidecar/xKC deployments | Yes (Go 1.25+) | `make build` |
| `rhaii/` | RHAII-specific distribution | No | `npm run build` |

> **`base/` is a library, not a deployable distribution.** It provides the shared app shell framework (masthead, sidebar, error boundary, theme context, extensibility hooks) that concrete distributions like `core-bff/` and `rhaii/` extend. Do not treat it as a standalone application.

## Isolation from npm workspaces

Distributions are self-contained. Always `cd` into the distribution directory before running commands:

```bash
# WRONG — distributions are invisible to the root workspace
npm run lint          # won't touch distributions/
npm run type-check    # won't touch distributions/

# RIGHT — run from within the distribution
cd distributions/base && npx eslint src/
cd distributions/core-bff && make lint
```

## Build and dev commands

### `base/` (shared library) and `rhaii/` (frontend-only)

`base/` is a library — run these commands for development and testing, not for standalone deployment. `rhaii/` is a deployable distribution that extends `base/`.

```bash
npm run build         # Webpack production build
npm run start:dev     # Webpack dev server (local development/testing only for base/)
npx eslint src/       # Lint
npx tsc --noEmit      # Type-check
```

### `core-bff/` (Go BFF + React frontend)

```bash
make dev-start                # Start both BFF and frontend in dev mode (mocked)
make dev-bff                  # BFF only on port 4000
make dev-frontend             # Frontend dev server only
make build                    # Build BFF + frontend
make dev-start-federated      # Start in federated mode
```

#### BFF commands (from `bff/`)

```bash
make run              # Run BFF
make lint             # golangci-lint
make test             # Go tests
make build            # Build binary
```

#### Frontend commands (from `frontend/`)

```bash
npm run test          # Full suite (lint + type-check + unit + cypress)
npm run test:lint     # Lint only
npm run test:type-check  # TypeScript check
npm run test:unit     # Jest unit tests
npm run test:cypress-ci  # Cypress headless
```

#### Contract tests

```bash
npm run test:contract           # Both platforms
npm run test:contract:openshift # Foundation + OpenShift tests
npm run test:contract:xks       # Foundation + XKS tests
```

## Module Federation

`base/` and `rhaii/` are Module Federation **hosts** — they load federated remotes at runtime. Webpack configs in `config/` define the host setup. `core-bff/frontend/` also supports federated mode via `config/moduleFederation.js`.

When modifying Module Federation config in distributions, verify that remote names and shared dependencies stay consistent with the host dashboard's expectations.

## core-bff contract-first workflow

`core-bff/` follows a mandatory 4-stage development flow. See `core-bff/AGENTS.md` for full details:

1. **Contract first** — Update OpenAPI spec in `bff/openapi/src/core-bff.yaml`
2. **BFF stub second** — Implement handlers in `bff/internal/api/`
3. **Frontend third** — Build UI in `frontend/src/app/`
4. **Production BFF last** — Replace mocks with real Kubernetes logic

## core-bff deployment modes

| Mode | Description | BFF Port | Frontend Port |
|------|-------------|----------|---------------|
| `standalone` | UI served by BFF, isolated deployment | 4000 | 4000 (static) |
| `federated` | Micro-frontend loaded by host dashboard | 8082 | 9112 (dev) / 8843 (prod) |

## Common mistakes

- **Running `npm install` from a distribution directory without the workspace workaround** — dependencies on internal packages (`@odh-dashboard/eslint-config`, `@odh-dashboard/tsconfig`) won't resolve. See `distributions/base/README.md` for the workaround.
- **Confusing `core-bff/bff/` with `dashboard-operator/`** — They are separate Go modules with different `go.mod` files and different patterns. `core-bff/bff/` is an HTTP BFF (uses httprouter); `dashboard-operator/` is a Kubernetes controller (uses controller-runtime).
- **Assuming monorepo-wide lint/test commands cover distributions** — They don't. Always run validation from within the distribution directory.
- **Forgetting to update the OpenAPI spec** when adding new endpoints to `core-bff/bff/` — Reviewers must see a diff in the OpenAPI file alongside code changes.
