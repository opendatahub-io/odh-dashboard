# Microfrontend upstream/downstream sync

**Session ID:** ses_026fae583ffeugm3lRsiczFTTp
**Created:** 8/6/2026, 5:40:18 PM
**Updated:** 8/6/2026, 5:55:10 PM

---

## User

what are some possible architectural decisions for a situation where we have our midstream that has a micro frontend with bff. We also are actively developing in the upstream with possibly different requirements and diferet priorities, but we have most control for now. what are the different ways that upstream can be synced with downstream. Give examples that are industry practiced. Some possible examples already thought of are just syncing files. We will have a node/react frontend and a go bff. 

---

## Assistant (Plan · Claude Sonnet 5 · 4.0s)

_Thinking:_



**Tool: bash**

**Input:**
```json
{
  "command": "cat /Users/derxu/Documents/code/odh-dashboard/.claude/rules/architecture.md 2>/dev/null | head -150"
}
```

**Output:**
```
---
description: ODH Dashboard monorepo architecture, package boundaries, BFF structure, operator controller, and distributions
globs: "packages/**,frontend/**,backend/**,dashboard-operator/**,distributions/**"
alwaysApply: false
paths:
  - "packages/**"
  - "frontend/**"
  - "backend/**"
  - "dashboard-operator/**"
  - "distributions/**"
---

# ODH Dashboard Architecture

## Monorepo Structure

ODH Dashboard is a monorepo managed with npm workspaces and Turbo. It provides the web UI for Red Hat OpenShift AI (RHOAI) and Open Data Hub (ODH).

### Main Applications

- `frontend/` — Main React 18 dashboard application (PatternFly v6, Webpack, Module Federation host)
- `backend/` — Fastify server with Kubernetes client integration, proxying requests to OpenShift APIs

### Feature Plugin Packages (`packages/`)

Feature packages provide extensions and are discovered by `discoverPluginPackages.js`. They fall into two categories based on how they are built and loaded:

#### Module Federation Remotes

These packages have a `module-federation` config in `package.json`, their own webpack build under `frontend/config/`, and produce a `remoteEntry.js` that is loaded dynamically at runtime:

- `automl` — AutoML features (has Go BFF)
- `autorag` — AutoRAG features (has Go BFF)
- `eval-hub` — Evaluation Hub (has Go BFF)
- `gen-ai` — Gen AI / LLM features (has Go BFF)
- `maas` — Model-as-a-Service (has Go BFF)
- `mlflow` — MLflow integration (has Go BFF)
- `mlflow-embedded` — Embedded MLflow integration
- `model-registry` — Model Registry UI (has Go BFF)
- `notebooks` — Notebooks management
- `observability` — Observability features

#### Bundled Plugin Packages

These packages export extensions but have **no** `module-federation` config. They are compiled directly into the host bundle at build time — no separate webpack build, no `remoteEntry.js`, no standalone dev server:

- `feature-store` — Feature Store (read-only Feast UI; no BFF, proxies through main dashboard backend)
- `kserve` — KServe integration
- `llmd-serving` — LLM serving
- `model-serving` — Model Serving UI
- `model-training` — Model training UI
- `nim-serving` — NIM serving

#### Plugin Infrastructure

- `plugin-core` — Core plugin utilities shared across plugins
- `plugin-template` — Scaffold for new plugins

### Infrastructure Packages

- `eslint-config` — Centralized ESLint configuration (base, typescript, react, node, markdown, yaml, prettier)
- `eslint-plugin` — Custom ESLint rules for the project
- `jest-config` — Shared Jest test configuration and custom matchers
- `tsconfig` — Shared TypeScript configuration
- `app-config` — Shared application configuration and utilities
- `contract-tests` — Central contract testing framework for BFF validation

### Testing Package

- `cypress` — Shared Cypress E2E and mock test framework, page objects, and utilities

## Package Boundaries (Critical)

- Feature packages MUST NOT import directly from other feature packages' internal modules.
- Feature packages MUST use exported APIs from `plugin-core` or `app-config` for shared functionality.
- Changes to infrastructure packages (`eslint-config`, `jest-config`, `tsconfig`) affect ALL packages — review with extra care.

## Dashboard Module Controller (`dashboard-operator/`)

A standalone Kubernetes operator that manages the full lifecycle of the Dashboard application. Co-located in the monorepo (not a separate repository) because the controller is tightly coupled to Dashboard frontend/backend versions and manifest layouts.

- **Language**: Go 1.25+ with controller-runtime v0.23
- **CRD**: `Dashboard` (cluster-scoped, singleton `default-dashboard`) in group `dashboard.opendatahub.io`
- **Key dependencies**: `odh-platform-utilities` (Tier 1 packages for manifest rendering, SSA deployment, platform detection, status conditions)
- **CI**: `.github/workflows/dashboard-operator-tests.yml` — lint, build, test on `dashboard-operator/**` changes
- **Container**: `quay.io/opendatahub/dashboard-operator:latest` built from `dashboard-operator/Dockerfile`

The controller is **not** part of the npm workspace or Turbo pipeline. It has its own `go.mod`, `Makefile`, and CI workflow. See `dashboard-operator/AGENTS.md` and `.claude/rules/operator-controller.md` for detailed conventions.

## Distributions (`distributions/`)

Independently-deployable dashboard variants. All three are **npm workspace members** and participate in the **Turbo pipeline** — Turbo-based root commands (`lint`, `type-check`, `test:contract`) run on distributions that define matching scripts. Some root convenience scripts (`build`, `test`, `dev`) are hardcoded to `frontend/` and `backend/` and do not cover distributions.

| Directory | Description | Has BFF? | Build System |
|-----------|-------------|----------|--------------|
| `base/` | Shared app shell library (PatternFly chrome, error boundary, extensibility hooks) — **not deployed on its own** | Stub only | Webpack |
| `core-bff/` | Full Go BFF + React frontend for sidecar/xKC deployments | Yes (Go 1.25+) | Make + Webpack |
| `rhaii/` | RHAII-specific distribution | No | Webpack |

- `base/` is a shared library/framework (not independently deployed) — it provides the app shell (masthead, sidebar, error boundary, theme context) that `core-bff/` and `rhaii/` extend
- `rhaii/` is frontend-only — React + Webpack + Module Federation host configuration
- `core-bff/` has both a Go BFF (`bff/`) and React frontend (`frontend/`) with its own contract tests (`contract-tests/`)
- Each distribution has its own `package.json`, `tsconfig.json`, and webpack config; dependencies on internal packages resolve through the workspace
- `core-bff/` follows contract-first development (OpenAPI → BFF stub → Frontend → Production BFF)

See `distributions/core-bff/AGENTS.md` for the most detailed reference. See `.claude/rules/distributions.md` for distribution-specific conventions and `.claude/rules/bff-go.md` for Go BFF conventions (applies to core-bff BFF code).

## BFF (Backend-for-Frontend) Architecture

Several packages have a Go-based BFF service: `automl`, `autorag`, `eval-hub`, `gen-ai`, `maas`, `mlflow`, `model-registry`. The `distributions/core-bff` module also has a Go BFF.
- Located in `bff/` within the package
- Check each package's `bff/go.mod` for its required Go toolchain version
- Exposes REST APIs consumed by the package's frontend
- Must expose a `/healthcheck` endpoint
- Has its own OpenAPI specification in `api/` or `bff/openapi/`

```

**Tool: bash**

**Input:**
```json
{
  "command": "cat /Users/derxu/Documents/code/odh-dashboard/.claude/skills/upstream-sync/SKILL.md 2>/dev/null | head -100"
}
```

**Output:**
```
---
name: upstream-sync
description: Sync upstream changes for a package and open a PR. Pass a package name as the first argument (e.g. model-registry or notebooks) or be prompted to choose. Optionally pass a PR URL to do a temporary test sync.
---

# Upstream Sync

Sync upstream changes for a package and open a PR.

This command orchestrates the entire sync process: branch creation, running the update-subtree script, resolving conflicts, running tests, and opening a PR.

## Arguments

- `$ARGUMENTS` — Optional. Can be:
  - A package name (e.g. `model-registry`, `notebooks`) — runs a normal sync for that package
  - A package name followed by a PR URL (e.g. `model-registry https://github.com/kubeflow/model-registry/pull/1234`) — runs a PR test sync
  - A PR URL alone (e.g. `https://github.com/kubeflow/model-registry/pull/1234`) — infers the package from the URL's repo
  - Empty — prompts the user to choose a package

## Resolving the Package

Packages with upstream subtrees have a `subtree` field in their `package.json` under `packages/<name>/package.json`.

1. If the user provided a package name argument, use it directly as `<package-name>`.
2. If the user provided only a PR URL, infer the package by matching the URL's GitHub owner/repo against the `subtree.repo` field in each package's `package.json`.
3. If no argument was provided, discover all packages with a `subtree` config:
   ```bash
   grep -rl '"subtree"' packages/*/package.json | sed 's|packages/||;s|/package.json||'
   ```
   Present the list to the user and ask which package to sync.

Once the package is identified, read `packages/<package-name>/package.json` to get the `subtree` config. Extract the upstream GitHub `<owner>/<repo>` from the `subtree.repo` URL.

## PR Test Mode

If the user passes a PR URL as an argument (e.g. `/upstream-sync model-registry https://github.com/kubeflow/model-registry/pull/1234`), this is a **temporary test sync** to validate an upstream PR's changes in odh-dashboard before the upstream PR merges. The differences from a normal sync are noted inline below with **[PR Test Mode]** markers.

## Workflow

### Phase 1: Setup

First, check the current branch state:

1. Run `git branch --show-current` to get the current branch name
2. Run `git status` to check for uncommitted changes or unresolved conflicts

**If on a `<pkg>-sync-*` or `tmp-sync-pr-*` branch:**
- Continue with the existing branch (supports resuming a sync in progress)
- If there are unresolved conflicts (files in "Unmerged paths"), proceed to Phase 3
- If there are staged changes ready to continue, proceed to Phase 2 with `--continue`

**If on `main`:**
- Ensure working directory is clean (no uncommitted changes)
- Run `git pull` to ensure main is up to date before starting the sync
- **[PR Test Mode]** Generate branch name: `tmp-sync-pr-<number>` (extract the PR number from the URL)
- **[Normal Mode]** Generate branch name: `<pkg>-sync-YYYY-MM-DD` (use today's date; `<pkg>` is a short prefix like `mr` for model-registry, `nb` for notebooks, etc.)
- Check if this branch already exists with `git branch --list <branch-name>`
  - If it exists, ask user if they want to create `<branch-name>-2` (or find next available suffix)
- Create and switch to the branch: `git checkout -b <branch-name>`

**If on any other branch:**
- Ask user if they want to switch to main and start a fresh sync, or abort

### Phase 2: Run Sync Script

Run the update-subtree script from the `packages/<package-name>` directory:

```bash
cd packages/<package-name> && npm run update-subtree
```

**[PR Test Mode]** Pass the `--pr` flag with the PR URL:
```bash
cd packages/<package-name> && npm run update-subtree -- --pr=<pr-url>
```

Or if continuing after conflict resolution:
```bash
cd packages/<package-name> && npm run update-subtree -- --continue
```

Parse the output to detect:
- **Success messages** like "Applied commit X/Y: ..."
- **Conflict detection**: Look for "Conflict detected" in output
- **Completion**: Look for "Already up-to-date" or successful completion of all commits
- **Upstream commit SHA**: The commit hash being synced to (appears in output and commit messages)

### Phase 3: Conflict Resolution

When conflicts are detected:

1. **Identify conflicting files**: Run `git status` and look for files under "Unmerged paths"

2. **Record conflict info** for later use in PR description:
   - The PR number and title (from the script's output message, e.g., "Commit message: Add tensor type filter (#2135)")
   - The specific file paths that have conflicts
   - The nature of the conflict (what caused it - e.g., import path conventions differ between upstream and downstream, overlapping changes to the same code section, etc.)
   - How the conflict was resolved (e.g., kept both features, maintained downstream conventions while incorporating upstream changes, etc.)

3. **For each conflicting file**:

```

---

## Assistant (Plan · Claude Sonnet 5 · 95.5s)

_Thinking:_



## Context I found

This repo already practices one of these patterns: `packages/model-registry`, `packages/notebooks`, `packages/mlflow` etc. sync from their upstream OSS projects via **git subtree** (see `.claude/skills/upstream-sync/SKILL.md` — a scripted `update-subtree` + conflict-resolution + PR flow). So you already have a working baseline for "source-level sync." Question is whether that's still right for your case, or whether a BFF+micro-frontend pair needs something more decoupled.

Here are the architectural options, grouped by how tightly midstream stays coupled to upstream source.

## 1. Source-level sync (you keep patching upstream code directly)

| Pattern | How it works | Industry example | Fits when |
|---|---|---|---|
| **Git subtree** (what you already use) | Upstream commits replayed into a subdir; conflicts resolved inline; full history embedded | This repo's `update-subtree` script | Midstream actively modifies upstream source, wants full history, no separate remote clone needed |
| **Git submodule** | Pointer to exact upstream commit/tag; no history rewrite | Common in C/C++ ecosystems | Midstream rarely patches vendored code — mostly consumes as-is |
| **Vendor + patch stack** | Pull pinned upstream tarball/commit into `vendor/`, apply a tracked stack of `.patch` files on top each time you bump | Chromium `DEPS` + patches, Debian `quilt`, OpenShift's k8s fork rebase cadence | You want the *midstream deltas* to be explicit/reviewable artifacts, separate from vendored code, and easy to drop once upstream accepts the fix |
| **Copybara-style transform sync** | Config-driven bidirectional sync with path rewrites, license header injection, commit filtering | Google's Copybara (used for TensorFlow, Angular, Bazel open-sourcing) | Multiple internal repos consume one upstream, each needing different path/transform rules |

## 2. Artifact/package-level sync (decoupled versioning, no source copy)

| Layer | Mechanism | Example |
|---|---|---|
| **Frontend (npm)** | Upstream publishes a versioned npm package; midstream just bumps semver via Renovate/Dependabot | Standard OSS library consumption |
| **Frontend (Module Federation)** | Upstream builds+hosts its `remoteEntry.js`; midstream host loads it by URL/version at runtime — zero source sync | This repo's own MF remotes pattern (`gen-ai`, `model-registry` etc. as federated modules) |
| **Go BFF** | Upstream tags Go module releases; midstream pins in `go.mod`; use a `replace` directive pointing at a fork only for transient hotfixes, remove once upstream releases | Standard Go module versioning |
| **Go BFF (container)** | Upstream ships a pre-built OCI image with semver/git-sha tag; midstream references the tag in Helm/Kustomize — total decoupling | Common in operator/sidecar architectures |

## 3. Contract-first decoupling (orthogonal — works with any of the above)

- **OpenAPI spec as source of truth** + contract tests (you already have a `contract-tests` package/rule) — lets upstream's *implementation* evolve freely while midstream pins to a *contract version*. Bump the contract deliberately, not accidentally via a subtree merge.
- **Versioned endpoints** (`/v1`, `/v2`) so midstream can lag a version behind without blocking sync.
- This is the piece that determines how *safe* any sync method above is — without it, source-sync (subtree/patches) can silently break the BFF↔frontend contract.

## 4. Automation & governance patterns

- **Bot-driven periodic sync PRs** (Renovate/Dependabot for packages, or a cron'd subtree script like you have) — flags conflicts for human review instead of manual polling.
- **Reverse publishing-bot** (Kubernetes `staging/` → individual repos) — relevant only if midstream needs to push fixes *back* upstream automatically.
- **Fork-and-rebase cadence**: maintain a long-lived fork, rebase onto upstream tags on a fixed cycle, carry a small curated patch set, drop patches as upstream merges them (OpenShift/k8s model).
- **Feature-flag gating instead of forking**: keep one codebase; gate midstream-only requirements behind a flag (default-off upstream). Avoids subtree/patch machinery entirely — you get back to plain merge/rebase. This repo already does something like this for ODH vs RHOAI branding.

## Recommendation framing (given "most control for now")

Since you currently own both sides, a reasonable trajectory is:

1. **Now**: git subtree (or patch-stack) for source you're actively co-evolving, matching your existing `upstream-sync` skill — cheapest to iterate, full visibility into drift.
2. **In parallel, lock the BFF↔frontend contract** via OpenAPI + contract tests regardless of sync method — this is what protects you when upstream priorities diverge.
3. **As the interface stabilizes / control decreases**: migrate toward artifact-based sync — npm package for frontend pieces, Go module or OCI image for the BFF, Module Federation remote loading if it becomes a true independent micro-frontend. This is a one-way door that gets easier the earlier the contract is locked.

## Questions before I turn this into a concrete plan

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "question": "Is this for a brand-new package/micro-frontend you're about to onboard (with a specific upstream OSS project in mind), or is it general architecture guidance to document for the team?",
      "header": "Scope",
      "options": [
        {
          "label": "New package onboarding",
          "description": "You have a specific upstream repo + BFF in mind and want a concrete sync design"
        },
        {
          "label": "General guidance/doc",
          "description": "Want this captured as architecture guidance (e.g. new rule/doc) for future packages"
        }
      ]
    },
    {
      "question": "How much do you expect midstream to actually modify upstream source (frontend + BFF) vs just consume it?",
      "header": "Divergence level",
      "options": [
        {
          "label": "Heavy patching expected",
          "description": "Midstream will regularly add features/fixes ahead of or divergent from upstream — favors subtree/patch-stack"
        },
        {
          "label": "Light/rare patching",
          "description": "Mostly consuming upstream as-is with occasional overrides — favors artifact/package versioning"
        },
        {
          "label": "Unknown yet",
          "description": "Too early to tell, want architecture flexible enough to shift later"
        }
      ]
    },
    {
      "question": "Do you want the BFF and frontend to use the same sync strategy, or can they differ (e.g. Go module pinning for BFF, subtree for frontend)?",
      "header": "BFF vs frontend",
      "options": [
        {
          "label": "Can differ per component (Recommended)",
          "description": "Go/JS ecosystems have different native tooling (go.mod vs npm) — often cleanest to pick per-component"
        },
        {
          "label": "Must be uniform",
          "description": "Prefer one consistent sync mechanism across both for operational simplicity"
        }
      ]
    }
  ]
}
```

**Output:**
```
User has answered your questions: "Is this for a brand-new package/micro-frontend you're about to onboard (with a specific upstream OSS project in mind), or is it general architecture guidance to document for the team?"="New package onboarding", "How much do you expect midstream to actually modify upstream source (frontend + BFF) vs just consume it?"="Light/rare patching", "Do you want the BFF and frontend to use the same sync strategy, or can they differ (e.g. Go module pinning for BFF, subtree for frontend)?"="Can differ per component (Recommended)". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · Claude Sonnet 5 · 54.8s)

_Thinking:_



**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "question": "Does the upstream project already publish versioned release artifacts (tagged npm package, tagged Go module release, or container image), or is it purely active development with no release process yet?",
      "header": "Upstream maturity",
      "options": [
        {
          "label": "No release process yet",
          "description": "Upstream is co-developed in lockstep, commits land directly, no semver tags/publishing yet"
        },
        {
          "label": "Has releases already",
          "description": "Upstream tags versions and/or publishes npm/Go module/image artifacts you could pin to"
        }
      ]
    },
    {
      "question": "Is the upstream repo a separate GitHub repo from this monorepo (like kubeflow/model-registry is for packages/model-registry), or is 'upstream' actually the public opendatahub-io/odh-dashboard vs this being an internal midstream fork of the same repo?",
      "header": "Upstream location",
      "options": [
        {
          "label": "Separate dedicated repo (Recommended)",
          "description": "New standalone upstream project repo, analogous to kubeflow/model-registry pattern"
        },
        {
          "label": "Same repo, fork relationship",
          "description": "Upstream = opendatahub-io/odh-dashboard public repo, midstream = internal fork/branch of this exact repo"
        }
      ]
    },
    {
      "question": "Would you like me to now produce a concrete sync-strategy plan for this new package (e.g. decision doc / SKILL update / architecture note), or do you first want to name the specific upstream project so I can tailor it exactly?",
      "header": "Next step",
      "options": [
        {
          "label": "I'll name the upstream project first",
          "description": "Give more specifics before finalizing the plan"
        },
        {
          "label": "Produce general plan now",
          "description": "Build the plan using reasonable assumptions, refine after"
        }
      ]
    }
  ]
}
```

**Output:**
```
User has answered your questions: "Does the upstream project already publish versioned release artifacts (tagged npm package, tagged Go module release, or container image), or is it purely active development with no release process yet?"="No release process yet", "Is the upstream repo a separate GitHub repo from this monorepo (like kubeflow/model-registry is for packages/model-registry), or is 'upstream' actually the public opendatahub-io/odh-dashboard vs this being an internal midstream fork of the same repo?"="Separate dedicated repo (Recommended)", "Would you like me to now produce a concrete sync-strategy plan for this new package (e.g. decision doc / SKILL update / architecture note), or do you first want to name the specific upstream project so I can tailor it exactly?"="Produce general plan now". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · Claude Sonnet 5 · 31.0s)

_Thinking:_



## Concrete recommendation for this package

Given: separate upstream repo, **no release process yet** (active co-development), **light/rare midstream patching**, and component-level flexibility allowed — here's a phased plan.

### Phase 1 — Now (co-developing, upstream has no releases)

Artifact-based sync (npm/Go module/OCI pinning) isn't viable yet — there's nothing versioned to pin to. So both components sync at the **source level**, using the pattern this repo already has proven out (`model-registry`, `gen-ai`, `mlflow`, `automl`, `autorag`, `eval-hub` all do this today):

- **Both frontend and BFF**: git subtree the whole package (`packages/<name>/`, including `bff/`) using the existing `upstream-sync` skill/`update-subtree` script infrastructure. No new tooling needed — just add the `subtree` config to the new package's `package.json`.
- **Day one, not later**: stand up an OpenAPI spec + contract tests (`contract-tests` package convention) for the BFF. This is the actual safety net — it lets the two sides diverge later without a subtree merge silently breaking the frontend↔BFF interface, and it's what makes Phase 2 possible without a rewrite.
- **Because patching is light**: keep midstream-only deltas isolated (separate config/files rather than editing shared logic in place) so subtree diffs stay small and conflicts stay rare — this is the main lever you have to keep subtree cheap.
- **Upstream-first workflow**: since you currently control both sides, land changes in the upstream repo first, then pull down via subtree — rather than patching midstream and backporting. This is what keeps subtree conflict-free; it gets harder to sustain once priorities genuinely diverge, which is exactly the trigger for Phase 2.
- **Cadence**: sync on a fixed schedule (weekly/per-sprint) via the existing script rather than ad hoc — staleness is what turns subtree sync into a multi-commit conflict slog.

### Phase 2 — Trigger: upstream starts tagging releases, or requirements meaningfully diverge

Because you kept the contract locked in Phase 1, each component can decouple independently:

- **Go BFF** → drop `bff/` from subtree, consume via versioned Go module (`go get github.com/<org>/<upstream>@vX` in `go.mod`). Use a `replace` directive only for transient hotfixes ahead of an upstream tag, remove once upstream releases.
- **Frontend** → if upstream starts publishing a built bundle, drop frontend source from subtree and move to either an npm-published shared package, or full Module Federation remote loading (matches this repo's existing MF-remote packages) — whichever matches how "micro" the frontend really is.

### Why not submodule or artifact-pinning now
Submodule would block the normal monorepo/Turbo/npm-workspace editing flow (needs separate push rights, can't be edited in place as a workspace member) — bad fit while you're actively co-developing in both places. Artifact pinning (npm/Go module/OCI) has nothing to pin to yet since upstream isn't cutting releases.

---

Since we're in plan mode, I haven't touched anything. Want me to turn this into something concrete once you exit plan mode — e.g. scaffold the package via the `module-onboarding` skill with subtree config, or write this up as an ADR/architecture note in the package's `AGENTS.md`?

---

## User

how would you patch the bff (which is in go)? 

---

## Assistant (Plan · Claude Sonnet 5 · 15.4s)

_Thinking:_



---

## User

how would you patch the midstream bff (which is in go)? 

---

## Assistant (Plan · Claude Sonnet 5 · 32.0s)

_Thinking:_



Two contexts, since BFF sync mechanism differs by phase (per the plan above):

## Phase 1: BFF is git-subtreed (source lives in `packages/<name>/bff/`)

**Preferred — zero-conflict-surface patches** (fits "light/rare patching"):

1. **Build-tag isolation**: midstream-only logic goes in new files upstream doesn't have at all, e.g. `handler_midstream.go` with `//go:build midstream`, or just a plain new file (`midstream_config.go`). Subtree sync of upstream files never touches these — no merge conflict possible, ever.

2. **Adapter/middleware injection at composition root**: don't edit upstream's handler bodies. Wrap them behind Go's standard middleware pattern in `main.go`/router setup (a file midstream usually owns fully, not deeply upstream logic):
```go
handler := upstreambff.NewHandler(deps)
handler = midstream.WithAuthOverride(handler)  // midstream-only decorator
```
Same idea for service interfaces — inject a midstream implementation via dependency injection rather than editing the upstream struct.

**Fallback — direct edits to shared upstream files** (when you truly must touch upstream logic):

3. Just edit the `.go` file directly, commit normally. Next `update-subtree` run does a real 3-way git merge against upstream's changes to that file — conflicts resolved manually (this is exactly Phase 3 of the existing `upstream-sync` skill). Tag these commits distinctly (e.g. `[midstream-patch]` prefix) so `git log --grep` finds every local patch you still owe upstream or need to drop once they merge it.

## Phase 2: BFF is a pinned Go module (`go.mod` dependency, no subtree)

Now "patching" means carrying a fork, not editing in-tree:

4. **`go.mod` `replace` directive** — point at your patched fork or a local path:
```go
replace github.com/upstream-org/bff => github.com/your-org/bff-fork v0.0.0-patch1
// or during local dev:
replace github.com/upstream-org/bff => ../bff-fork
```
Drop the `replace` line once upstream merges the fix and cuts a release. This is the standard Go ecosystem pattern (Kubernetes carries dozens of these).

5. **Vendor + patch-file stack** — `go mod vendor` then apply tracked `.patch` files via a Makefile step (`git apply patches/*.patch`). Use this only when you need to patch something `replace` can't reach (e.g. a transitive dependency of the upstream module rather than the module itself).

## Bottom line
Given your "light patching" answer: lean on **#1/#2 (build tags + adapter injection)** in Phase 1 so subtree syncs stay conflict-free, reserve **#3 (direct edit)** as the exception, and when you eventually move to module-pinning, **#4 (`replace` directive)** is the direct Go-idiomatic equivalent of a "patch" — temporary by design, meant to disappear once upstream ships the fix.

---

## User

how is this different from just writing interfaces in the upstream and implementing them in the midstream?

---

## Assistant (Plan · Claude Sonnet 5 · 47.2s)

_Thinking:_



Good catch — they're the same core idea (dependency inversion / "ports and adapters"), but differ in **who owns the seam** and **where it lives**. Worth separating clearly:

## What I described (#2, opportunistic wrapping)
Midstream wraps upstream's *already-exposed* composable surface from the outside — e.g. wrapping an `http.Handler` in middleware, or injecting a struct field at construction time — without upstream needing to know midstream exists or design anything specific for it.

- **Works when**: the thing you need to override happens to already be interface-shaped (Go stdlib is full of these: `http.Handler`, `io.Writer`) or injectable via existing constructor params.
- **Doesn't work when**: the behavior you need to change is buried in unexported upstream internals with no existing seam. You're stuck editing upstream's file directly (fallback #3) until upstream restructures.
- **Requires zero upstream cooperation** — purely a midstream-side technique.

## What you're proposing (formal extension point)
Upstream *deliberately* defines a `type AuthProvider interface {...}`, calls through it internally, and exposes it as an injectable dependency (e.g. `NewServer(deps Dependencies)` where `Dependencies.AuthProvider` is the interface). Midstream supplies its own implementation in a midstream-only file — subtree never touches it, because upstream never had that file.

- **Works for anything** — not limited to already-composable boundaries, since upstream is designing the seam specifically for this need.
- **Requires upstream buy-in per extension point** — someone has to add the interface + wire it through upstream's own code. This is exactly why "we have most control for now" matters: use that leverage *now* to get the right seams built in, before priorities diverge and upstream stops wanting to carry midstream-specific hooks.
- **This is the industry-standard name for it**: "ports and adapters" / hexagonal architecture, or just "plugin architecture." Kubernetes CSI/CNI/scheduler plugins, containerd plugins, Terraform's provider SDK all work this way — core defines interfaces, implementations plug in externally. Notably, **this repo already does the TS equivalent** for the frontend (`plugin-core` + the extension system that `packages/*` implement) — so proposing the same discipline for the Go BFF is just applying an existing house pattern to the other side of the stack.

## The catch (same one as before)
An upstream-defined interface is itself a contract — same category of risk as the OpenAPI contract we discussed for the HTTP layer. If upstream changes the interface's method signature, midstream's implementation breaks, same as a breaking API change. So this doesn't remove the need for contract discipline — it just moves the contract boundary from "HTTP request/response shape" down to "Go interface shape," and from network-level to compile-level (which is actually a strict improvement: you get a compiler error instead of a runtime failure when it breaks).

## Net
Your proposal is strictly better *where you can get upstream to adopt it* — it eliminates the subtree-conflict risk entirely for that concern (adapter file never existed upstream, so no merge target) and works for arbitrary internal behavior, not just already-exposed seams. The opportunistic wrapping (#2) is the fallback for cases upstream hasn't (yet, or ever) turned into a formal extension point. In practice you'd want both: push for formal interfaces at the seams you know you'll need long-term (worth spending your current influence on), and keep opportunistic wrapping as the tool for smaller/one-off overrides not worth asking upstream to formalize.

---

## User

define this formal extension point or whatever. examples maybe

---

## Assistant (Plan · Claude Sonnet 5 · 49.3s)

_Thinking:_



## Anatomy of a formal extension point

Four parts, all defined/owned by **upstream**:

1. **Interface** — the contract, in its own file/subpackage
2. **Injection point** — upstream's own code calls through the interface instead of a concrete type
3. **Default implementation** — upstream ships its own impl (for its own dev/test/deploy needs)
4. **Wiring mechanism** — how a *different* implementation gets selected without editing upstream's files

That 4th part is what most people get wrong — if wiring is done by editing `main.go` per fork, you're back to subtree conflicts. Do it right and midstream never touches an upstream-owned file again for that concern.

## Concrete example: BFF auth provider

**1. Interface** (upstream, `bff/auth/provider.go`):
```go
package auth

type AuthProvider interface {
    Authenticate(ctx context.Context, r *http.Request) (*Identity, error)
}

type Identity struct {
    UserID string
    Groups []string
}
```

**2 & 3. Injection point + default impl** (upstream, `bff/auth/default.go` + `bff/server.go`):
```go
// default.go
func init() {
    Register("static-token", func(cfg Config) (AuthProvider, error) {
        return &StaticTokenProvider{Token: cfg.Token}, nil
    })
}

// server.go — upstream's own code depends on the interface, not a concrete type
type Dependencies struct {
    AuthProvider auth.AuthProvider
}
func NewServer(deps Dependencies) *Server { ... }
```

**4. Wiring mechanism — registry, not hardcoded** (upstream, `bff/auth/registry.go`):
```go
var registry = map[string]func(Config) (AuthProvider, error){}

func Register(name string, factory func(Config) (AuthProvider, error)) {
    registry[name] = factory
}
func New(name string, cfg Config) (AuthProvider, error) {
    f, ok := registry[name]
    if !ok { return nil, fmt.Errorf("unknown auth provider %q", name) }
    return f(cfg)
}
```

```go
// upstream cmd/main.go — reads a config value, never needs to change again
provider, err := auth.New(os.Getenv("AUTH_PROVIDER"), cfg)
```

**Midstream's patch** — a brand-new file that never existed upstream, self-registering via `init()`:
```go
// midstream-only: bff/auth/openshift_oauth.go
package auth

func init() {
    Register("openshift-oauth", func(cfg Config) (AuthProvider, error) {
        return &OpenShiftOAuthProvider{...}, nil
    })
}
```
Set `AUTH_PROVIDER=openshift-oauth` in midstream's deploy config. **Zero edits to any upstream-owned file.** Subtree sync of `bff/auth/registry.go`, `default.go`, `server.go` will never conflict with this, ever — there's no shared line of code between them.

## Real-world examples of this exact pattern

| System | Interface | Registration |
|---|---|---|
| Go stdlib `database/sql` | `driver.Driver` | `sql.Register("postgres", ...)` + blank-import (`_ "github.com/lib/pq"`) — literally the same registry+init pattern above |
| Caddy (web server) | `caddy.Module` | Compile-time module registry, third-party modules added via blank-import build lists |
| containerd | plugin interfaces per subsystem | `plugin.Register(...)` in `init()`, discovered at startup |
| Kubernetes CSI/CNI/device plugins | gRPC service interfaces | **Process-boundary** version of this — plugin runs as a separate binary/socket, not in-process |
| HashiCorp go-plugin (Terraform, Vault, Nomad providers) | RPC interface | Separate binary implements the interface, talks to host over RPC |

## Two tiers — pick based on your constraint

**Tier 1: in-process interface + registry** (what I coded above) — single binary, compile-time wiring via blank-import + config value. Cheapest, no IPC, no separate versioning of an RPC contract. **This is the right default for your BFF** since midstream and upstream presumably ship as one deployable.

**Tier 2: process-boundary plugin** (CSI/go-plugin style) — implementation lives in a genuinely separate binary/repo with its own release cadence, talks over gRPC. Only worth the complexity if midstream's implementation needs strong isolation, a different Go version, or multiple independent consumers plugging into the same upstream binary at runtime. Adds a new problem: now the *RPC schema* is the contract you must version (same discipline as the OpenAPI contract, one layer down).

For a single BFF with one midstream consumer, Tier 1 is enough — don't reach for Tier 2 unless a concrete requirement forces it.

## Where to spend your current leverage
Since you have most control now: identify the 2-3 places you already know midstream will need different behavior (auth, storage/persistence backend, maybe notification/audit sink), and get upstream to define Tier-1 interfaces + registries for exactly those seams before priorities diverge. Everything else stays plain shared code, synced via subtree with no special handling.

---

