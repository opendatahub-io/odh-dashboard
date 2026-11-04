---
name: module-onboarding
description: Scaffold a new federated module under packages/. Runs mod-arch-installer with allocated ports, registers the pnpm workspace member, SupportedArea, feature flag (type, defaults, CRD) and OWNERS in the host, and verifies install, ports, lint, type-check, frontend and BFF builds. Standalone manifests and dashboard-operator registration are deferred to /konflux-onboarding (after CI/CD is set up and images are available). Pass the module name in kebab-case as the argument.
---

# Module Onboarding

Scaffold a new federated module (Module Federation remote with Go BFF) in the ODH Dashboard monorepo. The module is ready to build and run locally after this skill completes.

**Scope:** this skill owns everything under `packages/<name>/` plus host registration. It does **not** create `manifests/modules/<name>/` or touch `dashboard-operator/` — `/konflux-onboarding` does that once the image is buildable (otherwise the operator deploys a pod that enters ImagePullBackOff).

See [reference.md](reference.md) for naming conventions, port ranges, templates, and troubleshooting. See `.claude/rules/module-onboarding.md` for the full manual guide.

**Golden example:** `packages/data-connect-hub/` is the most recent module onboarded with this flow. When in doubt, mirror it.

## Arguments

`$ARGUMENTS` — Module name in kebab-case (e.g., `my-module`). If empty, ask the user.

## Phase 0: Parse & Validate

1. **Extract the module name** from `$ARGUMENTS`. If empty, ask the user for a name.

2. **Validate the name**:
   - Must be non-empty, lowercase, kebab-case (only `[a-z0-9-]`, no leading/trailing hyphens).
   - Must not already exist: check that `packages/<name>/` does not exist.

3. **Compute all name variants** (see reference.md § Name Transformation Rules):

   ```text
   kebab-case:       my-module
   camelCase:        myModule
   UPPER_SNAKE_CASE: MY_MODULE
   Title Case:       My Module
   ```

   And derived identifiers:

   ```text
   Package:       @odh-dashboard/my-module
   SupportedArea: PLUGIN_MY_MODULE = 'plugin-my-module'
   Feature flag:  myModule
   MF name:       myModule
   Proxy paths:   /my-module/api, /my-module/healthcheck
   Service name:  odh-dashboard-my-module-ui
   ```

4. **Ask the user** for the GitHub handles of the module's approvers and reviewers (used for `OWNERS_ALIASES`). If they don't know yet, use the requesting user's handle and flag it in the report.

5. **Check prerequisites**: Node `>= 22.18.0` and pnpm `11.22.0` (the root `packageManager` pin). If the global `pnpm` is a different version, run every pnpm command below as `corepack pnpm …` or `npx --yes pnpm@11.22.0 …`.

## Phase 1: Port Allocation

Collect the ports already in use and pick the next free value in each range. The commands are portable (BSD and GNU grep) — do not use `grep -P`, which fails on macOS.

1. **Frontend dev / MF local port** (range **9100–9399**). Include `distributions/` — e.g. `distributions/core-bff` owns a port in this range:

   ```bash
   pnpm run validate:ports
   ```

   The first table lists every `module-federation.local.port` in the workspace. Pick the next unused value.

2. **BFF local dev port** (range **4000–4099**). Ports are inline in Makefile recipes and package scripts (`PORT=…` / `PROXY_PORT=…`), not Makefile variables:

   ```bash
   grep -hoE '(PROXY_)?PORT=40[0-9]{2}' packages/*/Makefile packages/*/package.json 2>/dev/null | grep -oE '[0-9]+' | sort -n | uniq
   ```

   Avoid `4000` (used by data-registry/model-serving and by default dev setups) and `4010` (the dashboard shell).

3. **Production service port** (the container/Service port the operator deploys; `module-federation.service.port`). The operator registry is the source of truth and is the second table printed by `pnpm run validate:ports`:

   ```bash
   grep -E '^\s+Port:\s+[0-9]+' dashboard-operator/internal/controller/modules.go | grep -oE '[0-9]+' | sort -n
   ```

   Existing ports step by 100 (`8043, 8143, … 9243`). Pick the next step above the highest (e.g. `9343`).

4. **Report** the chosen ports to the user: frontend `<port>`, BFF `<bff-port>`, service `<service-port>`.

## Phase 2: Scaffold with mod-arch-installer

### Step 1: Run the installer

```bash
cd packages && pnpm dlx mod-arch-installer@latest -n <name> --port <port> --bff-port <bff-port> --service-port <service-port>
```

The `--port`/`--bff-port`/`--service-port` flags need mod-arch-installer **>= 1.23.0**. Check before trusting the output:

```bash
pnpm dlx mod-arch-installer@latest --help | grep -q -- '--service-port' && echo OK || echo "OUTDATED installer"
```

If the installer is outdated or fails, fall back to **manual scaffolding**: copy `packages/data-connect-hub/` (excluding `node_modules`, `bff/static*`, `frontend/public-cypress`, `frontend/dist`, `contract-tests/`), and replace every name/port reference (see reference.md § Name Transformation Rules). Do not copy from `packages/plugin-template/` — its `Dockerfile.workspace` is model-registry specific.

### Step 2: Verify and patch the generated output

Verify the following (compare with `packages/data-connect-hub/`) and patch anything that is off:

**`packages/<name>/package.json`**:
- `name` is `@odh-dashboard/<name>`
- `module-federation.name` is `<camelCase>`
- `module-federation.proxy` has `/<name>/api → /api` and `/<name>/healthcheck → /healthcheck`
- `module-federation.local.port` is the allocated frontend port
- `module-federation.service` is `{ "name": "odh-dashboard-<name>-ui", "port": <service-port> }`
- Scripts:
  - `cypress:mock:build`, `cypress:mock:build:coverage`, `cypress:mock:dev` — opt the remote in to dashboard Cypress mock orchestration (`pnpm run validate:cypress-mock`)
  - `cypress:server`, `cypress:server:build`, `cypress:server:dev`, `cypress:server:wait` (`http-get://localhost:<port>/healthcheck`)
  - `cypress:server:e2e` (`make dev-bff-e2e-cluster E2E_BFF_PORT=<port>`), `cypress:server:e2e:wait`, `prepare:e2e`
  - `lint` and `type-check` — delegate to the frontend so root `pnpm run lint` / `pnpm run type-check` (turbo) cover the module
- Internal deps use the pnpm workspace protocol (`workspace:*`): `@odh-dashboard/internal`, `plugin-core`, `ui-core` (`dependencies`); `app-config`, `eslint-config`, `tsconfig` (`devDependencies`)
- No `exports` field is needed for federated remotes (extensions are loaded via Module Federation)

**`packages/<name>/frontend/package.json`**:
- `name` is `<name>-ui`; no `packageManager` field (workspace members inherit the root pin)
- `@odh-dashboard/plugin-core` (dep) and `@odh-dashboard/app-config` (devDep) are `workspace:*`
- PatternFly versions match the host (`~6.6.x`; see `pnpm.overrides` in the root `package.json`)

**`packages/<name>/frontend/config/moduleFederation.js`**:
- Uses `OdhFederationPlugin` from `@odh-dashboard/app-config/rspack` with `name: '<camelCase>'`
- `isHost: process.env.DEPLOYMENT_MODE === 'standalone'`
- `exposes` includes `'./extensions': './src/odh/extensions'`
- No hand-written `shared` map (the plugin applies the singleton policy)

**`packages/<name>/frontend/src/odh/extensions.ts`**:
- `app.area` extension with `id: SupportedArea.PLUGIN_<UPPER_SNAKE>` (from `@odh-dashboard/plugin-core/areas`) and `featureFlags: ['<camelCase>']`
- `app.navigation/*` and `app.route` extensions with `flags.required: [SupportedArea.PLUGIN_<UPPER_SNAKE>]`

**`packages/<name>/Makefile`**:
- `dev-install-dependencies` is a no-op (dependencies come from the root `pnpm install`)
- `dev-frontend-federated` runs with `PORT=<port> PROXY_PORT=<bff-port>`; `dev-bff*` targets use `PORT=<bff-port>`
- Has `dev-start-federated`, `dev-bff-federated`, `dev-bff-e2e-mock`, `dev-bff-e2e-cluster` (with `E2E_BFF_PORT ?= 8080`)

**`packages/<name>/Dockerfile.workspace`**:
- `ARG MODULE_NAME=<name>`
- Installs pnpm from `prefetch/pnpm` (hermetic Konflux builds), then `pnpm install --frozen-lockfile --prefer-offline`
- `go-toolset` image matches the other modules (currently `1.26`)

**`packages/<name>/bff/`**:
- `go.mod` module path is unique (e.g. `github.com/opendatahub-io/<name>/bff`; the template ships `github.com/opendatahub-io/mod-arch-library/bff` — rename it and its imports)
- No `go.work` file

**Config files**: `frontend/tsconfig.json`, `frontend/jest.config.js`, `frontend/.eslintrc.js`, root `tsconfig.json`.

## Phase 3: Register in Host

Read each file first to find the insertion point; add the new entry next to the most recent module (`dataConnectHub` / `PLUGIN_DATA_CONNECT_HUB`).

### 1. pnpm workspace — `pnpm-workspace.yaml`

Each module frontend is listed explicitly (`packages/*` does not match nested `frontend/` packages). Add:

```yaml
  - packages/<name>/frontend
```

### 2. SupportedArea enum — `packages/plugin-core/src/areas/types.ts`

Under the `/* Plugins */` comment:

```typescript
PLUGIN_<UPPER_SNAKE> = 'plugin-<kebab>',
```

### 3. Feature flag type — `packages/k8s-core/src/k8sTypes.ts`

Add to the end of `DashboardCommonConfig` (`frontend/src/k8sTypes.ts` only re-exports it):

```typescript
<camelCase>?: boolean;
```

### 4. Flag default + state map — `frontend/src/concepts/areas/const.ts`

**a)** Add the flag default to `techPreviewFlags` (as `agentOps`, `dataRegistry` and `dataConnectHub` do). Use `devTemporaryFeatureFlags` only for short-lived dev switches that never ship in the CRD.

```typescript
<camelCase>: false,
```

**b)** Add an entry to `SupportedAreasStateMap`:

```typescript
[SupportedArea.PLUGIN_<UPPER_SNAKE>]: {
  featureFlags: ['<camelCase>'],
},
```

### 5. CRD — `manifests/base/crd/odhdashboardconfigs.opendatahub.io.crd.yaml`

Add the flag under `spec.dashboardConfig.properties` (after `dataConnectHub`), otherwise it cannot be set on a cluster:

```yaml
                    <camelCase>:
                      type: boolean
                      description: 'When true, enables the <Title Case> features.'
```

### 6. Ownership — `OWNERS`, `OWNERS_ALIASES`, `packages/<name>/OWNERS`

Mirror the `data-connect-hub` entries:
- `OWNERS` `filters`: `'(packages/<name>|manifests/modules/<name>)/.*'` → `<name>-approvers` / `<name>-reviewers`, label `area/<name>`
- `OWNERS_ALIASES`: `<name>-approvers` and `<name>-reviewers` with the handles from Phase 0
- `packages/<name>/OWNERS`: the same aliases and label

### 7. Dependabot — `.github/dependabot.yml`

Add `/packages/<name>/bff` to the `gomod` update `directories` list so the new BFF gets security updates.

## Phase 4: Install & Build Verification

Run from the repository root, sequentially. Stop and fix on first failure before proceeding.

### Step 1: Install workspace

```bash
pnpm install
```

This wires up the new package and updates `pnpm-lock.yaml` (commit it).

### Step 2: Validate ports and Cypress mock registration

```bash
pnpm run validate:ports
pnpm run validate:cypress-mock
```

`validate:ports` checks local ports across the workspace and production ports in the operator registry. The new module only joins the registry in `/konflux-onboarding`, so re-check its service port against the second table manually. `validate:cypress-mock` confirms the remote is selected for mock tests with a unique name and port.

### Step 3: Lint and type-check

```bash
pnpm --filter @odh-dashboard/<name> run lint
pnpm --filter @odh-dashboard/<name> run type-check
pnpm --filter @odh-dashboard/plugin-core --filter @odh-dashboard/k8s-core run type-check
```

This verifies the extensions file compiles against the new `SupportedArea` entry and feature flag. If `featureFlags` errors with "not assignable", the flag is missing from `DashboardCommonConfig` (Phase 3.3).

### Step 4: Frontend build

```bash
(cd packages/<name>/frontend && DEPLOYMENT_MODE=federated pnpm run build)
```

### Step 5: BFF compilation

```bash
(cd packages/<name>/bff && go build ./... && go test ./... -count=1)
```

If it fails, run `go mod tidy` first and retry.

### Step 6: Container build (optional)

```bash
podman build --file ./packages/<name>/Dockerfile.workspace .
```

If `podman` is not available, try `docker build`. This step is slow — ask before running; the earlier steps already confirm correctness.

## Phase 5: Report

Summarize the completed onboarding:

1. **Files created**: the top-level layout of `packages/<name>/`
2. **Host files modified**: `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `packages/plugin-core/src/areas/types.ts`, `packages/k8s-core/src/k8sTypes.ts`, `frontend/src/concepts/areas/const.ts`, the CRD, `OWNERS`, `OWNERS_ALIASES`, `.github/dependabot.yml`
3. **Port assignments**: frontend, BFF, production service port
4. **Verification results**: pass/fail for each Phase 4 step
5. **Next steps** for the team:
   - Write feature code in `packages/<name>/frontend/src/app/`
   - Add unit tests next to the code (`__tests__/`)
   - Add Cypress mock tests in `packages/cypress/cypress/tests/mocked/<name>/` and E2E tests in `packages/cypress/cypress/tests/e2e/<name>/`
   - Add contract tests in `packages/<name>/contract-tests/` and a `test:contract` script (see `packages/data-connect-hub/package.json`)
   - Run locally: `pnpm run dev:backend` and `pnpm run dev:frontend` from the root, then `cd packages/<name> && make dev-start-federated`
   - Enable the feature locally: set `<camelCase>: true` in the dashboard config
   - **Run `/konflux-onboarding`** for CI/CD: Dockerfiles, Konflux component, OpenShift CI, standalone manifests (`manifests/modules/<name>/`), dashboard-operator registration, and the `RELATED_IMAGE` entry in the opendatahub-operator
