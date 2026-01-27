# AGENTS.md - Mod Arch UI (MaaS)

This document provides guidance for AI agents working on the Mod Arch UI project.
This is a **modular architecture starter** for building scalable applications with a React frontend
and Go backend-for-frontend (BFF).

## Mandatory Development Flow

**CRITICAL: Never skip or reorder these stages. A PR that implements UI before the API contract will
be rejected.**

> Standards in this document follow [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119) language
> (MUST, SHOULD, MAY).

### 1. Contract First

You MUST describe every capability in `api/openapi/maas.yaml` (or a new file under `api/openapi/`).
All request/response objects MUST be documented before coding. Requests MUST use standard HTTP verbs
(GET, POST, PUT, PATCH, DELETE) and response objects MUST follow JSON standards.

### 2. BFF Stub Second

You MUST add handlers and mock-returning services in `bff/internal/api` and `bff/internal/mocks` that
satisfy the new contract. Wire them in `bff/cmd/main.go`.

### 3. Frontend Third

Build UI routes inside `frontend/src/app` only after the stub endpoints respond with realistic
shapes. You MUST consume generated types instead of duplicating schemas. You MUST ensure
unidirectional dataflow that is governed by the backend API contracts.

### 4. Production BFF Last

Replace mocks with Kubernetes-aware logic (repositories, clients, RBAC) before shipping. Gate new
features behind feature flags/env vars defined in `cmd/main.go`. You SHOULD keep the feature flagged
off and escalate to a human for final acceptance testing. To smoke test locally:

```bash
# Run BFF with mocks against local cluster
make dev-bff

# Verify endpoints respond correctly
curl http://localhost:4000/api/v1/your-endpoint
```

---

## Project Structure

```text
maas/
├── api/
│   └── openapi/
│       └── maas.yaml            # OpenAPI specification (contract-first)
├── bff/                         # Go Backend-for-Frontend
│   ├── cmd/
│   │   └── main.go              # Application entrypoint and wiring
│   ├── internal/
│   │   ├── api/                 # HTTP handlers
│   │   ├── config/              # Configuration management
│   │   ├── constants/           # Shared constants
│   │   ├── helpers/             # Utility functions (k8s helpers)
│   │   ├── integrations/        # External service integrations
│   │   ├── mocks/               # Mock data and stub implementations
│   │   ├── models/              # DTOs and data models
│   │   └── repositories/        # Data access layer
│   ├── static/                  # Static assets served by BFF
│   ├── Makefile                 # Build and run commands
│   ├── go.mod                   # Go module definition
│   └── README.md                # BFF documentation
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx          # Root application component
│   │   │   ├── routes.tsx       # Route definitions
│   │   │   ├── api/             # API client wrappers
│   │   │   ├── context/         # React context providers
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── pages/           # Page components
│   │   │   └── utilities/       # Frontend utilities
│   │   ├── __mocks__/           # Jest mocks
│   │   └── __tests__/           # Test files
│   ├── config/
│   │   ├── webpack.common.js    # Shared webpack config
│   │   ├── webpack.dev.js       # Development webpack config
│   │   ├── webpack.prod.js      # Production webpack config
│   │   └── moduleFederation.js  # Module Federation config
│   ├── package.json             # NPM dependencies and scripts
│   └── README.md                # Frontend documentation
├── docs/                        # Project documentation
├── scripts/                     # Utility scripts
├── Dockerfile                   # Container image build
├── Makefile                     # Root-level make commands
└── README.md                    # Project overview
```

---

## Development Requirements

### Frontend

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0

### BFF

- **Go**: >= 1.24

---

## Quick Start Commands

### Development Environment

```bash
# Install frontend dependencies
make dev-install-dependencies

# Start both BFF and frontend in development mode (mocked)
make dev-start

# Or start them separately:
make dev-bff         # BFF on port 4000 with mocks
make dev-frontend    # Frontend dev server
```

### Deployment Modes

```bash
# Standalone mode (default for local development)
make dev-start

# Kubeflow mode (connects to real cluster)
make dev-start-kubeflow

# Federated mode (micro-frontend with PatternFly theme)
make dev-start-federated
```

### Building

```bash
# Build everything
make build

# Build frontend only
make frontend-build

# Build BFF only
make bff-build

# Docker builds
make docker-build              # Kubeflow mode
make docker-build-standalone   # Standalone mode
make docker-build-federated    # Federated mode
```

### Testing

```bash
# Frontend tests (lint + type-check + unit + cypress)
cd frontend && npm run test

# BFF tests
cd bff && make lint && make test

# Run local mocked build
make run-local-mocked
```

---

## API Contract Rules ([api/](api/))

A module MUST be defined as a directory inside of [packages](https://github.com/opendatahub-io/odh-dashboard/tree/main/packages).

- Each module MUST have only 1 OpenAPI specification
- You MUST reference shared schemas to avoid drift
- You MUST add examples for every schema and response so mock servers can generate useful data
- After updating the spec, regenerate clients/types by running `make regenerate-types`
- **Reviewers MUST see a diff in the OpenAPI file alongside code changes**

---

## BFF Rules ([bff/](bff/))

All backend-for-frontend (BFF) Go code MUST use the following directory organization structure:

### Code Organization

| Directory                | Purpose                                  |
| ------------------------ | ---------------------------------------- |
| `cmd/`                   | Application wiring and entrypoint        |
| `internal/api/`          | HTTP handlers                            |
| `internal/models/`       | DTOs and data transfer objects           |
| `internal/repositories/` | Kubernetes/external service integrations |
| `internal/mocks/`        | Stub data for development                |
| `internal/helpers/`      | Utility functions (k8s.go helpers)       |

### Development Guidelines

- All stub implementations MUST mirror production implementations: identical signatures, logged
  TODOs, and mock data that matches the OpenAPI examples
- Every new handler MUST include:
  - Request validation
  - Structured logging
  - Unit tests (`internal/api/*_test.go`)
- Use Makefile targets for running all commands:
  - `make run` - Run the BFF
  - `make lint` - Run linter
  - `make test` - Run tests
  - `make build` - Build binary
- When the feature is ready for production, connect to Kubernetes through the helpers under
  `internal/helpers/k8s.go`
- Gate risky behavior behind flags/env vars defined in `cmd/main.go`

---

## Frontend Rules ([frontend/](frontend/))

### Technology Stack

- React 18 + TypeScript
- PatternFly v6 (primary UI framework)
- Material UI v7 (Kubeflow flavor only)
- Webpack with Module Federation
- **mod-arch-core** - Core functionality, hooks, context providers

### Development Guidelines

- **PatternFly components only** unless Kubeflow flavor explicitly requires Material UI. To determine
  which flavor: check `DEPLOYMENT_MODE` env var (`standalone`/`kubeflow` = MUI, `federated` = PatternFly)
- You MUST validate that PatternFly components follow accessibility standards. You MAY escalate to
  users when there are conflicting standards
- **Namespace awareness is mandatory**: Use `useNamespaceSelector` / `useNamespaces` hooks instead
  of inventing new global state
- All remote calls MUST flow through API clients generated from the OpenAPI spec or thin wrappers in
  `src/api/`
- Follow routing conventions in [src/app/routes.tsx](frontend/src/app/routes.tsx)
- Use [layout primitives](frontend/src/app/pages/) (`ApplicationsPage`, `DashboardEmptyTableView`, etc.)
- Keep state in React Query hooks or existing context providers from `mod-arch-core`

### Before Submitting

All checks MUST pass.

- Run lint: `npm run lint`
- Run tests: `npm run test`
- Ensure Module Federation metadata stays correct in `config/moduleFederation.js`

---

## Deployment Modes

| Mode           | Theme      | Use Case                               |
| -------------- | ---------- | -------------------------------------- |
| **standalone** | MUI        | Local development, isolated deployment |
| **kubeflow**   | MUI        | Integration with Kubeflow dashboard    |
| **federated**  | PatternFly | Micro-frontend in ODH/RHOAI dashboard  |

### Mode-Specific Behavior

#### Standalone Mode

- UI served by BFF
- BFF handles authentication via `kubeflow-user` header
- Exposes `/namespace` endpoint for namespace selection
- Use for local development and testing

#### Kubeflow Mode

- UI served by Kubeflow Ingress
- BFF served by Kubeflow API Gateway
- Namespace selection from Kubeflow central dashboard
- Uses Material UI theme

#### Federated Mode

- UI as remote micro-frontend (Module Federation)
- PatternFly theme for RHOAI dashboard compatibility
- Loaded at runtime by host dashboard
- OAuth authentication flow

---

## Environment Variables

### Container Build Variables

| Variable            | Description            | Default                                        |
| ------------------- | ---------------------- | ---------------------------------------------- |
| `CONTAINER_TOOL`    | Container build tool   | docker                                         |
| `IMG_UI`            | Kubeflow mode image    | ghcr.io/kubeflow/mod-arch/ui:latest            |
| `IMG_UI_STANDALONE` | Standalone mode image  | ghcr.io/kubeflow/mod-arch/ui-standalone:latest |
| `IMG_UI_FEDERATED`  | Federated mode image   | ghcr.io/kubeflow/mod-arch/ui-federated:latest  |
| `PLATFORM`          | Docker buildx platform | linux/amd64                                    |

### Runtime Variables

| Variable          | Description                              | Default    |
| ----------------- | ---------------------------------------- | ---------- |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | standalone |
| `STYLE_THEME`     | `mui-theme` or `patternfly-theme`        | mui-theme  |

**Example: Running in federated mode with PatternFly theme:**

```bash
DEPLOYMENT_MODE=federated STYLE_THEME=patternfly-theme make dev-start
```

---

## Project-Wide Expectations

1. Use **Go 1.24+** for the BFF and **Node 20+** for the frontend
2. Keep tooling in sync with `package.json` and `go.mod`
3. Stick to **PatternFly components** and utilities; Material UI appears only when Kubeflow flavor
   explicitly requires it
4. You MUST run tests before pushing:
   - Frontend: `npm run test` in `frontend/`
   - BFF: `make lint && make test` in `bff/`
5. Keep [docs/](docs/) updated when you change workflows, env vars, or deployment steps

---

## Additional Resources

- [Contributing Guidelines](CONTRIBUTING.md)
- [Project Documentation](docs/README.md)
- [OpenAPI Spec](api/openapi/maas.yaml) -
  [View in Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/kubeflow/mod-arch/main/clients/ui/api/openapi/mod-arch.yaml)
