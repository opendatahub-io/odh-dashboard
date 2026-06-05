---
name: module-onboarding
description: Scaffold a new federated module under packages/. Runs mod-arch-installer, allocates ports, registers the feature flag and SupportedArea in the host, verifies the build (type-check, port validation, container image). Pass the module name in kebab-case as the argument.
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
- `module-federation.service.port` is `8043`
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
- `name` matches `<camelCase>`
- `shared` includes all required singletons (see reference.md § Shared Singletons)
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

## Phase 6: Report

Summarize the completed onboarding:

1. **Files created** — list all new files under `packages/<name>/`
2. **Host files modified** — `k8sTypes.ts`, `types.ts`, `const.ts`
3. **Port assignments** — frontend port, BFF port (if applicable)
4. **Build results** — pass/fail for each verification step
5. **Next steps** for the team:
   - Write feature code in `packages/<name>/frontend/src/app/`
   - Add unit tests in `packages/<name>/__tests__/`
   - Add E2E tests in `packages/cypress/cypress/tests/e2e/<name>/`
   - Add contract tests in `packages/<name>/contract-tests/` (if BFF)
   - Start the dev server: `cd packages/<name> && make dev-start-federated`
   - Enable the feature locally: set `<camelCase>: true` in the dashboard config
