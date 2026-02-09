# AGENTS.md - Modular Architecture Starter

This document provides guidance for AI agents and developers working on mod-arch-starter projects.
This is a **starter template** for building modular architecture applications with a React frontend
and Go backend-for-frontend (BFF).

## Mandatory Development Flow

**CRITICAL: Never skip or reorder these stages. A PR that implements UI before the API contract will
be rejected.**

### 1. Contract First

Describe every capability in `api/openapi/mod-arch.yaml` (or a new file under `api/openapi/`). All
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
mod-arch-starter/
├── api/
│   └── openapi/
│       └── mod-arch.yaml        # OpenAPI specification (contract-first)
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
│   │   │   ├── AppRoutes.tsx    # Route definitions
│   │   │   ├── api/             # API client wrappers
│   │   │   ├── context/         # React context providers
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── pages/           # Page components
│   │   │   ├── standalone/      # Standalone mode components
│   │   │   └── utilities/       # Frontend utilities
│   │   ├── __mocks__/           # Jest mocks
│   │   ├── __tests__/           # Test files
│   │   └── images/              # Image assets
│   ├── config/
│   │   ├── webpack.common.js    # Shared webpack config
│   │   ├── webpack.dev.js       # Development webpack config
│   │   ├── webpack.prod.js      # Production webpack config
│   │   └── moduleFederation.js  # Module Federation config
│   ├── docs/                    # Frontend documentation
│   ├── package.json             # NPM dependencies and scripts
│   └── README.md                # Frontend documentation
├── manifests/                   # Kubernetes manifests
│   ├── base/                    # Base Kustomize resources
│   └── overlays/                # Environment-specific overlays
├── docs/                        # Project documentation
│   ├── install.md               # Installation guide
│   ├── local-deployment-guide.md
│   ├── local-deployment-guide-ui.md
│   └── kubeflow-development-guide.md
├── scripts/                     # Utility scripts
├── Dockerfile                   # Container image build
├── Makefile                     # Root-level make commands
└── README.md                    # Project overview
```

---

## Development Requirements

### Frontend

- **Node.js**: >= 22.0.0
- **npm**: >= 10.8.2

### BFF

- **Go**: >= 1.24.3

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

# Cypress E2E tests only
cd frontend && npm run test:cypress-ci

# Run specific Cypress test
cd frontend && npm run test:cypress-ci -- --spec "**/testfile.cy.ts"
```

---

## API Contract Rules (`api/`)

- One OpenAPI document per module capability
- Reference shared schemas to avoid drift
- Add examples for every schema and response so mock servers can generate useful data
- After updating the spec, regenerate clients/types for both Go and TypeScript if your workflow
  requires them
- **Reviewers must see a diff in the OpenAPI file alongside code changes**

### Current Endpoints

| Method | Path                 | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/healthcheck`       | Liveness probe                       |
| GET    | `/api/v1/user`       | Returns authenticated user info      |
| GET    | `/api/v1/namespaces` | List namespaces (dev/mock mode only) |

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

### BFF Configuration Flags

| Flag                    | Env Var                | Description                              | Default       |
| ----------------------- | ---------------------- | ---------------------------------------- | ------------- |
| `-port`                 | `PORT`                 | Listen port                              | 4000          |
| `-deployment-mode`      | `DEPLOYMENT_MODE`      | `standalone`, `kubeflow`, or `federated` | standalone    |
| `-dev-mode`             | `DEV_MODE`             | Enables relaxed behaviors                | false         |
| `-mock-k8s-client`      | `MOCK_K8S_CLIENT`      | Use in-memory stub for k8s               | false         |
| `-static-assets-dir`    | `STATIC_ASSETS_DIR`    | Directory to serve frontend assets       | ./static      |
| `-log-level`            | `LOG_LEVEL`            | ERROR, WARN, INFO, DEBUG                 | INFO          |
| `-allowed-origins`      | `ALLOWED_ORIGINS`      | Comma-separated CORS origins             | ""            |
| `-auth-method`          | `AUTH_METHOD`          | `internal` (mock) or `user_token`        | internal      |
| `-auth-header`          | `AUTH_HEADER`          | Header to read bearer token from         | Authorization |
| `-auth-prefix`          | `AUTH_PREFIX`          | Expected value prefix                    | Bearer        |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (dev only)      | false         |

---

## Frontend Rules (`frontend/`)

### Technology Stack

- React 18 + TypeScript
- PatternFly v6 (primary UI framework)
- Material UI v7 (Kubeflow flavor only)
- Webpack with Module Federation
- **mod-arch-core** - Always included (core functionality, hooks, context providers)
- **mod-arch-shared** - Kubeflow flavor only (shared UI components)
- **mod-arch-kubeflow** - Kubeflow flavor only (MUI theming, Kubeflow-specific utilities)

> **Note**: When using the `default` flavor (PatternFly-only), `mod-arch-shared` and
> `mod-arch-kubeflow` are **not installed**. Only `mod-arch-core` is included.

### Development Guidelines

- **PatternFly components only** unless Kubeflow flavor explicitly requires Material UI
- **Namespace awareness is mandatory**: Use `useNamespaceSelector` / `useNamespaces` hooks instead
  of inventing new global state
- All remote calls flow through API clients generated from the OpenAPI spec or thin wrappers in
  `src/api/`. **Do not fetch directly from hard-coded URLs**
- Follow routing conventions in `src/app/AppRoutes.tsx`
- Use layout primitives from mod-arch-shared (`ApplicationsPage`, `DashboardEmptyTableView`, etc.) -
  **Kubeflow flavor only**
- Keep state in React Query hooks or existing context providers from `mod-arch-core`

### Before Submitting

- Run lint: `npm run test:lint`
- Run tests: `npm run test`
- Ensure Module Federation metadata stays correct in `config/moduleFederation.js`

### Frontend Scripts

```bash
npm run start:dev        # Development server
npm run build            # Production build
npm run build:prod       # Explicit production build
npm run test             # Full test suite
npm run test:lint        # Lint only
npm run test:type-check  # TypeScript check only
npm run test:unit        # Jest unit tests only
npm run cypress:open:mock  # Open Cypress GUI
npm run cypress:run:mock   # Run Cypress headless
```

### Environment Variables (Frontend)

| Variable            | Description                              | Default              |
| ------------------- | ---------------------------------------- | -------------------- |
| `DEPLOYMENT_MODE`   | `standalone`, `kubeflow`, or `federated` | standalone           |
| `STYLE_THEME`       | `mui-theme` or `patternfly-theme`        | mui-theme            |
| `LOGO`              | Light theme logo filename                | logo-light-theme.svg |
| `LOGO_DARK`         | Dark theme logo filename                 | logo-dark-theme.svg  |
| `FAVICON`           | Favicon filename                         | favicon.ico          |
| `PRODUCT_NAME`      | Product name in UI                       | "Mod Arch"           |
| `KUBEFLOW_USERNAME` | Default username (mock mode)             | user@example.com     |

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

## Docker Image Configuration

### Environment Variables for Container Builds

| Variable            | Description            | Default                                        |
| ------------------- | ---------------------- | ---------------------------------------------- |
| `CONTAINER_TOOL`    | Container build tool   | docker                                         |
| `IMG_UI`            | Kubeflow mode image    | ghcr.io/kubeflow/mod-arch/ui:latest            |
| `IMG_UI_STANDALONE` | Standalone mode image  | ghcr.io/kubeflow/mod-arch/ui-standalone:latest |
| `IMG_UI_FEDERATED`  | Federated mode image   | ghcr.io/kubeflow/mod-arch/ui-federated:latest  |
| `PLATFORM`          | Docker buildx platform | linux/amd64                                    |

---

## Testing Guidelines

### Frontend Testing

- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Cypress with mocked network requests

```bash
# Run all tests
npm run test

# Unit tests only
npm run test:unit

# Cypress E2E (builds frontend, starts server, runs tests)
npm run test:cypress-ci

# Cypress GUI for debugging
npm run cypress:open:mock
```

### BFF Testing

- Go standard testing with `envtest` for Kubernetes
- golangci-lint for linting

```bash
cd bff
make lint   # Run linter
make test   # Run tests
```

---

## Project-Wide Expectations

1. Use **Go 1.24+** for the BFF and **Node 22+** for the frontend
2. Keep tooling in sync with `package.json` and `go.mod`
3. Stick to **PatternFly components** and utilities; Material UI appears only when Kubeflow flavor
   explicitly requires it
4. Run tests before pushing:
   - Frontend: `npm run test` in `frontend/`
   - BFF: `make lint && make test` in `bff/`
5. Keep docs updated (`docs/*.md`, `frontend/docs/*.md`) when you change workflows, env vars, or
   deployment steps

---

## Installation via CLI

Bootstrap a fresh copy without cloning the repo:

```bash
npx mod-arch-installer my-module --flavor kubeflow
```

### CLI Options

| Flag                           | Description                              | Default  |
| ------------------------------ | ---------------------------------------- | -------- |
| `--flavor <kubeflow\|default>` | Kubeflow (MUI) or PatternFly-only flavor | kubeflow |
| `--skip-install`               | Skip `npm install` in frontend           | false    |
| `--no-git`                     | Skip git initialization                  | false    |

### Flavor Differences

| Aspect            | Kubeflow Flavor   | Default Flavor           |
| ----------------- | ----------------- | ------------------------ |
| Theme             | Material UI       | PatternFly only          |
| mod-arch-core     | Included          | Included                 |
| mod-arch-shared   | Included          | **Not included**         |
| mod-arch-kubeflow | Included          | **Not included**         |
| ThemeProvider     | MUI ThemeProvider | None (PatternFly native) |

---

## Additional Resources

- [Installation Guide](docs/install.md)
- [Local Deployment Guide](docs/local-deployment-guide.md)
- [Kubeflow Development Guide](docs/kubeflow-development-guide.md)
- [Frontend Dev Setup](frontend/docs/dev-setup.md)
- [Frontend Testing](frontend/docs/testing.md)
- [BFF Documentation](bff/README.md)
- [OpenAPI Spec](api/openapi/mod-arch.yaml) -
  [View in Swagger Editor](https://editor.swagger.io/?url=https://raw.githubusercontent.com/opendatahub-io/mod-arch-library/main/mod-arch-starter/api/openapi/mod-arch.yaml)
