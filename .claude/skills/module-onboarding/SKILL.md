---
name: module-onboarding
description: Scaffold a new federated module under packages/. Runs mod-arch-installer, allocates ports, registers the feature flag and SupportedArea in the host, creates standalone deployment manifests, registers the module in the dashboard-operator, and verifies the build. Pass the module name in kebab-case as the argument.
---

# Module Onboarding

Scaffold a new federated module (Module Federation remote with optional Go BFF) in the ODH Dashboard monorepo. The module is ready to build and run after this skill completes.

See [reference.md](reference.md) for naming conventions, port ranges, templates, and troubleshooting. See `.claude/rules/module-onboarding.md` for the full manual guide.

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
   Proxy path:    /my-module/api
   ```

4. **Ask the user**: Include a Go BFF (backend-for-frontend)? Default: **yes**.

5. **Ask the user**: Which DSC component(s) gate this module? (e.g., `modelregistry`, `aipipelines`, `trustyai`, `mlflowoperator`). These determine when the operator enables/disables the module based on DataScienceCluster availability. Default: **none** (module is always enabled).

6. **Ask the user**: Does this module depend on any other modules? (e.g., `genAi`). If a dependency is disabled, this module will also be disabled. Default: **none**.

## Phase 1: Port Allocation

1. **Scan existing frontend ports**:

   ```bash
   jq -r '."module-federation".local.port // empty' packages/*/package.json 2>/dev/null | awk '$1>=9100 && $1<=9399' | sort -n
   ```

   This reads every `packages/*/package.json` that has a `module-federation` key and collects `module-federation.local.port` values. Find the next unused integer in the **9100–9399** range.

2. **Scan existing BFF ports** (if BFF included):

   ```bash
   grep -r 'PROXY_PORT=' packages/*/Makefile | grep -oP '\d{4,5}' | sort -n
   ```

   Find the next unused integer in the **4000–4099** range.

3. **Report** the chosen ports to the user:
   - Frontend dev port: `<port>`
   - BFF proxy port: `<port>` (if applicable)

## Phase 2: Scaffold with mod-arch-installer

### Step 1: Run the installer

```bash
cd packages && npx mod-arch-installer -n <name>
```

If the installer fails (network error, not found, etc.), fall back to **manual scaffolding**: copy the structure from an existing federated module like `packages/eval-hub/` and replace all name references. See reference.md § Module Federation Config for the package.json template.

### Step 2: Verify and patch the generated output

After the installer completes, verify the following files exist and are correct. Patch any that need fixing:

**`packages/<name>/package.json`**:
- `name` is `@odh-dashboard/<name>`
- `module-federation.name` is the correct `<camelCase>`
- `module-federation.local.port` matches the allocated frontend port from Phase 1
- `module-federation.proxy[0].path` is `/<name>/api`
- `module-federation.service.name` is `odh-dashboard-<slug>-ui` (the standalone service name for this module)
- `module-federation.service.port` matches the module's production service port. Allocate by scanning `dashboard-operator/internal/controller/modules.go` for existing ports (current range: 8043–8943, increments of ~100). Find the next available port:
  ```bash
  grep 'Port:' dashboard-operator/internal/controller/modules.go | grep -oP '\d{4}' | sort -n
  ```
- Note: The `service` config is used by the operator when generating the federation-config ConfigMap
- If BFF included, add `bffConfig` section:

  ```json
  "bffConfig": {
    "enabled": true,
    "port": 8080,
    "healthEndpoint": "/healthcheck",
    "startCommand": "make dev-bff-e2e-mock"
  }
  ```

- Dependencies include `@odh-dashboard/plugin-core` and `@odh-dashboard/internal`
- `exports` includes `"./extensions": "./frontend/src/odh/extensions.ts"`

**`packages/<name>/frontend/config/moduleFederation.js`**:
- Uses `OdhFederationPlugin` with `name` matching `<camelCase>`
- `isHost: process.env.DEPLOYMENT_MODE === 'standalone'`
- `exposes` includes `'./extensions': './src/odh/extensions'`

**`packages/<name>/frontend/src/odh/extensions.ts`**:
- Contains `app.area` extension with `id` referencing the module's area constant and `featureFlags` referencing the feature flag name
- Contains `app.navigation/section` or `app.navigation/href` stub
- Contains `app.route` stub with a lazy-loaded placeholder component

**`packages/<name>/Makefile`**:
- `PORT` variable matches the allocated frontend port
- `PROXY_PORT` variable matches the allocated BFF port (if applicable)
- Has standard targets: `dev-install-dependencies`, `dev-frontend-federated`, `dev-start-federated`
- If BFF included: has `dev-bff-federated`, `dev-bff-e2e-mock`, `dev-bff-e2e-cluster` targets

**`packages/<name>/tsconfig.json`**, **`jest.config.ts`**, **`.eslintrc.js`**:
- Present and correctly extending shared configs

### Step 3: Create placeholder component (if not generated)

If the installer didn't create a page component, create a minimal placeholder:

```tsx
// packages/<name>/frontend/src/app/pages/OverviewPage.tsx
import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const OverviewPage: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState
      headingLevel="h1"
      icon={CubesIcon}
      titleText="<Title Case>"
      variant={EmptyStateVariant.full}
    >
      <EmptyStateBody>This module is under development.</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default OverviewPage;
```

Ensure the extensions file's route component import points to this file.

## Phase 3: Register in Host

This phase modifies **three files** in the host application. Read each file first to find the correct insertion point.

### 1. Add feature flag type — `frontend/src/k8sTypes.ts`

Read the file and find the `DashboardCommonConfig` type. Add the new flag as an **optional boolean** in the tech-preview section (near the end of the type, where the other optional `?: boolean` flags are):

```typescript
<camelCase>?: boolean;
```

### 2. Add SupportedArea enum — `frontend/src/concepts/areas/types.ts`

Read the file and find the `SupportedArea` enum. Add the new entry under the `/* Plugins */` comment section:

```typescript
PLUGIN_<UPPER_SNAKE> = 'plugin-<kebab>',
```

### 3. Add flag default + state map — `frontend/src/concepts/areas/const.ts`

**a)** Add the flag default to `devTemporaryFeatureFlags`:

```typescript
<camelCase>: false,
```

**b)** Add an entry to `SupportedAreasStateMap` (at the end, before the closing `};`):

```typescript
[SupportedArea.PLUGIN_<UPPER_SNAKE>]: {
  featureFlags: ['<camelCase>'],
},
```

## Phase 4: Dockerfile Verification

1. Check that `packages/<name>/Dockerfile.workspace` exists.
2. Read it and verify:
   - `ARG MODULE_NAME` default matches `<name>`
   - Multi-stage build has Node builder stage (frontend) and, if BFF included, Go builder stage
   - Final stage copies built artifacts correctly
3. If the Dockerfile is missing, copy from `packages/plugin-template/Dockerfile.workspace` and patch the `MODULE_NAME` default.

## Phase 5: Install & Build Verification

Run these sequentially. Stop and fix on first failure before proceeding.

### Step 1: Install workspace

```bash
npm install
```

This wires up the new package in the npm workspace. Must succeed before other steps.

### Step 2: Validate ports

```bash
npm run validate:ports
```

If this fails, a port conflict exists. Fix the conflicting port in `package.json` and re-run.

### Step 3: Type-check

```bash
npm run type-check
```

This verifies:
- The feature flag is correctly typed in `DashboardCommonConfig`
- The `SupportedArea` enum entry is valid
- The `SupportedAreasStateMap` references are correct
- The extensions file compiles

If it fails with a flag name error, the flag was likely not added to `k8sTypes.ts`. Fix and re-run.

### Step 4: BFF compilation (if BFF included)

```bash
cd packages/<name>/bff && go build ./cmd
```

If it fails, run `go mod tidy` first and retry.

### Step 5: Container build

```bash
podman build --file ./packages/<name>/Dockerfile.workspace .
```

If `podman` is not available, try `docker build` instead. This confirms the full build pipeline works end-to-end.

If this step is slow or the user wants to skip it, it can be deferred — the earlier steps already confirm correctness. Ask before running.

## Phase 6: Standalone Deployment Manifests

Create the kustomize package for standalone deployment under `manifests/modules/<name>/`.

> **Note**: Standalone deployment is the primary and recommended deployment topology. Sidecar mode is deprecated and will be removed in a future release.

### Step 1: Check if manifests already exist

```bash
[ -d "manifests/modules/<name>" ] && echo "EXISTS — skipping Phase 6" || echo "CREATING"
```

If the directory already exists, skip this phase entirely.

### Step 2: Create manifest files

Read `manifests/modules/gen-ai/` as a reference template — every file follows the same pattern across all modules. Create `manifests/modules/<name>/` with these 8 files, adapting names, ports, and images:

1. **`deployment.yaml`** — Deployment with 2 replicas. Replace:
   - Container name → `<name>-ui`
   - Container port → the allocated production service port from Phase 1
   - Image placeholder → `quay.io/opendatahub/odh-mod-arch-<name>:latest`
   - ServiceAccount → `odh-dashboard-<name>-ui`
   - All label selectors → `app.kubernetes.io/component: <name>`

2. **`service.yaml`** — Service named `odh-dashboard-<name>-ui` exposing the allocated port.

3. **`service-account.yaml`** — ServiceAccount named `odh-dashboard-<name>-ui`.

4. **`cluster-role.yaml`** — ClusterRole named `odh-dashboard-<name>-ui` with minimal RBAC. Start with the same base permissions as gen-ai (configmaps, secrets read access) — the developer will expand as needed for their module's specific requirements.

5. **`cluster-role-binding.yaml`** — Binds the ClusterRole to the ServiceAccount.

6. **`networkpolicy.yaml`** — NetworkPolicy allowing ingress from the main dashboard pod and egress to Kubernetes API, other BFF services.

7. **`kustomization.yaml`** — Kustomize config with:
   - `resources` listing all YAML files above
   - `configMapGenerator` for params with `env` file reference
   - `generatorOptions.disableNameSuffixHash: true`
   - `replacements` for image injection from the params ConfigMap

8. **`params.env`** — Default image reference:
   ```
   <name>-ui-image=quay.io/opendatahub/odh-mod-arch-<name>:main
   ```

### Step 3: Register in modules kustomization

Add the new module directory to `manifests/modules/kustomization.yaml` in the `resources` list. Read the file first to find the alphabetical insertion point.

## Phase 7: Dashboard-Operator Registration

Register the new module in the dashboard-operator so it can manage the module's lifecycle.

### Step 1: Module registry — `dashboard-operator/internal/controller/modules.go`

Read the file and find the `moduleRegistry` map. Add a new entry matching the existing pattern:

```go
"<camelCase>": {
    Name:                    "<camelCase>",
    ContainerName:           "<name>-ui",
    Port:                    <allocated-production-port>,
    ImageEnvVar:             "RELATED_IMAGE_ODH_MOD_ARCH_<UPPER_SNAKE>_IMAGE",
    RequiredDSCComponents:   []string{<dsc-components-from-phase0>},
    InterModuleDependencies: []string{<dependencies-from-phase0>},
    ManifestSlug:            "<name>",
},
```

If `RequiredDSCComponents` or `InterModuleDependencies` are empty, use `nil` instead of `[]string{}`.

### Step 2: Proxy paths — `dashboard-operator/internal/controller/module_deploy.go`

Read the file and find the `moduleProxyPaths` map. Add an entry:

```go
"<camelCase>": {{Path: "/<name>/api", PathRewrite: "/api"}},
```

If the module has inter-BFF dependencies (calls other BFF services), also add to `interBFFDependencies` in the same file.

### Step 3: Image map — `dashboard-operator/internal/controller/support.go`

Read the file and find the `imagesMap` variable. Add an entry:

```go
"<name>-ui-image": "RELATED_IMAGE_ODH_MOD_ARCH_<UPPER_SNAKE>_IMAGE",
```

### Step 4: Update tests — `dashboard-operator/internal/controller/modules_test.go`

Read the file and update:

1. `TestModuleRegistry` — increment the `assert.Len` count by 1 (e.g., from `8` to `9`)
2. `TestModuleNames` — add `"<camelCase>"` to the expected sorted name list in the correct alphabetical position
3. `TestResolveModuleStatuses` — update `wantLen` values: increment the standard case by 1 and the unknown-module case by 1

### Step 5: Helm chart related images — `dashboard-operator/charts/dashboard/values.yaml`

Read the file and find the `relatedImages:` section. Add an entry for the new module's image env var:

```yaml
RELATED_IMAGE_ODH_MOD_ARCH_<UPPER_SNAKE>_IMAGE: ""
```

Place it alphabetically among the existing `RELATED_IMAGE_ODH_MOD_ARCH_*` entries. The value is empty because the ODH Operator overrides it with digest-pinned references at install time; only non-empty values are injected as pod env vars by the Helm chart template.

## Phase 8: Report

Summarize the completed onboarding:

1. **Files created** — list all new files under `packages/<name>/`
2. **Standalone manifests created** — list files under `manifests/modules/<name>/`
3. **Operator registration** — `modules.go`, `module_deploy.go`, `support.go`, `modules_test.go`, `values.yaml`
4. **Host files modified** — `k8sTypes.ts`, `types.ts`, `const.ts`
5. **Port assignments** — frontend port, BFF port (if applicable), production service port
6. **Build results** — pass/fail for each verification step
7. **Next steps** for the team:
   - Write feature code in `packages/<name>/frontend/src/app/`
   - Add unit tests in `packages/<name>/__tests__/`
   - Add E2E tests in `packages/cypress/cypress/tests/e2e/<name>/`
   - Add contract tests in `packages/<name>/contract-tests/` (if BFF)
   - Start the dev server: `cd packages/<name> && make dev-start-federated`
   - Enable the feature locally: set `<camelCase>: true` in the dashboard config
   - Run `/konflux-onboarding` for CI/CD pipeline setup (Dockerfiles, Konflux component registration, OpenShift CI)
   - **[External]** Add `RELATED_IMAGE_ODH_MOD_ARCH_<UPPER_SNAKE>_IMAGE` to `opendatahub-io/opendatahub-operator` at `internal/controller/modules/dashboard/support.go` (coordinate with Platform team)

> **Note**: Sidecar manifests in `manifests/sidecar/` are deprecated and will be removed. This skill creates standalone manifests only.
