---
description: Guide for creating a new module/package in the ODH Dashboard monorepo
globs: "packages/**"
alwaysApply: false
---

# Module Onboarding — Creating a New Package

> **Canonical docs** — read these first:
> - [docs/onboard-modular-architecture.md](../../docs/onboard-modular-architecture.md) — quickstart using `mod-arch-installer`
> - [docs/module-federation.md](../../docs/module-federation.md) — MF config properties, shared deps, proxy, webpack setup
> - [docs/extensibility.md](../../docs/extensibility.md) — extension points, code refs, feature gating

The quickstart in `docs/onboard-modular-architecture.md` uses `npx mod-arch-installer -n <name>` to scaffold a new module. This rule provides the full manual reference and checklist beyond what the installer covers.

## Template

If not using the installer, start from `packages/plugin-template/`:

```text
packages/plugin-template/
├── package.json          # @odh-dashboard/template
├── tsconfig.json         # extends @odh-dashboard/tsconfig
├── jest.config.ts        # re-exports @odh-dashboard/jest-config
├── .eslintrc.js          # recommendedReactTypescript
└── Dockerfile.workspace  # Container build template
```

## Step-by-step

### 1. Create the package

```bash
cp -r packages/plugin-template packages/<name>
```

### 2. Configure `package.json`

Required fields:

```json
{
  "private": true,
  "name": "@odh-dashboard/<name>",
  "version": "0.0.0",
  "exports": {
    "./extensions": "./extensions.ts"
  },
  "dependencies": {
    "@odh-dashboard/plugin-core": "*"
  },
  "devDependencies": {
    "@odh-dashboard/eslint-config": "*",
    "@odh-dashboard/jest-config": "*",
    "@odh-dashboard/tsconfig": "*"
  }
}
```

For federated modules (with their own dev server and/or BFF), add `module-federation` — see [docs/module-federation.md § Configuration Properties](../../docs/module-federation.md#configuration-properties) for the full schema:

```json
"module-federation": {
  "name": "<camelCaseName>",
  "remoteEntry": "/remoteEntry.js",
  "authorize": true,
  "tls": false,
  "proxy": [{ "path": "/<name>/api", "pathRewrite": "/api" }],
  "local": { "host": "localhost", "port": <unique-port> },
  "service": { "name": "odh-dashboard", "port": 8043 }
}
```

Add `install:module` script if the package has its own `node_modules`:

```json
"scripts": {
  "install:module": "npm install --prefix frontend"
}
```

### 3. Configure the port

Each package needs a unique port. See [docs/onboard-modular-architecture.md § Configure the Port](../../docs/onboard-modular-architecture.md#3-configure-the-port) for where to update it (both `Makefile` and `package.json`).

Current port assignments:

| Package | Frontend Port | BFF Port |
|---|---|---|
| model-registry | 9100 | 4000 |
| gen-ai | 9102 | 8080 |
| eval-hub | 9105 | 4002 |
| maas | 9104 | 8081 |
| notebooks | 9105 | — |
| autorag | 9107 | 4001 |
| automl | 9108 | 4003 |
| mlflow | 9110 | 4020 |

Note: eval-hub and notebooks both use frontend port 9105 (conflict).

### 4. Directory structure

For a full federated module:

```text
packages/<name>/
├── package.json
├── extensions.ts              # Root extensions export
├── frontend/
│   ├── package.json
│   ├── config/
│   │   ├── moduleFederation.js
│   │   └── webpack.{common,dev,prod}.js
│   └── src/
│       ├── odh/
│       │   ├── extensions.ts       # Extension definitions
│       │   └── extension-points/   # Custom extension point types (optional)
│       └── app/                    # Application components
├── bff/                           # Go BFF (if needed)
│   ├── cmd/main.go
│   ├── internal/
│   │   ├── api/
│   │   ├── config/
│   │   ├── integrations/
│   │   └── models/
│   ├── openapi/src/<name>.yaml
│   └── go.mod
├── Makefile
└── Dockerfile.workspace
```

For a simple plugin (no separate build):

```text
packages/<name>/
├── package.json
├── extensions.ts
├── src/
│   └── components/
├── tsconfig.json
├── jest.config.ts
└── .eslintrc.js
```

### 5. Define extensions

See [docs/extensibility.md](../../docs/extensibility.md) for the full extension system guide. Minimal example:

```typescript
import type { Extension } from '@openshift/dynamic-plugin-sdk';
import { SupportedArea } from '@odh-dashboard/plugin-core/extension-points';

const PLUGIN_AREA = 'my-feature';

const extensions: Extension[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_AREA,
      reliantAreas: [SupportedArea.MY_FEATURE],
      featureFlags: ['disableMyFeature'],
    },
  },
  {
    type: 'app.navigation/href',
    properties: {
      id: 'my-feature-nav',
      title: 'My Feature',
      href: '/my-feature',
      section: 'my-section',
    },
    flags: { required: [PLUGIN_AREA] },
  },
  {
    type: 'app.route',
    properties: {
      path: '/my-feature',
      component: { $codeRef: 'MyFeaturePage' },
    },
    flags: { required: [PLUGIN_AREA] },
  },
];
export default extensions;
```

### 6. Register the SupportedArea (if new)

Add the area to `frontend/src/concepts/areas/types.ts` and configure it in `frontend/src/concepts/areas/const.ts` with feature flags, required DSC components, and reliant areas.

See [docs/onboard-modular-architecture.md § Add Feature Flag](../../docs/onboard-modular-architecture.md#4-add-feature-flag) for the feature flag setup.

### 7. Webpack config (federated modules)

Copy from an existing module (e.g., `packages/gen-ai/frontend/config/`). See [docs/module-federation.md § Webpack Configuration](../../docs/module-federation.md#webpack-configuration) for the full config template. Key points:

- Expose `./extensions` and optionally `./extension-points`
- Shared singletons must match the host
- Set `runtime: false` and `output.publicPath = 'auto'`
- Dev server port must be unique

### 8. BFF setup (if needed)

Follow patterns from existing BFFs (gen-ai, maas, automl). See the [bff-go rule](./bff-go.md) for conventions:

- `julienschmidt/httprouter` for routing
- `internal/api/app.go` with `App` struct and `Routes()`
- Auth via `InjectRequestIdentity` middleware
- `/healthcheck` endpoint (required for contract tests)
- OpenAPI spec in `bff/openapi/src/<name>.yaml`
- Mock flags for testing (`--mock-k8s-client`, etc.)

### 9. Run `npm install` and verify

```bash
npm install          # picks up new workspace package
npm run dev          # start host (backend + frontend)
# In another terminal:
cd packages/<name> && make dev-start-federated
```

### 10. Add tests

- **Unit tests**: `__tests__/*.spec.ts(x)` — see the [unit-tests rule](./unit-tests.md)
- **E2E tests**: `packages/cypress/cypress/tests/e2e/<name>/`
- **Contract tests** (if BFF): `packages/<name>/contract-tests/` — see the [contract-tests rule](./contract-tests.md)

### 11. Quality gate checks

The `modular-arch-quality-gates.yml` CI workflow checks that modules have:
- Unit tests in `__tests__/`
- E2E tests in `packages/cypress/cypress/tests/e2e/<name>/`

## Checklist

- [ ] `package.json` with `name`, `exports["./extensions"]`
- [ ] `module-federation` config (if federated)
- [ ] Unique port assigned and configured in `Makefile` + `package.json`
- [ ] `extensions.ts` with area, nav, and route extensions
- [ ] `SupportedArea` enum entry + area config
- [ ] Webpack config with correct shared singletons (if federated)
- [ ] BFF with `/healthcheck` and OpenAPI spec (if applicable)
- [ ] Unit tests in `__tests__/`
- [ ] E2E tests in `packages/cypress/cypress/tests/e2e/<name>/`
- [ ] Contract tests (if BFF)
- [ ] `Dockerfile.workspace` for container builds
- [ ] `npm install` from repo root succeeds
