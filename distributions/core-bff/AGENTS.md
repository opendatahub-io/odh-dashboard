# AGENTS.md - Core BFF

This document provides guidance for AI agents and developers working on the Core BFF module.
The Core BFF replaces the Fastify backend for RHOAI sidecar deployments. It contains a Go
backend-for-frontend (BFF) and a React frontend that integrates with the ODH dashboard via
Module Federation.

## Mandatory Development Flow

**CRITICAL: Never skip or reorder these stages. A PR that implements UI before the API contract will
be rejected.**

### 1. Contract First

Describe every capability in `bff/openapi/src/core-bff.yaml`. All request/response objects must be
documented before coding.

### 2. BFF Stub Second

Add handlers and services in `bff/internal/api` and `bff/internal/repositories` that satisfy
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
core-bff/
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
│   ├── openapi/
│   │   └── src/
│   │       └── core-bff.yaml    # OpenAPI specification (contract-first)
│   ├── static/                  # Static assets served by BFF
│   ├── Makefile                 # Build and run commands
│   ├── go.mod                   # Go module definition
│   └── README.md                # BFF documentation
├── contract-tests/              # Contract tests
│   └── __tests__/
│       ├── helpers.ts           # Shared test utilities (API clients, schema, matchers)
│       ├── foundation/          # Platform-agnostic tests (run on both OpenShift and XKS)
│       ├── openshift/           # OpenShift-specific tests
│       └── xks/                 # XKS-specific tests
├── frontend/                    # React Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx          # Root application component
│   │   │   ├── AppRoutes.tsx    # Route definitions
│   │   │   ├── api/             # API client wrappers
│   │   │   ├── context/         # React context providers
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── pages/           # Page components
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
├── docs/                        # Project documentation
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

- **Go**: >= 1.25.0

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
make docker-build-standalone   # Standalone mode
make docker-build-federated    # Federated mode
```

### Testing

```bash
# Frontend tests (lint + type-check + unit + cypress)
cd frontend && npm run test

# BFF tests
cd bff && make lint && make test

# Contract tests
npm run test:contract

# Cypress E2E tests only
cd frontend && npm run test:cypress-ci

# Run specific Cypress test
cd frontend && npm run test:cypress-ci -- --spec "**/testfile.cy.ts"
```

---

## API Contract Rules

- One OpenAPI document per module capability
- Reference shared schemas to avoid drift
- Add examples for every schema and response so mock servers can generate useful data
- After updating the spec, regenerate clients/types for both Go and TypeScript if your workflow
  requires them
- **Reviewers must see a diff in the OpenAPI file alongside code changes**

### Current Endpoints

| Method | Path                 | Description                          |
| ------ | -------------------- | ------------------------------------ |
| GET    | `/healthcheck`       | Liveness probe (no auth)             |
| GET    | `/api/v1/healthcheck` | Health check (with auth middleware) |
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
| `internal/helpers/`      | Utility functions (k8s.go helpers)       |
| `internal/integrations/` | External service clients (k8s, bffclient)|

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
| `-deployment-mode`      | `DEPLOYMENT_MODE`      | `standalone` or `federated`              | standalone    |
| `-dev-mode`             | `DEV_MODE`             | Enables relaxed behaviors                | false         |
| `-mock-k8s-client`      | `MOCK_K8S_CLIENT`      | Use in-memory stub for k8s              | false         |
| `-mock-http-client`     | `MOCK_HTTP_CLIENT`     | Use mock HTTP client                     | false         |
| `-mock-bff-clients`     | `MOCK_BFF_CLIENTS`     | Use mock inter-BFF clients               | false         |
| `-static-assets-dir`    | `STATIC_ASSETS_DIR`    | Directory to serve frontend assets       | ./static      |
| `-log-level`            | `LOG_LEVEL`            | ERROR, WARN, INFO, DEBUG                 | INFO          |
| `-allowed-origins`      | `ALLOWED_ORIGINS`      | Comma-separated CORS origins             | ""            |
| `-auth-method`          | `AUTH_METHOD`           | `disabled` (mock) or `user_token`        | user_token    |
| `-auth-token-header`    | `AUTH_TOKEN_HEADER`    | Header to read bearer token from         | x-forwarded-access-token |
| `-auth-token-prefix`    | `AUTH_TOKEN_PREFIX`    | Prefix to strip from token header value  | (none)        |
| `-insecure-skip-verify` | `INSECURE_SKIP_VERIFY` | Skip upstream TLS verify (dev only)      | false         |
| `-namespace`            | `NAMESPACE`            | Dashboard namespace                      | opendatahub   |
| `-dashboard-config-name`| `DASHBOARD_CONFIG_NAME`| OdhDashboardConfig CR name               | odh-dashboard-config |
| `-mf-remotes-config`    | `MF_REMOTES_CONFIG`    | Path to module federation remotes config | ""            |
| `-bundle-paths`         |                        | Comma-separated PEM CA bundle paths      | (system defaults) |

---

## Frontend Rules (`frontend/`)

### Technology Stack

- React 18 + TypeScript
- PatternFly v6 (UI framework for federated mode)
- Webpack with Module Federation
- **mod-arch-core** - Core functionality, hooks, context providers

### Development Guidelines

- **PatternFly components** for federated mode (the primary deployment target)
- **Namespace awareness is mandatory**: Use `useNamespaceSelector` / `useNamespaces` hooks instead
  of inventing new global state
- All remote calls flow through API clients generated from the OpenAPI spec or thin wrappers in
  `src/api/`. **Do not fetch directly from hard-coded URLs**
- Follow routing conventions in `src/app/AppRoutes.tsx`
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

| Variable          | Description                       | Default              |
| ----------------- | --------------------------------- | -------------------- |
| `DEPLOYMENT_MODE` | `standalone` or `federated`       | standalone           |
| `STYLE_THEME`     | `patternfly-theme`                | patternfly-theme     |
| `LOGO`            | Light theme logo filename         | logo-light-theme.svg |
| `LOGO_DARK`       | Dark theme logo filename          | logo-dark-theme.svg  |
| `FAVICON`         | Favicon filename                  | favicon.ico          |
| `PRODUCT_NAME`    | Product name in UI                | "Core BFF"           |

---

## Deployment Modes

| Mode           | Theme      | Use Case                               |
| -------------- | ---------- | -------------------------------------- |
| **standalone** | PatternFly | Local development, isolated deployment |
| **federated**  | PatternFly | Micro-frontend in ODH/RHOAI dashboard  |

### Mode-Specific Behavior

#### Standalone Mode

- UI served by BFF
- Exposes `/api/v1/namespaces` endpoint for namespace selection
- Use for local development and testing

#### Federated Mode

- UI as remote micro-frontend (Module Federation)
- PatternFly theme for RHOAI dashboard compatibility
- Loaded at runtime by host dashboard
- OAuth authentication flow
- BFF dev port: 8082, frontend dev port: 9112, production port: 8843

---

## Docker Image Configuration

### Environment Variables for Container Builds

| Variable            | Description            | Default                                            |
| ------------------- | ---------------------- | -------------------------------------------------- |
| `CONTAINER_TOOL`    | Container build tool   | docker                                             |
| `IMG_UI_STANDALONE` | Standalone mode image  | quay.io/opendatahub/core-bff/ui-standalone:latest  |
| `IMG_UI_FEDERATED`  | Federated mode image   | quay.io/opendatahub/core-bff/ui-federated:latest   |
| `PLATFORM`          | Docker buildx platform | linux/amd64                                        |

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

### Contract Testing

Tests are split by platform. Foundation tests are platform-agnostic and run on both. Platform-specific
tests validate behavior unique to OpenShift or XKS (e.g., feature flag defaults).

```bash
# Run both platforms (umbrella script)
npm run test:contract

# Run a single platform
npm run test:contract:openshift   # foundation + openshift tests
npm run test:contract:xks         # foundation + xks tests
```

---

## Project-Wide Expectations

1. Use **Go 1.25+** for the BFF and **Node 22+** for the frontend
2. Keep tooling in sync with `package.json` and `go.mod`
3. Use **PatternFly components** for all federated-mode UI
4. Run tests before pushing:
   - Frontend: `npm run test` in `frontend/`
   - BFF: `make lint && make test` in `bff/`
5. Keep docs updated (`docs/*.md`, `frontend/docs/*.md`) when you change workflows, env vars, or
   deployment steps

---

## Additional Resources

- [Frontend Dev Setup](frontend/docs/dev-setup.md)
- [Frontend Testing](frontend/docs/testing.md)
- [BFF Documentation](bff/README.md)
- [OpenAPI Spec](bff/openapi/src/core-bff.yaml)
