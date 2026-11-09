# Module Onboarding — Reference

Supplementary reference for the module-onboarding skill. Read `.claude/rules/module-onboarding.md` for the full manual guide. The most recent fully onboarded module, `packages/data-connect-hub/`, is the golden example.

## Name Transformation Rules

Given a kebab-case module name (e.g., `my-module`):

| Variant | Algorithm | Example |
|---------|-----------|---------|
| `kebab-case` | As-is | `my-module` |
| `camelCase` | Remove hyphens, capitalize each word after the first | `myModule` |
| `UPPER_SNAKE_CASE` | Replace hyphens with `_`, uppercase all | `MY_MODULE` |
| `Title Case` | Capitalize first letter of each word, join with space | `My Module` |

**Derived identifiers:**

| Identifier | Pattern | Example |
|------------|---------|---------|
| Package name | `@odh-dashboard/<kebab>` | `@odh-dashboard/my-module` |
| Frontend package name | `<kebab>-ui` | `my-module-ui` |
| Directory | `packages/<kebab>/` | `packages/my-module/` |
| MF name | `<camelCase>` | `myModule` |
| SupportedArea enum | `PLUGIN_<UPPER_SNAKE>` | `PLUGIN_MY_MODULE` |
| SupportedArea value | `'plugin-<kebab>'` | `'plugin-my-module'` |
| Feature flag key | `<camelCase>` | `myModule` |
| Proxy paths | `/<kebab>/api`, `/<kebab>/healthcheck` | `/my-module/api` |
| Service name | `odh-dashboard-<kebab>-ui` | `odh-dashboard-my-module-ui` |
| BFF Go module | `github.com/opendatahub-io/<kebab>/bff` | `github.com/opendatahub-io/my-module/bff` |
| Nav section ID | `<kebab>` | `my-module` |
| Nav href / route path | `/<kebab>/main-view`, `/<kebab>/main-view/*` | `/my-module/main-view/*` |
| Nav title | `<Title Case>` | `My Module` |
| CSS prefix | `<kebab>-` | `my-module-` |

## Port Ranges

| Purpose | Range | Source of truth |
|---------|-------|-----------------|
| Frontend dev server / MF local | 9100–9399 | `package.json` → `module-federation.local.port` (packages **and** `distributions/`) |
| BFF local dev port | 4000–4099 | Inline `PORT=` / `PROXY_PORT=` in the package `Makefile` recipes and `cypress:server:dev` script |
| Production service | 8043, 8143, … (steps of 100) | `dashboard-operator/internal/controller/modules.go` → `Port` (mirrored in `module-federation.service.port`) |

**How to find the next available port** (portable — BSD and GNU grep; never use `grep -P`):

```bash
# Frontend + production ports — prints both tables and flags conflicts
pnpm run validate:ports

# BFF ports
grep -hoE '(PROXY_)?PORT=40[0-9]{2}' packages/*/Makefile packages/*/package.json distributions/*/Makefile distributions/*/package.json 2>/dev/null | grep -oE '[0-9]+' | sort -n | uniq

# Production service ports (operator registry)
grep -E '^[[:space:]]+Port:[[:space:]]+[0-9]+' dashboard-operator/internal/controller/modules.go | grep -oE '[0-9]+' | sort -n
```

Pass the chosen ports to the installer (`--port`, `--bff-port`, `--service-port`); it rewrites `package.json`, the `Makefile` and the frontend scripts.

## Host Registration (5 files)

### 1. `pnpm-workspace.yaml` — workspace member

```yaml
packages:
  # ... existing entries ...
  - packages/my-module/frontend  # ← add here
```

### 2. `packages/plugin-core/src/areas/types.ts` — SupportedArea enum

```typescript
export enum SupportedArea {
  // ... existing entries ...

  /* Plugins */
  PLUGIN_MY_MODULE = 'plugin-my-module',
}
```

### 3. `packages/k8s-core/src/k8sTypes.ts` — Type definition

`frontend/src/k8sTypes.ts` only re-exports from `@odh-dashboard/k8s-core`.

```typescript
export type DashboardCommonConfig = {
  // ... existing flags ...
  myModule?: boolean;  // ← add here
};
```

### 4. `frontend/src/concepts/areas/const.ts` — Flag default + state map

```typescript
export const techPreviewFlags = {
  // ... existing flags ...
  myModule: false,
} satisfies Partial<DashboardCommonConfig>;

export const SupportedAreasStateMap: SupportedAreasState = {
  // ... existing entries ...
  [SupportedArea.PLUGIN_MY_MODULE]: {
    featureFlags: ['myModule'],
  },
};
```

### 5. `manifests/base/crd/odhdashboardconfigs.opendatahub.io.crd.yaml` — CRD property

```yaml
                    myModule:
                      type: boolean
                      description: 'When true, enables the My Module features.'
```

Plus ownership (`OWNERS`, `OWNERS_ALIASES`, `packages/<name>/OWNERS`) and `.github/dependabot.yml` (`/packages/<name>/bff` in the `gomod` directories).

## Extension Types Reference

Extensions are defined in `frontend/src/odh/extensions.ts` (federated modules). Import `SupportedArea` from `@odh-dashboard/plugin-core/areas`.

### `app.area` — Feature area definition

```typescript
{
  type: 'app.area',
  properties: {
    id: SupportedArea.PLUGIN_MY_MODULE,
    featureFlags: ['myModule'],
  },
}
```

### `app.navigation/section` — Nav section (collapsible group)

```typescript
{
  type: 'app.navigation/section',
  flags: { required: [SupportedArea.PLUGIN_MY_MODULE] },
  properties: {
    id: 'my-module',
    title: 'My Module',
    group: '7_my_module_studio',
  },
}
```

### `app.navigation/href` — Nav link

```typescript
{
  type: 'app.navigation/href',
  flags: { required: [SupportedArea.PLUGIN_MY_MODULE] },
  properties: {
    id: 'my-module-view',
    title: 'My Module',
    href: '/my-module/main-view',
    section: 'my-module',
    path: '/my-module/main-view/*',
  },
}
```

### `app.route` — Page route

```typescript
{
  type: 'app.route',
  flags: { required: [SupportedArea.PLUGIN_MY_MODULE] },
  properties: {
    path: '/my-module/main-view/*',
    component: () => import('./MyModuleWrapper'),
  },
}
```

## Makefile Target Reference

Standard targets for federated modules (see `packages/data-connect-hub/Makefile`):

| Target | Purpose |
|--------|---------|
| `dev-install-dependencies` | No-op — dependencies come from the root `pnpm install` |
| `dev-start` | Standalone mock mode (BFF + frontend) |
| `dev-frontend-federated` | Frontend dev server on the allocated port (`PORT=<port> PROXY_PORT=<bff-port>`) |
| `dev-bff-federated` | Go BFF against a real cluster (`PORT=<bff-port>`) |
| `dev-start-federated` | Both of the above |
| `dev-bff-e2e-mock` | BFF in mock mode for E2E tests (`PORT=$(E2E_BFF_PORT)`) |
| `dev-bff-e2e-cluster` | BFF against a real cluster for E2E (`PORT=$(E2E_BFF_PORT)`) |
| `docker-build-federated` | Container image from `Dockerfile.workspace` (context `../..`) |

Ports are inline in the recipes; the only Makefile variable is `E2E_BFF_PORT ?= 8080`, overridden by the package's `cypress:server:e2e` script (`E2E_BFF_PORT=<frontend-port>`).

## Dockerfile Pattern

Federated modules use `Dockerfile.workspace` — a multi-stage build from the repository root:

1. **Stage 1 (Node, `ubi9/nodejs-22`)**: install the pinned pnpm from `prefetch/pnpm` (`npm ci --prefix ./prefetch/pnpm`, hermetic for Konflux), copy the root manifests (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`) and shared packages (`app-config`, `foundation`, `k8s-core`, `plugin-core`, `tsconfig`, `ui-core`), `pnpm install --frozen-lockfile --prefer-offline`, then `pnpm run build:prod` with `DEPLOYMENT_MODE=federated`
2. **Stage 2 (Go, `ubi9/go-toolset:1.26`)**: `go build -tags strictfipsruntime -o bff ./cmd` (copy `pkg/tls/` too if the BFF uses the shared TLS package)
3. **Stage 3 (`ubi9-minimal`)**: BFF binary + `dist/` as `./static/`

```bash
podman build --file ./packages/<name>/Dockerfile.workspace .
```

## Module Federation Config in package.json

```json
{
  "module-federation": {
    "name": "<camelCase>",
    "remoteEntry": "/remoteEntry.js",
    "authorize": true,
    "tls": false,
    "proxy": [
      { "path": "/<kebab>/api", "pathRewrite": "/api" },
      { "path": "/<kebab>/healthcheck", "pathRewrite": "/healthcheck" }
    ],
    "local": { "host": "localhost", "port": <frontend-port> },
    "service": { "name": "odh-dashboard-<kebab>-ui", "port": <production-service-port> }
  }
}
```

## Shared Singletons (moduleFederation.js)

`OdhFederationPlugin` (`@odh-dashboard/app-config/rspack`) applies the shared singleton policy automatically. Do not maintain a manual `shared` map for React / PatternFly / ODH packages. Ensure those packages are listed in the frontend `package.json` `dependencies` so they are picked up from rspack `compiler.context`.

Pass `isHost: process.env.DEPLOYMENT_MODE === 'standalone'` so standalone builds eager-share and bundle imports, while federated remotes use `import: false`.

## Onboarding Checklist

| # | Item | Owner |
|---|------|-------|
| 1 | Unique frontend, BFF and production service ports allocated | `/module-onboarding` Phase 1 |
| 2 | Package scaffolded under `packages/<name>/` with correct names and ports | Phase 2 |
| 3 | `package.json`: MF config (incl. healthcheck proxy, service), `cypress:mock:*` (if participating in dashboard Cypress mock tests), `cypress:server:e2e`, `lint`, `type-check`, `workspace:*` deps | Phase 2 |
| 4 | `moduleFederation.js` uses `OdhFederationPlugin` | Phase 2 |
| 5 | Extensions file with area, nav, route using `SupportedArea.PLUGIN_<X>` | Phase 2 |
| 6 | BFF with unique Go module path, `/healthcheck`, no `go.work` | Phase 2 |
| 7 | `Dockerfile.workspace` with `MODULE_NAME=<name>` and prefetched pnpm | Phase 2 |
| 8 | `pnpm-workspace.yaml` entry | Phase 3 |
| 9 | `SupportedArea` entry in `packages/plugin-core/src/areas/types.ts` | Phase 3 |
| 10 | Flag in `DashboardCommonConfig` (`packages/k8s-core/src/k8sTypes.ts`) | Phase 3 |
| 11 | Flag default + `SupportedAreasStateMap` entry in `const.ts` | Phase 3 |
| 12 | Flag in the OdhDashboardConfig CRD | Phase 3 |
| 13 | `OWNERS`, `OWNERS_ALIASES`, package `OWNERS`, dependabot `gomod` entry | Phase 3 |
| 14 | `pnpm install`, `validate:ports`, `validate:cypress-mock` pass | Phase 4 |
| 15 | Lint, type-check, frontend build, BFF build/test pass | Phase 4 |
| 16 | Container image builds | Phase 4 (optional) |
| — | Unit, Cypress mock/E2E and contract tests | Manual (post-skill) |
| — | ODH/RHOAI Dockerfiles, Konflux component, OpenShift CI | `/konflux-onboarding` |
| — | Standalone manifests `manifests/modules/<name>/` + `manifests/modules/kustomization.yaml` | `/konflux-onboarding` |
| — | dashboard-operator registry, tests, Helm `relatedImages` | `/konflux-onboarding` |
| — | `RELATED_IMAGE` in opendatahub-operator | `/konflux-onboarding` (external PR) |

## Troubleshooting

### Port conflict after creation

**Symptom**: `pnpm run validate:ports` or `pnpm run validate:cypress-mock` fails with a duplicate port.

**Fix**: Change the port in `packages/<name>/package.json` (`module-federation.local.port` and the `cypress:server*` scripts), `frontend/package.json` (`cypress:server`, `test:cypress-ci`) and the `Makefile`. Re-run validation. Remember `distributions/*` packages also own ports in the 91xx range.

### Type-check fails after area registration

**Symptom**: type error in `const.ts` or `extensions.ts` — feature flag name not assignable, or `PLUGIN_<X>` does not exist on `SupportedArea`.

**Fix**: Add `<flagName>?: boolean;` to `DashboardCommonConfig` in `packages/k8s-core/src/k8sTypes.ts`, and `PLUGIN_<X>` to `packages/plugin-core/src/areas/types.ts`.

### mod-arch-installer outdated or fails

**Symptom**: `pnpm dlx mod-arch-installer` fails, or `--help` has no `--service-port` flag (versions before 1.23.0 still scaffold webpack/npm/ESLint 9 output).

**Fix**: Use the pinned `pnpm dlx mod-arch-installer@1.23.0` (bump the pin deliberately, after reviewing a new release, in every onboarding doc at once). If the published version is still outdated, fall back to manual scaffolding from `packages/data-connect-hub/`.

### pnpm install does not pick up the module

**Symptom**: `@odh-dashboard/<name>-ui` missing, `Cannot find module '@odh-dashboard/app-config/rspack'`, or the Dockerfile's `--frozen-lockfile` install fails.

**Fix**: Add `packages/<name>/frontend` to `pnpm-workspace.yaml`, run `pnpm install` from the root and commit `pnpm-lock.yaml`.

### Rspack build fails with "shared module not found"

**Fix**: Verify `frontend/config/moduleFederation.js` uses `OdhFederationPlugin` with `isHost: process.env.DEPLOYMENT_MODE === 'standalone'`, and that `@odh-dashboard/plugin-core` / `@odh-dashboard/app-config` are `workspace:*` deps of the frontend.

### BFF Go build fails

**Fix**: `cd packages/<name>/bff && go mod tidy`. Ensure `go.mod` has a unique module path, there is no `go.work`, and the `go` directive is not higher than the toolchain in `Dockerfile.workspace`.

## Deployment Manifests (created by `/konflux-onboarding`)

Each module deploys as its own Kubernetes Deployment from `manifests/modules/<name>/`:

| File | Purpose |
|------|---------|
| `deployment.yaml` | Independent Deployment with 2 replicas, TLS config, and a dedicated ServiceAccount |
| `service.yaml` | Service exposing the module's port (name pattern: `odh-dashboard-<slug>-ui`) |
| `networkpolicy.yaml` | NetworkPolicy for ingress from the dashboard and inter-BFF egress |
| `service-account.yaml` | Dedicated ServiceAccount for SA isolation |
| `cluster-role.yaml` | Module-specific ClusterRole |
| `cluster-role-binding.yaml` | ClusterRoleBinding for the module's ServiceAccount |
| `kustomization.yaml` | Kustomize entry referencing all resources |
| `params.env` | Kustomize parameter defaults (image reference) |

The module directory must also be listed in `manifests/modules/kustomization.yaml`. Reference `manifests/modules/data-connect-hub/` or `manifests/modules/gen-ai/`.

## Operator Registration Reference (done by `/konflux-onboarding`)

### Files modified

| File | Change |
|------|--------|
| `dashboard-operator/internal/controller/modules.go` | Add entry to `moduleRegistry` |
| `dashboard-operator/internal/controller/modules_test.go` | `TestModuleRegistry` count, `TestModuleNames` list, every `wantLen` in `TestResolveModuleStatuses`, `TestProxyPathsFor` (if custom `ProxyPaths`) |
| `dashboard-operator/internal/controller/federation_integration_test.go` | Add the slug to the module slug list |
| `dashboard-operator/charts/dashboard/values.yaml` | Append `RELATED_IMAGE_ODH_MOD_ARCH_<UPPER_SNAKE>_IMAGE: ""` to `relatedImages:` (append order, not alphabetical) |
| `dashboard-operator/charts/dashboard/templates/rbac.yaml` + `config/rbac/role.yaml` | Only if the module ClusterRole grants verbs/resources the operator itself lacks (RBAC escalation prevention) |

**No changes needed** to `dashboard_federation.go` / `module_deploy.go` (proxy paths come from `ModuleDefinition.ProxyPaths`, defaulting to `/<ManifestSlug>/api → /api`) or `support.go` (`imagesMap` is filled from the registry in `init()`, key `<ManifestSlug>-ui-image`).

### Registry entry

```go
"<camelCase>": {
    Name:          "<camelCase>",
    ContainerName: "<kebab>-ui",
    Port:          <production-service-port>,
    ImageEnvVar:   "RELATED_IMAGE_ODH_MOD_ARCH_<UPPER_SNAKE>_IMAGE",
    ManifestSlug:  "<kebab>",
    TLS:           true,
    ProxyPaths: []proxyRoute{
        {Path: "/<kebab>/api", PathRewrite: "/api"},
        {Path: "/<kebab>/healthcheck", PathRewrite: "/healthcheck"},
    },
    // Optional: RequiredDSCComponents, InterModuleDependencies, InterBFFDeps, RequiredByMaaSPortal.
    // Omit fields that are empty.
},
```

### DSC component gates

| DSC Component | Used by |
|---------------|---------|
| `modelregistry` | modelRegistry |
| `aipipelines` | automl, autorag |
| `trustyai` | evalHub |
| `mlflowoperator` | mlflow |
| `dataRegistry` | dataRegistry |

### External: opendatahub-operator

The opendatahub-operator uses an explicit list of `RELATED_IMAGE_*` env var names in `internal/controller/modules/dashboard/support.go` → `relatedImages()`. When onboarding a new module, add the new env var name (e.g., `"RELATED_IMAGE_ODH_MOD_ARCH_MY_MODULE_IMAGE"`) to this list. This is a one-line change — open a PR against `opendatahub-io/opendatahub-operator` and request a review in the `#ai-core-platform-requests` Slack channel.

The Konflux nudge pipeline must also include the new module's image digest in the operator deployment.
