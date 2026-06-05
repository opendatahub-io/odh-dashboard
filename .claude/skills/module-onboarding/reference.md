# Module Onboarding — Reference

Supplementary reference for the module-onboarding skill. Read `.claude/rules/module-onboarding.md` for the full manual guide.

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
| Directory | `packages/<kebab>/` | `packages/my-module/` |
| MF name | `<camelCase>` | `myModule` |
| SupportedArea enum | `PLUGIN_<UPPER_SNAKE>` | `PLUGIN_MY_MODULE` |
| SupportedArea value | `'plugin-<kebab>'` | `'plugin-my-module'` |
| Feature flag key | `<camelCase>` | `myModule` |
| Proxy path | `/<kebab>/api` | `/my-module/api` |
| Nav section ID | `<kebab>` | `my-module` |
| Nav group | `'5_<snake_case>'` | `'5_my_module'` |
| CSS prefix | `<kebab>-` | `my-module-` |

## Port Ranges

| Purpose | Range | Config location |
|---------|-------|-----------------|
| Frontend dev server | 9100–9399 | `package.json` → `module-federation.local.port` |
| BFF proxy port | 4000–4099 | `Makefile` → `PROXY_PORT` |
| Production service | 8043 (shared) | `package.json` → `module-federation.service.port` |

**How to find the next available port:**

```bash
# Frontend ports — scan all packages
jq -r '."module-federation".local.port // empty' packages/*/package.json 2>/dev/null | awk '$1>=9100 && $1<=9399' | sort -n

# BFF ports — scan Makefiles
grep -r 'PROXY_PORT=' packages/*/Makefile | grep -oP '\d{4,5}' | sort -n
```

Validate after creation: `npm run validate:ports`

## Feature Flag Registration (3-File Pattern)

New modules require changes in **three files** to register their feature flag:

### 1. `frontend/src/k8sTypes.ts` — Type definition

Add to the `DashboardCommonConfig` type as an optional boolean, in the tech-preview section (after the existing optional flags):

```typescript
export type DashboardCommonConfig = {
  // ... existing flags ...
  myModule?: boolean;  // ← add here
};
```

### 2. `frontend/src/concepts/areas/types.ts` — SupportedArea enum

Add an entry to the `SupportedArea` enum. Place under the appropriate section comment:

```typescript
export enum SupportedArea {
  // ... existing entries ...

  /* Plugins */
  PLUGIN_MY_MODULE = 'plugin-my-module',
}
```

### 3. `frontend/src/concepts/areas/const.ts` — Flag default + state map

**a)** Add the flag default to the appropriate group:

```typescript
// For new/experimental modules → devTemporaryFeatureFlags
export const devTemporaryFeatureFlags = {
  // ... existing flags ...
  myModule: false,
} satisfies Partial<DashboardCommonConfig>;
```

**b)** Add the area to `SupportedAreasStateMap`:

```typescript
export const SupportedAreasStateMap: SupportedAreasState = {
  // ... existing entries ...
  [SupportedArea.PLUGIN_MY_MODULE]: {
    featureFlags: ['myModule'],
  },
};
```

## Extension Types Reference

Extensions are defined in `frontend/src/odh/extensions.ts` (federated modules).

### `app.area` — Feature area definition

```typescript
{
  type: 'app.area',
  properties: {
    id: '<PLUGIN_AREA_CONSTANT>',  // e.g., PLUGIN_MY_MODULE
    featureFlags: ['<flagName>'],  // e.g., ['myModule']
  },
}
```

### `app.navigation/section` — Nav section (collapsible group)

```typescript
{
  type: 'app.navigation/section',
  flags: { required: ['<PLUGIN_AREA_CONSTANT>'] },
  properties: {
    id: '<kebab-name>',
    title: '<Title Case>',
    group: '5_<snake_case>',
  },
}
```

### `app.navigation/href` — Nav link

```typescript
{
  type: 'app.navigation/href',
  flags: { required: ['<PLUGIN_AREA_CONSTANT>'] },
  properties: {
    id: '<kebab-name>-overview',
    title: 'Overview',
    href: '/<kebab-name>',
    section: '<kebab-name>',
  },
}
```

### `app.route` — Page route

```typescript
{
  type: 'app.route',
  flags: { required: ['<PLUGIN_AREA_CONSTANT>'] },
  properties: {
    path: '/<kebab-name>',
    component: () => import('./pages/OverviewPage'),
  },
}
```

## Makefile Target Reference

Standard targets for federated modules (see `packages/eval-hub/Makefile` or `packages/gen-ai/Makefile` for examples):

| Target | Purpose |
|--------|---------|
| `dev-install-dependencies` | Install frontend deps |
| `dev-frontend-federated` | Run frontend dev server on allocated port |
| `dev-bff-federated` | Run Go BFF with port forwarding |
| `dev-start-federated` | Run both BFF and frontend |
| `dev-bff-e2e-mock` | Start BFF in mock mode for E2E tests |
| `dev-bff-e2e-cluster` | Start BFF against real cluster for E2E |
| `docker-build-federated` | Build container image |

Key variables in Makefile:

```makefile
PORT=<frontend-port>        # e.g., 9110
PROXY_PORT=<bff-port>       # e.g., 4010
AUTH_METHOD=user_token
DEPLOYMENT_MODE=federated
STYLE_THEME=patternfly
```

## Dockerfile Pattern

Federated modules use `Dockerfile.workspace` — a multi-stage build:

1. **Stage 1 (Node)**: Build the frontend webpack bundle
   - Copy root workspace manifests, install deps
   - Copy package source, run `npm run build` with `DEPLOYMENT_MODE=standalone`
2. **Stage 2 (Go)**: Build the BFF binary (if included)
   - Copy `bff/` directory, run `go build -o /bff-binary ./cmd`
3. **Stage 3 (Runtime)**: Minimal image with built artifacts
   - Copy frontend dist from stage 1
   - Copy BFF binary from stage 2 (if included)
   - Set entrypoint

Build from repo root:

```bash
podman build --file ./packages/<name>/Dockerfile.workspace .
# or
docker build --file ./packages/<name>/Dockerfile.workspace .
```

## Module Federation Config in package.json

```json
{
  "module-federation": {
    "name": "<camelCase>",
    "remoteEntry": "/remoteEntry.js",
    "authorize": true,
    "tls": false,
    "proxy": [{ "path": "/<kebab>/api", "pathRewrite": "/api" }],
    "local": { "host": "localhost", "port": <frontend-port> },
    "service": { "name": "odh-dashboard", "port": 8043 }
  }
}
```

## Shared Singletons (moduleFederation.js)

Every federated module must share these as singletons:

```javascript
shared: {
  react: { singleton: true, requiredVersion: deps.react },
  'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
  'react-router': { singleton: true, requiredVersion: deps['react-router'] },
  'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
  '@patternfly/react-core': { singleton: true, requiredVersion: deps['@patternfly/react-core'] },
  '@odh-dashboard/internal': { singleton: true, requiredVersion: '*' },
  '@odh-dashboard/plugin-core': { singleton: true, requiredVersion: '*' },
}
```

## Onboarding Checklist

This checklist maps to skill phases. Items marked with a phase are handled automatically.

| # | Item | Skill Phase |
|---|------|-------------|
| 1 | Package directory exists under `packages/<name>/` | Phase 2 |
| 2 | `package.json` has correct name, exports, module-federation config | Phase 2 |
| 3 | Unique frontend port allocated (9100–9399) | Phase 1 |
| 4 | Unique BFF port allocated (4000–4099) if BFF included | Phase 1 |
| 5 | `tsconfig.json`, `jest.config.ts`, `.eslintrc.js` present | Phase 2 |
| 6 | Webpack configs under `frontend/config/` | Phase 2 |
| 7 | Extensions file with area, nav, route stubs | Phase 2 |
| 8 | Feature flag added to `DashboardCommonConfig` in `k8sTypes.ts` | Phase 3 |
| 9 | `SupportedArea` enum entry added in `types.ts` | Phase 3 |
| 10 | Flag default + `SupportedAreasStateMap` entry in `const.ts` | Phase 3 |
| 11 | BFF with `/healthcheck` endpoint (if included) | Phase 2 |
| 12 | `Dockerfile.workspace` present and builds | Phase 4 |
| 13 | `Makefile` with standard targets | Phase 2 |
| 14 | `npm install` succeeds | Phase 5 |
| 15 | `npm run validate:ports` passes | Phase 5 |
| 16 | `npm run type-check` passes | Phase 5 |
| 17 | Container image builds successfully | Phase 5 |
| — | Unit tests in `__tests__/` | Manual (post-skill) |
| — | E2E tests in `packages/cypress/cypress/tests/e2e/<name>/` | Manual (post-skill) |
| — | Contract tests in `contract-tests/` (if BFF) | Manual (post-skill) |

## Troubleshooting

### Port conflict after creation

**Symptom**: `npm run validate:ports` fails with duplicate port error.

**Fix**: Edit `packages/<name>/package.json` → `module-federation.local.port` to a different value. Re-run validation.

### Type-check fails after area registration

**Symptom**: `npm run type-check` reports error in `const.ts` — feature flag name not assignable to `FeatureFlag`.

**Cause**: The flag name was not added to `DashboardCommonConfig` in `k8sTypes.ts`.

**Fix**: Add `<flagName>?: boolean;` to the `DashboardCommonConfig` type in `frontend/src/k8sTypes.ts`.

### mod-arch-installer not found or fails

**Symptom**: `npx mod-arch-installer` fails with ENOENT or network error.

**Fix**: The skill falls back to manual scaffolding. Alternatively, install it explicitly: `npm install -g mod-arch-installer` and retry.

### Webpack build fails with "shared module not found"

**Symptom**: Build error mentioning missing shared module.

**Fix**: Verify `frontend/config/moduleFederation.js` lists all required singletons (see Shared Singletons section above). Ensure `@odh-dashboard/plugin-core` and `@odh-dashboard/internal` are in the package's dependencies.

### BFF Go build fails

**Symptom**: `go build ./cmd` fails with import errors.

**Fix**: Run `cd packages/<name>/bff && go mod tidy` to resolve dependencies. Ensure `go.mod` has the correct module path.
