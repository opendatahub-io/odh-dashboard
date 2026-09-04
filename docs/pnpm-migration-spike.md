# SPIKE: pnpm Migration Prerequisites

**Jira**: [RHOAIENG-83229](https://redhat.atlassian.net/browse/RHOAIENG-83229)
**Epic**: [RHOAIENG-83227 — Core pnpm migration](https://redhat.atlassian.net/browse/RHOAIENG-83227)
**Author**: Dipanshu Gupta
**Date**: 2026-08-17

---

## Purpose

> **Historical document**: This spike records the pre-migration baseline and planned prerequisites. The migration is now implemented on the repository's pnpm workspace branch; use the current root `README.md`, `docs/dev-setup.md`, and `docs/workspace-dockerfiles.md` for day-to-day instructions.

De-risk the npm-to-pnpm migration before any code changes land. This document covers
each prerequisite task from the spike, provides a go/no-go verdict, and serves as a
reference for the implementation stories (S1–S5).

---

## Table of Contents

- [1. Why pnpm](#1-why-pnpm)
- [2. Current npm Inventory](#2-current-npm-inventory)
- [3. Package Name Uniqueness Audit](#3-package-name-uniqueness-audit)
- [4. Hermetic / Offline Install](#4-hermetic--offline-install)
  - [Konflux / Hermeto (downstream RHOAI)](#konflux--hermeto-downstream-rhoai)
- [5. Security Audit Tooling](#5-security-audit-tooling)
- [6. Dependabot Compatibility](#6-dependabot-compatibility)
- [7. Rollback Procedure](#7-rollback-procedure)
- [8. Reviewed Concerns](#8-reviewed-concerns)
- [9. Alternatives Considered](#9-alternatives-considered)
- [10. Developer Impact](#10-developer-impact)
- [11. Go/No-Go Summary](#11-gono-go-summary)

---

## 1. Why pnpm

The dashboard monorepo has grown to **44 workspace packages**, **36 feature packages**,
and **4 distributions**. npm's flat `node_modules` hoisting model causes real problems
at this scale:

- **Phantom dependencies** — packages can import modules they never declared because npm
  hoists everything to the root. These only break when the package is consumed standalone
  or a transitive dep changes. pnpm's strict symlinked `node_modules` catches these
  immediately.

- **Install speed** — `npm ci` on this repo takes ~2 minutes in CI. Industry benchmarks
  for repos of this size show pnpm cold installs at **5–7x faster** (~18–28s vs ~134s).
  Warm installs (cache hit) drop from ~8s to under 1s.

- **Disk usage** — `node_modules` is 1.5 GB today. pnpm's content-addressable store
  deduplicates across all projects on the machine, typically saving **50–70%** (~500 MB).

- **Lock file churn** — `package-lock.json` is 37,803 lines of JSON. pnpm's YAML lockfile
  is smaller, produces cleaner diffs, and causes fewer merge conflicts.

- **Version catalogs** — pnpm's `catalog:` protocol lets us define shared dependency
  versions once in `pnpm-workspace.yaml` instead of managing them across 44 packages.

- **Workspace protocol** — `workspace:*` makes inter-package references explicit and
  prevents accidentally resolving to a published registry version.

### Recommended version

**pnpm 11** (stable line, currently 11.14.x). pnpm 12 is a Rust rewrite in RC status —
not yet production-ready. pnpm 10 lacks the native release management commands and
`pnpm doctor` diagnostic tool.

The epic uses `shamefully-hoist=true` as a safety net during the initial migration.
Strict isolation (removing `shamefully-hoist`) is deferred to
[RHOAIENG-83228](https://redhat.atlassian.net/browse/RHOAIENG-83228).

In pnpm 11, `.npmrc` is auth/registry only — all other settings go in
`pnpm-workspace.yaml` using camelCase. The `shamefullyHoist` setting is root-level
(affects the entire `node_modules` layout), not per-package:

```yaml
shamefullyHoist: true
autoInstallPeers: true
```

---

## 2. Pre-Migration npm Inventory

| Metric | Value |
|--------|-------|
| npm version (pinned) | 11.8.0 (`packageManager` field) |
| Node.js | v22.23.1 (engines: `>=22.18.0`) |
| Lock file | `package-lock.json` — 37,803 lines, 1.3 MB |
| `node_modules` total size | ~1.5 GB |
| Nested `node_modules` dirs | 201 |
| Total dependency tree | 6,971 packages |
| Root `node_modules` entries | 1,353 |
| Workspace packages | 44 (9 workspace globs resolving to 44 directories) |
| Root `overrides` entries | 25 |
| Dockerfiles using `npm ci` | 28 |
| GitHub workflows using `npm` | 11 |
| Sub-frontend `package-lock.json` files | 9 (these are standalone installs, not npm workspaces) |
| `install:module` scripts (per-package `npm install --prefix frontend`) | 10 packages |
| Makefiles referencing `npm` | 12 |
| `.npmrc` | Single line: `package-lock = true` |

### Tools in use

| Tool | Role | pnpm impact |
|------|------|-------------|
| Turbo 2.9.x | Task runner for lint, type-check, test, build | No change needed — Turbo natively supports pnpm |
| npm-run-all | `run-p` / `run-s` for parallel scripts | Still works with pnpm |
| Husky 9.x + lint-staged | Pre-commit hooks | Still works with pnpm |
| Rspack / Webpack 5 | Bundling | Symlinked `node_modules` is transparent to bundlers |
| Module Federation | Micro-frontend loading | Works with pnpm — resolution is webpack's concern |

### Root scripts that hardcode `npm`

17 root scripts use `npm run --prefix` or `cd && npm run` to call sub-package commands.
These need to change to `pnpm --filter` or `pnpm --prefix`. Examples:

- `build:backend` — `npm run build --prefix backend`
- `dev:backend` — `cd ./backend && npm run start:dev`
- `install:all` — `npm install && npm run install:modules`
- `test:cypress-ci` — `cd ./frontend && npm run test:cypress-ci`

### Sub-frontend install model

10 packages have `install:module` scripts that run `npm install --prefix frontend`.
This is a **separate install tree** — these sub-frontends have their **own
`package-lock.json`** and are not part of the root npm workspace.

Per the epic plan ([RHOAIENG-83230](https://redhat.atlassian.net/browse/RHOAIENG-83230)),
S1 folds all first-party sub-frontends into `pnpm-workspace.yaml`, removes the
`install:module` scripts from all 10 packages, and deletes their lockfiles. This gives
a single lockfile and unified dependency management.

With `shamefullyHoist: true`, phantom deps that worked under npm will continue to work —
pnpm hoists everything to the root, replicating the flat npm layout. Budget 0.5–1 day
for any edge cases where pnpm's hoisting algorithm places a package differently.

### Overrides syntax migration

npm supports nested overrides using object nesting. pnpm uses a flat `>` selector.
There are **4 nested override groups** containing **13 individual entries** that need
syntax translation:

```jsonc
// npm (current) — nested object form
"overrides": {
  "@openshift/dynamic-plugin-sdk-utils": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
    // ... 8 more entries
  }
}

// pnpm (target) — flat with '>' selector, in pnpm-workspace.yaml
overrides:
  "@openshift/dynamic-plugin-sdk-utils>react": "^18.3.1"
  "@openshift/dynamic-plugin-sdk-utils>react-dom": "^18.3.1"
```

The 4 nested groups are:
- `@openshift/dynamic-plugin-sdk-utils` (10 entries)
- `@patternfly/react-topology` (1 entry)
- `@cypress/code-coverage` (1 entry)
- `xmlbuilder2` (1 entry)

The remaining 21 top-level overrides (flat string values) can be copied directly.

---

## 3. Package Name Uniqueness Audit

**Requirement**: pnpm workspace requires every `package.json` to have a globally unique
`name` field. Duplicate names cause install failures.

### Results

**All 44 workspace packages have unique names.** No duplicates found.

The scoped packages (`@odh-dashboard/*`) are all unique by construction:

| Package | Name |
|---------|------|
| packages/gen-ai | `@odh-dashboard/gen-ai` |
| packages/model-registry | `@odh-dashboard/model-registry` |
| packages/plugin-core | `@odh-dashboard/plugin-core` |
| ... (35 total) | all `@odh-dashboard/*` scoped |

### Sub-frontend packages

The sub-frontend `package.json` files (inside `packages/*/frontend/`) use **unscoped
names**. These are unique but inconsistently named:

| Location | Name |
|----------|------|
| packages/agent-ops/frontend | `agent-ops-ui` |
| packages/automl/frontend | `automl-ui` |
| packages/autorag/frontend | `autorag-ui` |
| packages/data-registry/frontend | `data-registry-ui` |
| packages/eval-hub/frontend | `eval-hub-ui` |
| packages/gen-ai/frontend | `gen-ai` |
| packages/maas/frontend | `maas-ui` |
| packages/mlflow/frontend | `mlflow-ui` |
| packages/autox-core/ui | `autox-core-ui` |
| packages/model-serving/cypress | `model-serving-cypress` |
| distributions/core-bff/frontend | `core-bff-ui` |

> **Note**: `gen-ai` is the outlier — it lacks the `-ui` suffix. `model-serving-cypress`
> is the only sub-package already listed as an explicit workspace entry. All names are
> unique, so naming is cosmetic, but worth standardizing during migration.

### Upstream packages

`packages/model-registry/upstream/` and `packages/notebooks/upstream/` have their own
`package-lock.json` files synced from external repos. These are safe — the `packages/*`
workspace glob only matches direct children, so upstream `package.json` files are not
matched. Their lockfiles remain untouched. The `dependabot.yml` exclusion
(`*/upstream/*` in the auto-merge workflow) continues to work since it's a path pattern.

**Verdict: GO** — No blocking issues. All names are unique, upstream packages are safe.

---

## 4. Hermetic / Offline Install

### Background

The `pr-build-validation.yml` workflow runs a **hermetic install test** that simulates
Konflux/Hermeto/Cachi2 offline builds. It works in two stages:

1. Populate npm cache with `npm ci --cache /npm-cache`
2. Test that `npm ci --offline --cache /root/.npm` works without network

### pnpm equivalents

| npm command | pnpm equivalent |
|-------------|-----------------|
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npm ci --offline` | `pnpm install --frozen-lockfile --offline` |
| `npm ci --cache <dir>` | `pnpm install --store-dir <dir>` (pnpm uses a content-addressable store, not a cache) |

### What changes

The hermetic test Dockerfile in `pr-build-validation.yml` needs to use pnpm's
`--store-dir` for cache population and `--offline` for the hermetic test stage.
The key commands are `pnpm install --frozen-lockfile --store-dir /pnpm-store` (populate)
and `pnpm install --frozen-lockfile --offline --store-dir /pnpm-store` (test).
pnpm needs to be installed in the Docker image via `npm install -g pnpm` or by copying
the standalone binary.

### Lockfile validation changes

The current Konflux simulator (`pr-build-validation.yml`) has two npm-specific checks plus
an offline install test:

| Current check | pnpm action |
|---------------|-------------|
| Grep `package-lock.json` for `git+` / `github:` / `file:` in `resolved` URLs | **Keep, adapt** — scan `pnpm-lock.yaml` for non-registry sources (same Hermeto constraint) |
| jq: all packages must have `resolved` | **Remove** — npm-only; pnpm uses `integrity` and fails closed if missing (`ERR_PNPM_MISSING_TARBALL_INTEGRITY` in pnpm 11.4+) |
| Docker offline `npm ci` | **Replace** with `pnpm install --frozen-lockfile --offline` |

### `scripts/check-package-lock.sh` — remove, do not port

Added in [#4820](https://github.com/opendatahub-io/odh-dashboard/pull/4820) because
`npm install` can strip `resolved` URLs from `package-lock.json`, breaking Hermeto offline
installs. pnpm does **not** have this failure mode — lockfile entries use
`resolution.integrity`, and pnpm enforces integrity at read time.

**S3 actions:**

- Delete `scripts/check-package-lock.sh`
- Remove `./scripts/check-package-lock.sh --all` from `test.yml` Setup job
- Rely on `pnpm install --frozen-lockfile` in CI plus the adapted `pr-build-validation.yml`
  offline install test

**Verdict (lockfile validation): GO** — Drop npm `resolved` check; adapt Hermeto protocol
guard and offline install test in S3.

### Konflux / Hermeto (downstream RHOAI)

RHOAI product builds run **hermetic** Konflux pipelines with Hermeto/Cachi2 dependency
prefetch. This is separate from the upstream ODH Konflux setup and is the highest-risk
integration surface for the migration.

#### Where configuration lives

| Location | Hermetic prefetch? | Action on migration |
|----------|-------------------|---------------------|
| Upstream `opendatahub-io/odh-dashboard/.tekton/` (26 files) | **No** — no `hermetic` or `prefetch-input` params | No changes |
| GitHub `pr-build-validation.yml` | Simulates Hermeto offline install | Update for pnpm (S3) |
| Downstream [`red-hat-data-services/konflux-central`](https://github.com/red-hat-data-services/konflux-central) `pipelineruns/odh-dashboard/.tekton/` | **Yes** — source of truth | **Update `prefetch-input`** |
| Downstream [`red-hat-data-services/odh-dashboard`](https://github.com/red-hat-data-services/odh-dashboard) `.tekton/` | Synced copy of konflux-central | Updated via sync |
| Downstream `Dockerfile.konflux.*` (RHOAI repo root) | Uses prefetched deps at build time | `npm ci` → pnpm offline install (S4) |

> **Note**: Per [konflux-central README](https://github.com/red-hat-data-services/konflux-central),
> downstream `.tekton/` files are managed centrally in `konflux-central` and synced to
> the component repo. Prefetch changes land in **konflux-central**, not upstream.

#### Current downstream `prefetch-input` (npm)

All 9 downstream PR pipelines set `hermetic: true` and prefetch npm lockfiles today.
Examples from `konflux-central/pipelineruns/odh-dashboard/.tekton/`:

| Component | Current `prefetch-input` |
|-----------|-------------------------|
| `odh-dashboard` | `[{"type": "npm", "path": "."}]` |
| `odh-mod-arch-gen-ai` | root npm + `packages/gen-ai/frontend` npm + `packages/gen-ai/bff` gomod |
| `odh-core-bff` | root npm + `distributions/core-bff/frontend` npm + bff gomod |
| `odh-mod-arch-automl` / `autorag` | root npm + module frontend npm + bff gomod |
| `odh-mod-arch-agent-ops` | `[{"type": "npm", "path": "."}]` |
| `odh-mod-arch-model-registry` | root npm + **upstream** frontend npm + bff gomod |
| `odh-mod-arch-notebooks` | root npm + **upstream** frontend npm + 2× gomod |
| `odh-dashboard-operator` | gomod only (no JS deps) |

Module pipelines prefetch **up to three** dependency trees: root npm, sub-frontend npm,
and Go modules.

#### Target `prefetch-input` (pnpm, after S1 workspace fold)

After first-party sub-frontends are folded into the root pnpm workspace (S1), simplify
prefetch to a single root pnpm lockfile plus any remaining gomod/upstream npm paths:

| Component | Target `prefetch-input` |
|-----------|------------------------|
| `odh-dashboard` | `[{"type": "pnpm", "path": "."}]` |
| Module with BFF (gen-ai, automl, autorag, …) | `[{"type": "pnpm", "path": "."}, {"type": "gomod", "path": "packages/<mod>/bff"}]` |
| `odh-core-bff` | `[{"type": "pnpm", "path": "."}, {"type": "gomod", "path": "distributions/core-bff/bff"}]` |
| `odh-mod-arch-model-registry` | `[{"type": "pnpm", "path": "."}, {"type": "npm", "path": "packages/model-registry/upstream/frontend"}, {"type": "gomod", "path": "packages/model-registry/upstream/bff"}]` |
| `odh-mod-arch-notebooks` | `[{"type": "pnpm", "path": "."}, {"type": "npm", "path": "packages/notebooks/upstream/workspaces/frontend"}, … gomod paths unchanged]` |

Upstream packages (`model-registry/upstream`, `notebooks/upstream`) **stay on npm**
prefetch — their lockfiles are synced from external repos and are out of scope for S1.

Per [Konflux prefetch docs](https://konflux-ci.dev/docs/building/prefetching-dependencies/),
change the `type` field from `npm` to `pnpm` and point `path` at the directory
containing `pnpm-lock.yaml`.

#### Dockerfile changes (downstream)

Downstream `Dockerfile.konflux.*` files currently run `npm ci`. After migration they
must use offline pnpm install against the Hermeto-prefetched store:

```dockerfile
# Hermeto sets NPM_CONFIG_STORE_DIR when prefetch is enabled
RUN pnpm install --frozen-lockfile --offline
```

Install pnpm in the image before the install step (`npm install -g pnpm@11` or copy the
standalone binary). Upstream `Dockerfile` / `Dockerfile.workspace` files follow the same
pattern (S4 scope in this repo).

#### Hermeto pnpm compatibility (hermeto#1619)

Hermeto had a breaking issue with pnpm ≥ 10.34.2 where lockfile resolution rewrites
were rejected ([hermeto#1619](https://github.com/hermetoproject/hermeto/issues/1619)).
**Fixed** (closed June 2026) — Hermeto now builds a pnpm content-addressable store
instead of rewriting lockfile `resolution` fields.

Before merging, confirm the RHOAI Konflux cluster runs a Hermeto version that includes
this fix. pnpm 11 is safe with current Hermeto.

#### What breaks without Konflux updates

If the upstream pnpm migration merges without coordinated downstream changes:

1. Hermeto **npm** prefetch fails — `package-lock.json` is deleted.
2. `Dockerfile.konflux.*` `npm ci` steps fail in hermetic (network-disabled) builds.
3. Per-sub-frontend npm prefetch paths point at lockfiles removed by S1.

**RHOAI Konflux builds break on the next downstream sync.**

#### Implementation plan

| Step | Owner | Repo | Story |
|------|-------|------|-------|
| 1. Migrate lockfile + workspace (enables single-root prefetch) | Dashboard team | upstream `odh-dashboard` | S1 |
| 2. Update `pr-build-validation.yml` hermetic simulator | Dashboard team | upstream `odh-dashboard` | S3 |
| 3. Update upstream Dockerfiles (`npm ci` → pnpm) | Dashboard team | upstream `odh-dashboard` | S4 |
| 4. Update `prefetch-input` npm → pnpm in all 9 PR pipelines | Dashboard team + DevOps | `red-hat-data-services/konflux-central` | **S4 (coordinated)** |
| 5. Update `Dockerfile.konflux.*` for offline pnpm install | Dashboard team | `red-hat-data-services/odh-dashboard` | **S4 (coordinated)** |
| 6. Verify `prefetch-dependencies` task passes on a test PR | Dashboard team | RHOAI Konflux | Before merge to downstream main |

Steps 4–6 must land **with or immediately after** the upstream migration reaches the
downstream branch. Coordinate with DevOps if konflux-central PR review is required.

**Verdict: GO** — Konflux supports pnpm natively. Work is mechanical but **mandatory for
RHOAI** and spans two downstream repos plus upstream Dockerfiles. Not optional.

---

## 5. Security Audit Tooling

### `npm audit` vs `pnpm audit` JSON format

This is the highest-risk item in the spike. The repo has custom audit infrastructure
that parses `npm audit --json` output:

| Script | Purpose |
|--------|---------|
| `scripts/security-audit/summarize-npm-audit.sh` | Parses npm audit JSON into compact findings |
| `dependency-validation.yml` | Per-PR audit that compares head vs base advisories |
| `weekly-security-audit.yml` | Weekly scheduled audit that upserts a GitHub Issue |

### The problem: incompatible JSON shapes

npm audit v2 output uses a `vulnerabilities` object keyed by package name, with fields
like `fixAvailable`, `isDirect`, `severity`, and `via[]` (which can contain both objects
and strings).

pnpm audit v11 output uses a completely different structure — an `advisories` object keyed
by advisory ID, with fields like `module_name`, `findings[]`, `github_advisory_id`, and
`vulnerable_versions`. It dropped the `cves` field entirely in favor of `github_advisory_id`.

**They are not interchangeable.** The `summarize-npm-audit.sh` script's `jq` queries
(`.vulnerabilities`, `.fixAvailable`, `.isDirect`, `.via[]`) will produce empty results
against pnpm audit output.

### Migration plan for audit scripts

**Option A (recommended): Rewrite the summarize script for pnpm audit format.**

The `summarize-npm-audit.sh` jq expression needs to be adapted to:

```bash
# pnpm audit shape: .advisories.<id>.{module_name, severity, findings[], ...}
# vs npm shape: .vulnerabilities.<name>.{severity, fixAvailable, isDirect, via[]}
```

This is a contained change — one script rewrite plus updating the two workflows that
call it.

**Option B: Normalize pnpm audit output to npm format.**

Run `pnpm audit --json` and pipe through a transformer that maps the pnpm shape to the
npm shape the existing scripts expect. More fragile, but avoids rewriting the downstream
consumer (the report renderer).

### `dependency-validation.yml` changes

This workflow triggers on `**/package-lock.json` path changes. With pnpm:

- Trigger path changes to `pnpm-lock.yaml` (single file at root, not per-package)
- Replace `npm audit --package-lock-only` with `pnpm audit`
- The jq query extracting advisory IDs needs to use `.advisories` instead of
  `.vulnerabilities`

### `weekly-security-audit.yml` changes

- Replace `npm audit` calls with `pnpm audit`
- Update `summarize-npm-audit.sh` (or rename to `summarize-pnpm-audit.sh`)
- The `render-security-audit-report.js` renderer consumes the summarized JSON, not raw
  audit output — so if the summary format stays the same, the renderer needs no changes
- The `discover-dependabot-dirs.sh` script that discovers npm directories from
  `dependabot.yml` may need updating since pnpm uses a single root lockfile

### `dependabot-auto-merge.yml` changes

This workflow finds and validates `package-lock.json` files before auto-merging
Dependabot PRs. It needs to:

- Replace `find . -name package-lock.json` with `pnpm-lock.yaml` (single root file)
- Update the `npm_and_yarn` ecosystem check logic
- Adjust the auto-merge commit validation step

### `cypress-e2e-test.yml` changes

Uses `cache: 'npm'` in `actions/setup-node` and runs `npm run prepare:e2e`. Needs:

- Change cache strategy to pnpm store
- Replace `npm run` with `pnpm run`

### Full list of affected workflows (11 total)

| Workflow | Impact |
|----------|--------|
| `test.yml` | `npm install`, `npm run`, cache keys; **remove** `check-package-lock.sh` step |
| `pr-build-validation.yml` | Hermetic install, lockfile validation, `package-lock.json` triggers |
| `dependency-validation.yml` | `npm audit`, `package-lock.json` triggers |
| `weekly-security-audit.yml` | `npm audit`, summarize scripts |
| `dependabot-auto-merge.yml` | `package-lock.json` find/validate |
| `cypress-e2e-test.yml` | `cache: 'npm'`, `npm run` commands |
| `core-bff-build.yml` | `npm install --ignore-scripts`, cache keys |
| `gen-ai-frontend-build.yml` | Cache keys referencing `package-lock.json` |
| `eval-hub-frontend-tests.yml` | Cache keys referencing `package-lock.json` |
| `model-registry-frontend-tests.yml` | Cache keys referencing `package-lock.json` |
| `claude-preflight.yml` | npm-related setup |

### CI pnpm setup approach

Christian's review: adopt pnpm's **store caching** in the same S3 change — do not keep the
manual per-`node_modules` caches in `module-caches/action.yml`.

#### Current state (suboptimal)

`.github/actions/module-caches/action.yml` (196 lines) maintains **12+ separate
`node_modules` caches** — root workspace, Cypress binary, and one cache per federated
module frontend. `test.yml` alone invokes it **8 times** across jobs; `cypress-e2e-test.yml`
twice; plus `gen-ai-frontend-build.yml`, `eval-hub-frontend-tests.yml`, and
`model-registry-frontend-tests.yml`.

Problems with this model on pnpm:

- Caches physical `node_modules` trees, which pnpm links from a content-addressable store
- Keys tied to per-package `package-lock.json` files that S1 removes
- Duplicates work — each cache miss runs a full install anyway
- Does not benefit from pnpm's store deduplication across jobs

#### Target state (S3)

**Delete** `module-caches/action.yml` and replace every caller with a standard two-step setup
that caches the **pnpm store**, not `node_modules`:

**Option A (recommended):** [`pnpm/action-setup@v4`](https://pnpm.io/continuous-integration)

```yaml
- uses: pnpm/action-setup@v4
  # version read from packageManager in package.json
- run: pnpm install --frozen-lockfile
```

`pnpm/action-setup` installs pnpm as a native binary and **caches the pnpm store**
automatically.

**Option B:** `actions/setup-node@v4` with built-in pnpm store cache:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
```

Either option is acceptable; pick one pattern and use it consistently across all 11 workflows.
Do **not** mix store caching with leftover `node_modules` cache paths.

#### S3 checklist (caching)

| Action | Detail |
|--------|--------|
| Delete | `.github/actions/module-caches/action.yml` |
| Update callers | `test.yml` (8 refs), `cypress-e2e-test.yml` (2), `gen-ai-frontend-build.yml`, `eval-hub-frontend-tests.yml`, `model-registry-frontend-tests.yml` |
| Remove | All `actions/cache` paths targeting `node_modules` or per-module lockfile keys |
| Keep | Cypress binary cache only if not covered by pnpm store — evaluate during S3; likely unnecessary |
| Cache key | `pnpm-lock.yaml` hash (single root file after S1) |

**Verdict: GO** — Replace `module-caches` with pnpm store caching in the same S3 PR as the
pnpm switch. Do not land `pnpm install` while still restoring `node_modules` caches.

**Verdict (audit tooling): GO with caution** — The audit summarize script needs a deliberate
rewrite, not a find-and-replace. Allocate as part of S3. Scoped: one shell script + two
workflow files (`dependency-validation.yml`, `weekly-security-audit.yml`).

---

## 6. Dependabot Compatibility

### Current setup

`dependabot.yml` configures `package-ecosystem: npm` with 9 directories (root + 8
sub-frontends). It also has `gomod` entries for BFF directories.

### pnpm support status

Dependabot uses the `npm` ecosystem identifier for both npm and pnpm — it auto-detects
which package manager is in use by looking for `pnpm-lock.yaml` vs `package-lock.json`.

**Key findings from Dependabot issue tracking:**

1. **pnpm 11 support is in beta** ([dependabot-core#14794](https://github.com/dependabot/dependabot-core/issues/14794)).
   Beta support was merged in PR #15710, bumping bundled pnpm to 11.17.0.

2. **Multi-document lockfile** — pnpm 11 generates a two-document YAML lockfile (env
   lockfile + project lockfile). Dependabot initially couldn't parse this
   ([dependabot-core#14919](https://github.com/dependabot/dependabot-core/issues/14919)),
   but this has been fixed in the beta.

3. **Monorepo directory configuration** — For pnpm workspaces, Dependabot should target
   the **root directory only** (where `pnpm-lock.yaml` lives). It crawls workspace
   `package.json` files automatically
   ([dependabot-core#10758](https://github.com/dependabot/dependabot-core/issues/10758)).

4. **Catalog support** — There is an open concern about `catalog:` protocol in
   `pnpm-workspace.yaml`. Dependabot may produce PRs where only the lockfile changes
   but the manifest still uses `catalog:` specifiers, causing `pnpm install
   --frozen-lockfile` failures. This is unresolved as of August 2026.

### Required `dependabot.yml` changes

```yaml
# Before: 9 separate npm directory entries
- package-ecosystem: npm
  directories:
    - /
    - /distributions/core-bff/frontend
    - /packages/agent-ops/frontend
    # ... 6 more sub-frontends

# After: single root entry (pnpm crawls workspaces automatically)
- package-ecosystem: npm
  directories:
    - /
```

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Dependabot pnpm 11 beta produces broken PRs | Medium | Monitor first 2 weeks, use `ok-to-skip-audit` label as escape hatch |
| `catalog:` specifier PRs fail CI | Medium | Defer catalogs to post-migration; use direct version specifiers initially |
| Sub-frontend lock files disappear | Low | pnpm uses a single root lockfile — this is expected behavior |

### Verification plan

Create a test branch with pnpm configured, push it, and observe whether Dependabot:
1. Detects `pnpm-lock.yaml` correctly
2. Produces PRs that pass `pnpm install --frozen-lockfile`
3. Handles the multi-document lockfile format

**Verdict: GO with monitoring** — Dependabot supports pnpm through the `npm` ecosystem.
pnpm 11 support is in beta but functional. Skip `catalog:` protocol initially.

---

## 7. Rollback Procedure

If the migration needs to be reverted after merging, follow these steps:

### Immediate rollback (revert PR)

```bash
# 1. Revert the migration PR
git revert --no-commit <merge-commit-sha>

# 2. Restore package-lock.json from the commit before migration
git checkout <pre-migration-sha> -- package-lock.json

# 3. Remove pnpm artifacts
rm -f pnpm-lock.yaml pnpm-workspace.yaml
rm -rf node_modules

# 4. Restore .npmrc if it was modified
git checkout <pre-migration-sha> -- .npmrc

# 5. Restore packageManager field
# In package.json, change "pnpm@11.x.x" back to "npm@11.8.0"

# 6. Restore workspace:* references back to "*" in all package.json files
# (This is the most tedious part — use the migration script in reverse)

# 7. Verify
npm install
npm run build
npm run test

# 8. Commit and push
git add -A
git commit -m "Revert: rollback pnpm migration"
```

### CI/CD rollback

| Component | What to revert |
|-----------|---------------|
| `.github/actions/module-caches/action.yml` | Restore `npm install` commands and `package-lock.json` cache keys |
| `.github/workflows/test.yml` | Restore npm commands |
| `.github/workflows/dependency-validation.yml` | Restore `package-lock.json` triggers and `npm audit` |
| `.github/workflows/weekly-security-audit.yml` | Restore `npm audit` calls |
| `.github/workflows/pr-build-validation.yml` | Restore hermetic npm test and `package-lock.json` references |
| 8 other workflows | Restore npm cache keys, `npm run` commands |
| 28 Dockerfiles | Restore `npm ci` commands |
| Downstream `konflux-central` prefetch-input | Restore `"type": "npm"` in all 9 PR pipelines |
| Downstream `Dockerfile.konflux.*` | Restore `npm ci` commands |
| `dependabot.yml` | Restore multi-directory npm configuration |
| 10 `install:module` scripts | Restore `npm install --prefix frontend` |

### Rollback timeline

The migration is designed as 2–3 PRs:

| PR | Content | Rollback complexity |
|----|---------|---------------------|
| PR1 (S1+S2+S3) | Foundation + dev commands + CI | Medium — single revert commit |
| PR2 (S4) | Dockerfiles + downstream Konflux (`konflux-central`, `Dockerfile.konflux.*`) | Low — mechanical `pnpm` → `npm` |
| PR3 (S5) | Docs + validation gate | Trivial — no code changes |

If PR1 is merged but problems appear, a single `git revert` of that merge commit
restores the previous state. The `package-lock.json` from before migration should be
preserved in git history.

### Key point: `package-lock.json` is deleted in S1 (PR1)

Per the epic plan ([RHOAIENG-83230](https://redhat.atlassian.net/browse/RHOAIENG-83230)),
`package-lock.json` is deleted in S1 alongside the pnpm-lock.yaml generation. This is
the right call — keeping both creates a confusing hybrid state where someone could
accidentally run `npm install` and regenerate the npm lockfile. Rollback is still safe
because `git revert` restores `package-lock.json` from history.

**Verdict: GO** — Rollback is straightforward because the migration is structured as
incremental PRs and `git revert` restores npm artifacts from history.

---

## 8. Reviewed Concerns

### Sparse checkout impact

**Concern** (Christian, comment #2): Do module teams use sparse checkout? Will folding
sub-frontends into the workspace break their workflow?

**Finding**: Sparse checkout is used in **2 CI workflows only** — `validate-kustomize.yml`
(3 uses) and `dependabot-auto-merge.yml` (1 use). Both sparse-checkout manifests reference
operator/distribution paths, **not** module frontend paths. No evidence of local sparse
checkout usage by module teams.

pnpm workspace membership does not conflict with sparse checkout — a developer can sparse-
clone `packages/gen-ai/` and run `pnpm install --filter @odh-dashboard/gen-ai` without
checking out the full tree. The root `pnpm-lock.yaml` and `pnpm-workspace.yaml` must be
present (they are tiny files and always included in sparse checkout via git's default
top-level inclusion).

**Verdict: Not a blocker.** Document the `--filter` workflow for module teams in S5 docs.

### Why not do npm workspace fold first, then pnpm?

**Concern** (Christian, comment #3): Worth fixing the sub-frontend install model and CI
caching with npm first, so you're not debugging two things at once?

**Analysis**: A separate "fold sub-frontends into npm workspace" PR would:

1. Require regenerating `package-lock.json` (39k lines of churn)
2. Require updating `module-caches/action.yml` cache keys
3. Then the pnpm PR would **delete** that lockfile and the cache action entirely

This means **two rounds of lockfile churn** and **two rounds of CI rework** for the same
outcome. The workspace fold and pnpm switch share the same atomic commit because:

- `pnpm-workspace.yaml` replaces the npm `workspaces` field
- `pnpm-lock.yaml` replaces `package-lock.json`
- `install:module` removal only works once the pnpm workspace covers those packages

**Decision: Fold + pnpm together in PR1 (current plan).** The risk of "debugging two things
at once" is mitigated by `shamefullyHoist: true` which replicates npm's flat layout — so
workspace membership issues surface without also fighting strict isolation.

---

## 9. Alternatives Considered

| Alternative | Why not |
|-------------|---------|
| **Yarn Berry 4.x** | PnP breaks webpack/rspack/Module Federation (assumes `node_modules` exists). Its `nodeLinker: pnpm` mode is just pnpm with extra config. No version catalogs. Declining adoption (~8M vs pnpm's ~10M weekly downloads). |
| **Bun 1.3.x** | Fastest installs (3–5x over pnpm) but uses JavaScriptCore, not V8. No support in RHEL UBI base images. `@kubernetes/client-node` may not work. Only ~4M weekly downloads. We need a better package manager, not a new runtime. |
| **Nx** | Build system / task runner (competes with Turbo), not a package manager. Orthogonal concern. |

---

## 10. Developer Impact

### First-time setup after migration

Install pnpm once (pick any method):

```bash
brew install pnpm            # macOS (Homebrew)
# or
npm install -g pnpm          # any OS with Node.js 22+
# or
npx get-pnpm                 # installs standalone executable, no global npm needed
```

Then in the repo:

```bash
pnpm install                 # reads version from packageManager field
pnpm dev                     # same dev server, same ports
```

> **Note on Corepack**: Node.js 22–24 ship Corepack, but it's experimental and
> [removed from Node.js 25+](https://github.com/nodejs/node/pull/61207). We don't
> rely on it. Developers install pnpm directly. The `packageManager` field in
> `package.json` enforces the correct version — pnpm errors if the running version
> doesn't match.

Existing clones: delete `node_modules`, install pnpm, then run `pnpm install`.

### Command mapping

| Task | npm (before) | pnpm (after) |
|------|-------------|--------------|
| Install deps | `npm install` | `pnpm install` |
| Dev server | `npm run dev` | `pnpm dev` |
| Build | `npm run build` | `pnpm build` |
| Tests | `npm run test` | `pnpm test` |
| Lint | `npm run lint` | `pnpm lint` |
| Type check | `npm run type-check` | `pnpm type-check` |
| Add a dep | `npm install lodash` | `pnpm add lodash` |
| Add a dev dep | `npm install -D jest` | `pnpm add -D jest` |
| Remove a dep | `npm uninstall lodash` | `pnpm remove lodash` |
| Run installed binary | `pnpm exec eslint .` | `pnpm exec eslint .` |
| Run remote binary | `npx create-react-app` | `pnpm dlx create-react-app` |
| CI install | `npm ci` | `pnpm install --frozen-lockfile` |
| Run in a package | `npm run build --prefix frontend` | `pnpm --filter frontend build` |

> **Shorthand**: `pnpm dev` is equivalent to `pnpm run dev`. The `run` keyword is
> optional for scripts that don't shadow a built-in pnpm command.

### What stays the same

- Dev server behavior, ports, hot reload — identical
- Build output (webpack/rspack bundles) — identical
- All Turbo-powered commands (`lint`, `type-check`, `test-unit`) — Turbo works natively with pnpm
- Git hooks (Husky + lint-staged) — still runs on commit
- IDE setup (VS Code, TypeScript, ESLint, Prettier) — no config changes
- Go BFF code — unaffected by package manager
- Makefiles — updated internally (S2 scope) but same `make` targets for developers

### Gotchas

- **`pnpm add`, not `pnpm install <pkg>`** — `pnpm install` (no args) installs from
  lockfile. To add a new dep, use `pnpm add <pkg>`.
- **Single lockfile** — All workspace packages share one root `pnpm-lock.yaml`. No
  more per-package `package-lock.json` files.
- **`node_modules` uses symlinks** — `ls node_modules` shows symlinks into `.pnpm/`.
  This is normal. All tooling resolves through symlinks transparently.
- **`workspace:*` in package.json** — Internal deps show `"workspace:*"` instead of
  `"*"`. This means "use the local workspace copy."

### Migrating in-flight branches

```bash
git pull origin main
rm -rf node_modules
pnpm install                  # install pnpm first if you haven't already
```

If a branch has merge conflicts in `package-lock.json`, delete the file — it no longer
exists on main. Resolve `package.json` conflicts normally, then run `pnpm install` to
update `pnpm-lock.yaml`.

---

## 11. Go/No-Go Summary

| Task | Verdict | Notes |
|------|---------|-------|
| Package name uniqueness | **GO** | All 44 workspace packages have unique names |
| Hermetic / offline install | **GO** | pnpm's `--frozen-lockfile --offline --store-dir` is equivalent |
| Konflux / Hermeto (downstream) | **GO** (coordinate) | Update `prefetch-input` in konflux-central + `Dockerfile.konflux.*` with S4 |
| Security audit tooling | **GO** (caution) | `summarize-npm-audit.sh` needs rewrite for pnpm audit JSON shape |
| Dependabot | **GO** (monitor) | Beta pnpm 11 support is functional; skip `catalog:` initially |
| Rollback | **GO** | Incremental PR strategy makes revert straightforward |

### Overall verdict: **GO**

No blocking issues found. The migration can proceed with the following conditions:

1. Rewrite the audit summarize script **before** or **as part of** S3 (CI migration)
2. Coordinate downstream Konflux changes (`konflux-central` prefetch-input +
   `Dockerfile.konflux.*`) with S4 — **required for RHOAI builds**
3. Monitor Dependabot behavior on the migration branch for 1–2 weeks
4. Use pnpm 11 (not 10) — pnpm 10's audit endpoint is dead (HTTP 410)
5. Defer `catalog:` protocol adoption until Dependabot support stabilizes
6. Confirm RHOAI Konflux cluster Hermeto version includes the hermeto#1619 fix
