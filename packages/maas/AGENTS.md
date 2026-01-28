# AGENTS.md - Mod Arch UI (MaaS)

This document provides guidance for AI agents and developers working on the Mod Arch UI project.
This is a **modular architecture starter** for building scalable applications with a React frontend
and Go backend-for-frontend (BFF).

## Mandatory Development Flow

**CRITICAL: Never skip or reorder these stages. A PR that implements UI before the API contract will
be rejected.**

### 1. Contract First

Describe every capability in `api/openapi/maas.yaml` (or a new file under `api/openapi/`). All
request/response objects must be documented before coding.

### 2. BFF Stub Second

Add handlers and mock-returning services in `bff/internal/api` and `bff/internal/mocks` that satisfy
the new contract. Wire them in `bff/cmd/main.go` and expose feature flags/env vars as needed.

### 3. Frontend Third

Build UI routes inside `frontend/src/app` only after the stub endpoints respond with realistic
shapes. Consume generated types instead of duplicating schemas.

### 4. Production BFF Last

Replace mocks with Kubernetes-aware logic (repositories, clients, RBAC) before shipping. Verify the
BFF against a real cluster or the manifests in `manifests/`.

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

- **Node.js**: >= 18.0.0
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

## API Contract Rules (`api/`)

- One OpenAPI document per module capability
- Reference shared schemas to avoid drift
- Add examples for every schema and response so mock servers can generate useful data
- After updating the spec, regenerate clients/types for both Go and TypeScript if your workflow
  requires them
- **Reviewers must see a diff in the OpenAPI file alongside code changes**

---

## BFF Rules (`bff/`)

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

- Keep stub implementations close to production ones: identical signatures, logged TODOs, and mock
  data that matches the OpenAPI examples
- Every new handler must include:
  - Request validation
  - Structured logging
  - Unit tests (`internal/api/*_test.go`)
- Use Makefile targets instead of custom scripts:
  - `make run` - Run the BFF
  - `make lint` - Run linter
  - `make test` - Run tests
  - `make build` - Build binary
- When the feature is ready for production, connect to Kubernetes through the helpers under
  `internal/helpers/k8s.go`
- Gate risky behavior behind flags/env vars defined in `cmd/main.go`

---

## Frontend Rules (`frontend/`)

### Technology Stack

- React 18 + TypeScript
- PatternFly v6 (primary UI framework)
- Material UI v7 (Kubeflow flavor only)
- Webpack with Module Federation
- **mod-arch-core** - Core functionality, hooks, context providers

### Development Guidelines

- **PatternFly components only** unless Kubeflow flavor explicitly requires Material UI
- **Namespace awareness is mandatory**: Use `useNamespaceSelector` / `useNamespaces` hooks instead
  of inventing new global state
- All remote calls flow through API clients generated from the OpenAPI spec or thin wrappers in
  `src/api/`. **Do not fetch directly from hard-coded URLs**
- Follow routing conventions in `src/app/routes.tsx`
- Use layout primitives (`ApplicationsPage`, `DashboardEmptyTableView`, etc.)
- Keep state in React Query hooks or existing context providers from `mod-arch-core`

### Before Submitting

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

---

## Project-Wide Expectations

1. Use **Go 1.24+** for the BFF and **Node 18+** for the frontend
2. Keep tooling in sync with `package.json` and `go.mod`
3. Stick to **PatternFly components** and utilities; Material UI appears only when Kubeflow flavor
   explicitly requires it
4. Run tests before pushing:
   - Frontend: `npm run test` in `frontend/`
   - BFF: `make lint && make test` in `bff/`
5. Keep docs updated (`docs/*.md`) when you change workflows, env vars, or deployment steps

---

## Additional Resources

- [Contributing Guidelines](CONTRIBUTING.md)
- [Project Documentation](docs/README.md)
- [OpenAPI Spec](api/openapi/maas.yaml) -
  [View in Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/kubeflow/mod-arch/main/clients/ui/api/openapi/mod-arch.yaml)
