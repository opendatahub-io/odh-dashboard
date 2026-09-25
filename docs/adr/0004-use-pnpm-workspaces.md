# 4. Use pnpm Workspaces

Date: 2026-03-11

## Status

Accepted

Supersedes the package-manager portion of [ADR 0001](0001-use-monorepo-with-npm-workspaces.md). The monorepo and Turbo decisions remain accepted.

## Context

The dashboard monorepo previously used npm workspaces. As the repository grew, installs and CI jobs spent increasing time resolving and duplicating dependencies. The migration tracked by RHOAIENG-83227 evaluated pnpm as a replacement while preserving the existing workspace layout, package scripts, Turbo orchestration, and application behavior.

The repository also vendors independently maintained upstream frontends under Model Registry and Notebooks. Those subtrees retain their upstream package-manager conventions and npm lockfiles so that upstream synchronization remains low risk.

## Decision

Use **pnpm 11.22.0** for the first-party monorepo workspace.

- Pin the pnpm version in the root `package.json` `packageManager` field.
- Declare workspace membership in `pnpm-workspace.yaml`.
- Maintain one root `pnpm-lock.yaml` for first-party workspace packages.
- Run local development, tests, builds, CI, release automation, and first-party container builds with pnpm.
- Keep Turbo as the task orchestrator; pnpm replaces npm as the package manager, not Turbo.
- Do not depend on Corepack being available. Developer and CI setup must install the repository-pinned pnpm version explicitly before running `pnpm install`.
- Do not create package-local `package-lock.json` files in first-party workspace packages.

### Upstream subtree exceptions

The following independently maintained upstream frontends are outside the pnpm workspace and intentionally continue to use npm and their checked-in upstream lockfiles:

- `packages/model-registry/upstream/frontend`
- `packages/notebooks/upstream/frontend`

Commands that execute inside those directories must follow the upstream project. Wrapper scripts and automation owned by this repository use pnpm until they enter an upstream subtree.

### Temporary hoisting compatibility

The workspace temporarily uses `shamefully-hoist=true` to preserve npm-era dependency resolution while the migration stabilizes. RHOAIENG-83228 tracks removing this compatibility setting after undeclared and phantom dependencies are corrected. New code must not rely on hoisting as a substitute for declaring dependencies.

## Consequences

**Positive:**

- Faster, more space-efficient dependency installation.
- Deterministic installs from one first-party lockfile.
- Consistent package-manager behavior across local development, CI, and containers.
- Explicit workspace dependency boundaries and filtering.

**Negative:**

- Contributors must install the pinned pnpm version.
- Scripts and documentation must use pnpm argument-forwarding semantics rather than npm conventions.
- Temporary hoisting reduces pnpm's strictness until RHOAIENG-83228 is complete.
- Maintainers must preserve the npm boundary around vendored upstream frontends.

## Rollout and rollback

Developer rollout instructions are maintained in [Dev Setup](../dev-setup.md). CI and container jobs install the same pnpm version pinned by the repository.

If a release-blocking migration regression cannot be corrected promptly:

1. Open or update the S0 rollback issue tracked by RHOAIENG-83229 and record the failing workflows and release impact.
2. Stop lockfile and dependency updates while the rollback is prepared.
3. Revert the pnpm migration as one coordinated change. Restore package metadata, the last npm lockfile, workspace configuration, CI actions and workflows, container install steps, scripts, and developer documentation together; do not mix npm installs with the pnpm lockfile.
4. Leave the Model Registry and Notebooks upstream subtrees unchanged because they already use their upstream npm workflows.
5. Validate the restored npm workflow with a clean install, lint, type-check, unit tests, production builds, affected Cypress and contract tests, container builds, and dependency/security checks before merging the rollback.
6. Resume migration work only after the blocker has a documented cause and remediation plan.

Rollback is a repository-level revert, not a supported per-package fallback. Running npm against the current pnpm workspace can create incompatible lockfiles and is not a valid recovery procedure.

## Alternatives Considered

### Continue with npm workspaces

Rejected because pnpm provided better install performance and disk usage while supporting the existing monorepo and Turbo architecture.

### Yarn workspaces

Rejected because pnpm met the workspace, performance, lockfile, CI, and container requirements with less migration risk for this repository.

### Mixed package managers in the first-party workspace

Rejected because multiple first-party lockfiles and install paths would reduce reproducibility and make CI and local behavior diverge. The only exceptions are vendored upstream frontends that remain outside the workspace.

## References

- [Dev Setup](../dev-setup.md)
- [Architecture Decisions](../architecture-decisions.md)
- [ADR 0001: Original npm workspace decision](0001-use-monorepo-with-npm-workspaces.md)
- [ADR 0003: Use Turborepo for build orchestration](0003-use-turborepo-for-build-orchestration.md)
- [pnpm workspace configuration](../../pnpm-workspace.yaml)
- [root package metadata](../../package.json)
- RHOAIENG-83227: npm-to-pnpm monorepo migration
- RHOAIENG-83228: remove temporary shameful hoisting
- RHOAIENG-83229: migration rollback procedure
