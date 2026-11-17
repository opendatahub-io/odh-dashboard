---
description: Guide for creating a new module/package in the ODH Dashboard monorepo
globs: "packages/**"
alwaysApply: false
paths:
  - "packages/**"
---

# Module Onboarding — Creating a New Package

> **Canonical docs** — read these first:
> - [docs/onboard-modular-architecture.md](../../docs/onboard-modular-architecture.md) — quickstart using `mod-arch-installer`
> - [docs/module-federation.md](../../docs/module-federation.md) — MF config properties, shared deps, proxy, rspack setup
> - [docs/extensibility.md](../../docs/extensibility.md) — extension points, code refs, feature gating

The quickstart in `docs/onboard-modular-architecture.md` uses `pnpm dlx mod-arch-installer@1.23.0 -n <name> --port <port> --bff-port <bff-port> --service-port <service-port>` to scaffold a new module (the `/module-onboarding` skill automates it end to end). This rule provides the full manual reference and checklist beyond what the installer covers. `packages/data-connect-hub/` is the golden example for a federated module with a BFF.

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
  "dependencies": {
    "@odh-dashboard/plugin-core": "workspace:*"
  },
  "devDependencies": {
    "@odh-dashboard/eslint-config": "workspace:*",
    "@odh-dashboard/jest-config": "workspace:*",
    "@odh-dashboard/tsconfig": "workspace:*"
  }
}
```

Internal packages always use the pnpm workspace protocol (`workspace:*`). Simple (non-federated) plugins that the host imports directly also need `"exports": { "./extensions": "./extensions.ts" }`; federated remotes do not, since they expose their extensions through Module Federation instead.

For federated modules (with their own dev server and/or BFF), add `module-federation` — see [docs/module-federation.md § Configuration Properties](../../docs/module-federation.md#configuration-properties) for the full schema:

```json
"module-federation": {
  "name": "<camelCaseName>",
  "remoteEntry": "/remoteEntry.js",
  "authorize": true,
  "tls": false,
  "proxy": [
    { "path": "/<name>/api", "pathRewrite": "/api" },
    { "path": "/<name>/healthcheck", "pathRewrite": "/healthcheck" }
  ],
  "local": { "host": "localhost", "port": <unique-port> },
  "service": { "name": "odh-dashboard-<name>-ui", "port": <unique-service-port> }
}
```

Federated module frontends (`packages/<name>/frontend`) must also be listed explicitly in the root `pnpm-workspace.yaml` — `packages/*` does not match nested packages.

Do not add a package-local install script. First-party frontends are members of the root pnpm workspace; run `pnpm install` from the repository root so the shared lockfile remains authoritative. Upstream subtree frontends are the exception and retain their own npm lockfiles.

If the new remote participates in dashboard Cypress mock tests, add `cypress:mock:build`, `cypress:mock:build:coverage`, and `cypress:mock:dev` scripts to the **parent module package**. These should build/start its federated frontend on `module-federation.local.port`; they may delegate to existing parent `cypress:server:*` scripts. Keep standalone frontend and BFF Cypress commands separate. Run `pnpm run validate:cypress-mock` to confirm the remote is selected and its module name and port are unique. See [docs/testing.md](../../docs/testing.md#mocked-tests) for the developer workflow.

### 3. Configure the port

Each package needs a unique port. See [docs/onboard-modular-architecture.md § Pick Unique Ports](../../docs/onboard-modular-architecture.md#1-pick-unique-ports). Pass the ports to the installer (`--port`, `--bff-port`, `--service-port`); it updates both `Makefile` and `package.json`.

To see current port assignments and detect conflicts, run:

```bash
pnpm run validate:ports
```

The source of truth for each package is:
- **Frontend port**: `module-federation.local.port` in the package's `package.json`
- **BFF port (local dev/E2E)**: the package's development script or Makefile (not currently conflict-checked by the validator)
- **Production service port**: `Port` in the dashboard-operator `moduleRegistry` (`dashboard-operator/internal/controller/modules.go`), mirrored in `module-federation.service.port` (`validate:ports` fails on unparseable registry ports and checks they are unique; verify the mirror manually)

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
│   │   └── rspack.{common,dev,prod}.js
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

Add the area to `packages/plugin-core/src/areas/types.ts` (under `/* Plugins */`) and configure it in `frontend/src/concepts/areas/const.ts` with feature flags, required DSC components, and reliant areas. A new feature flag also needs:

- the type in `DashboardCommonConfig` (`packages/k8s-core/src/k8sTypes.ts`)
- a default in `techPreviewFlags` (or `devTemporaryFeatureFlags` for dev-only switches) in `const.ts`
- a property in `manifests/base/crd/odhdashboardconfigs.opendatahub.io.crd.yaml`
- the same default in `backend/src/utils/constants.ts` (`blankDashboardCR`, typed by `backend/src/types.ts`) and `distributions/core-bff/bff/internal/models/dashboard_config.go` (`DashboardFeatureFlags` and `BlankDashboardCR`)

`pnpm run validate:flags` (run in CI) fails when these copies disagree on the flag list or the backend and core BFF defaults differ.

Any package that declares an `app.area` extension for the area, whether a federated remote or a static plugin, must repeat the applicable gates there (`featureFlags`, `requiredComponents`, `reliantAreas`). `AreaContext.tsx` replaces the host's entry with the extension's properties for the same area id instead of merging them, so gates set only in `const.ts` are lost once the extension loads. `packages/autorag/frontend/src/odh/extensions.ts` is the example. Areas with no `app.area` extension only need the host config.

See [docs/onboard-modular-architecture.md § Add the Area and Feature Flag](../../docs/onboard-modular-architecture.md#4-add-the-area-and-feature-flag) for the feature flag setup.

### 7. Rspack config (federated modules)

Copy from an existing module (e.g., `packages/gen-ai/frontend/config/`). See [docs/module-federation.md § Rspack Configuration](../../docs/module-federation.md#rspack-configuration) for the full config template.

Use `OdhFederationPlugin` from `@odh-dashboard/app-config/rspack` (`packages/app-config/src/rspack/OdhFederationPlugin.ts`).

```javascript
// packages/<name>/frontend/config/moduleFederation.js
const { OdhFederationPlugin } = require('@odh-dashboard/app-config/rspack');

module.exports = {
  moduleFederationPlugins: [
    new OdhFederationPlugin({
      name: 'myModule', // must match package.json module-federation.name
      isHost: process.env.DEPLOYMENT_MODE === 'standalone',
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
    }),
  ],
};
```

Key points:

- Expose `./extensions` and optionally `./extension-points`
- Shared singletons are applied by `OdhFederationPlugin` — do not maintain a manual React / PatternFly / ODH `shared` map
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

### 9. Run `pnpm install` and verify

```bash
pnpm install          # picks up new workspace package (after adding it to pnpm-workspace.yaml)
pnpm run validate:ports && pnpm run validate:cypress-mock
pnpm run dev          # start host (backend + frontend)
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

- [ ] `package.json` with `name` and `workspace:*` internal deps (`exports["./extensions"]` for simple plugins only)
- [ ] `module-federation` config incl. healthcheck proxy and `odh-dashboard-<name>-ui` service (if federated)
- [ ] Frontend listed in `pnpm-workspace.yaml` (if federated)
- [ ] Unique ports assigned and configured in `Makefile` + `package.json`
- [ ] `cypress:mock:*` scripts and `pnpm run validate:cypress-mock` passes (if federated and participating in dashboard Cypress mock tests — the installer scaffolds them opted in)
- [ ] `extensions.ts` with area, nav, and route extensions
- [ ] `SupportedArea` enum entry + area config + flag type/default/CRD property
- [ ] `OWNERS` / `OWNERS_ALIASES` entries and dependabot `gomod` directory (if BFF)
- [ ] Rspack config with `OdhFederationPlugin` from `@odh-dashboard/app-config/rspack` (if federated)
- [ ] BFF with `/healthcheck` and OpenAPI spec (if applicable)
- [ ] Unit tests in `__tests__/`
- [ ] E2E tests in `packages/cypress/cypress/tests/e2e/<name>/`
- [ ] Contract tests (if BFF)
- [ ] `Dockerfile.workspace` for container builds
- [ ] `pnpm install` from repo root succeeds
- [ ] Downstream `Dockerfile.konflux.<name>` copied from a shipped module on the target branch (current digests, `ubi-minimal-pqc` runtime, `odh-mod-arch-<name>` labels) — `/konflux-onboarding`
- [ ] Image `rhoai/odh-mod-arch-<name>-rhel9` registered as a ProdSec `pscomponent` and confirmed by ProdSec before the first release (later CVE tickets carry `pscomponent:rhoai/odh-mod-arch-<name>-rhel9`) — `/konflux-onboarding` Phase 6
