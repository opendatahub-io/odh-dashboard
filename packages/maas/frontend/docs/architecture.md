# MaaS Frontend Architecture

## Overview

The MaaS frontend is a React 18 micro-frontend that runs as a federated module inside the ODH Dashboard (RHOAI / ODH) or as a standalone application for local development. It is built with Rspack and Module Federation.

## Module Federation

- **Remote name:** `maas`
- **Exposed surfaces:**
  - `./extensions` — ODH extension registrations (areas, nav items, routes, status providers)
  - `./extension-points` — public extension point types for other packages to consume
- **Remote entry URL (production):** `/_mf/maas/remoteEntry.js` (proxied by the main ODH Dashboard backend)
- **Local dev port:** 9104 (federated mode)

The ODH Dashboard host discovers and loads the `maas` remote at runtime via `useAppExtensions()`, which calls `loadRemote('maas/extensions')`.

## Theme and Deployment Modes

| `DEPLOYMENT_MODE` | `STYLE_THEME` | Component library |
|-------------------|---------------|-------------------|
| `federated` | `patternfly-theme` | PatternFly v6 |
| `standalone` | `mui-theme` | Material UI |
| `kubeflow` | `mui-theme` | Material UI |

**Do not mix component libraries across modes.** PatternFly components must only appear in federated mode; MUI components only in standalone/kubeflow. The active theme is determined at build time via environment variables.

## Key Directory Structure

```
frontend/src/
├── odh/
│   ├── extensions.ts          # ODH extension definitions (areas, nav, routes)
│   └── extension-points/      # Custom extension point types exported to other packages
├── app/
│   ├── api/                   # TypeScript API client wrappers (typed against bff/openapi.yaml)
│   ├── pages/                 # Page-level React components (model listing, key management, etc.)
│   ├── hooks/                 # Custom React hooks (data fetching, state)
│   ├── context/               # React context providers (user identity, namespace, etc.)
│   └── types/                 # Shared TypeScript types (MaaSModel, APIKey, Subscription, etc.)
└── index.tsx                  # Application entry point
```

## API Layer

All BFF communication goes through typed client wrappers in `src/app/api/`. These are hand-written (not code-generated) TypeScript modules that call the BFF endpoints defined in `bff/openapi.yaml`. Each module wraps a resource group:

- `api/models.ts` — `GET /api/v1/models`
- `api/api-keys.ts` — `POST/GET/DELETE /api/v1/api-keys`
- `api/subscriptions.ts` — `GET/POST/PUT/DELETE /api/v1/subscription-info`
- `api/gateway.ts` — `GET /api/v1/gateway-url`
- `api/me.ts` — `GET /api/v1/me` (also exported from the package root via `exports["./api/me"]`)

## State Management

State is managed with React context and hooks — no external state library. The primary contexts are:

- User identity / authentication state
- Selected namespace
- Feature flag context (via ODH Dashboard's `SupportedArea` / `PluginStore`)

## Testing

- **Unit tests:** Jest, co-located in `__tests__/` directories alongside the code they test. Run with `pnpm run test:unit`.
- **Cypress mock tests:** Component and integration tests that run against a built federated frontend with a mocked BFF. See [`docs/testing.md`](./testing.md).
- **E2E tests:** Cypress tests in `packages/cypress/cypress/tests/e2e/maas/` that run against a real cluster.
