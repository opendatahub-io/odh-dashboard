# Konflux Build Simulation for odh-dashboard

Generated artifacts for validating odh-dashboard builds in a Konflux-like environment before they reach production.

## Overview

This PR adds a `.github/workflows/pr-build-validation.yml` workflow that runs comprehensive build validation on every PR to catch issues before they reach production.

## What Gets Validated

### Phase 0: Early Static Checks (Fast Fail)
Runs BEFORE Docker build to catch issues in <1 minute:

#### Hermetic Lockfile Validation
- ✅ **Detects unsupported dependency protocols** that break downstream RHOAI hermetic builds
  - Fails on: `git+`, `github:`, and `file:` protocols in `pnpm-lock.yaml`
  - Requires: Dependencies must resolve through sources supported by Hermeto/Cachi2
  - Why: Hermeto/Cachi2 (RHOAI's dependency resolver) cannot fetch from git/file protocols
  - Example failure: a lockfile `resolution` or `tarball` containing `git+https://...` → use a registry version

- ✅ **Tests a hermetic pnpm install** with `--offline`
  - Simulates: Actual RHOAI build environment after the dependency store is populated
  - Catches: Lockfile-out-of-sync issues and dependencies that require network access
  - Speed: ~30 seconds vs 10+ minutes for a full Docker build
  - Note: The check first populates a pnpm store, then installs from that store with networking disabled.

#### Workspace Dependency Validation
- ✅ **Dynamically detects workspace scope** from `package.json`
  - Finds: `@odh-dashboard/*` packages or workspace directories
  - Works: With any monorepo structure (not hardcoded)

- ✅ **Cross-references imports with Dockerfile COPY commands**
  - Scans: Source files for workspace package imports
  - Validates: Each imported workspace is COPYed in Dockerfile
  - Prevents: "Cannot find module @odh-dashboard/app-config" errors
  - Example: If `backend/src/index.ts` imports `@odh-dashboard/app-config`, validates Dockerfile has:
    ```dockerfile
    COPY packages/app-config /usr/src/app/packages/app-config
    ```

#### FIPS Compliance Validation
- ✅ **Verifies esbuild removal** from `node_modules`
  - Why: esbuild is a Go binary that is NOT FIPS compliant
  - Requirement: RHOAI builds must remove all non-FIPS binaries
  - Checks: `Dockerfile` contains `rm -rf node_modules/esbuild`
  - Impact: Blocking issue for product release if not fixed

- ✅ **Validates Go build tags** (if Go present)
  - Checks: `go build` commands use `-tags strictfipsruntime`
  - Why: Forces FIPS-compliant crypto libraries

### Phase 1: Docker Build Validation
- ✅ **Builds with both BUILD_MODE values**
  - ODH mode (upstream open source)
  - RHOAI mode (downstream product)
  - Validates: Environment variable handling, branding differences

- ✅ **Multi-stage build testing**
  - Builder stage: Compiles TypeScript, builds rspack bundles
  - Runtime stage: Serves production artifacts
  - Catches: Missing COPY commands, permission issues

- ✅ **Dashboard operator image build** (`dashboard-operator/Dockerfile`)
  - Builds: The controller-runtime operator image (`--build-arg OPERATOR_VERSION=ci-test`)
  - Catches: Go compilation errors, missing COPY dependencies, FIPS build failures
  - Output: Saved as the `dashboard-operator-image` artifact for reuse in the Phase 4 Kind cluster (no rebuild)
  - Triggers: Runs when the PR touches `dashboard-operator/**` (alongside frontend/backend/manifest changes)

### Phase 2: Runtime Validation
- ✅ **Container startup health**
  - Starts container and waits 30 seconds
  - Detects: Immediate crashes vs delayed failures
  - Monitors: Exit codes, OOMKills

- ✅ **Crash indicator scanning**
  - Scans logs for: "uncaught exception", "fastify error"
  - Detects: Dependency regressions that cause crashes
  - Example: Catches fastify v4→v5 breaking changes

- ✅ **Critical API endpoint testing**
  - Tests PATCH with `application/merge-patch+json`
    - Regression: Fastify v5 returns 415 error (PR #6727)
    - Impact: Breaks 28+ PATCH operations in dashboard
  - Tests PATCH with `application/json-patch+json`
  - Validates: Content-type handling across Fastify versions

- ✅ **WebSocket compatibility**
  - Connects to WebSocket endpoints
  - Regression: `@fastify/websocket` v11 removes SocketStream
  - Impact: Causes pod crashes (exit 1/OOMKill 137)
  - Validates: Container stays running after WebSocket connection

- ✅ **Non-root user runtime**
  - Container runs as user 1001 (non-root)
  - Catches: Permission denied errors on logs, temp files

### Phase 3: Module Federation Validation
- ✅ **remoteEntry.js presence and size**
  - Validates: File exists and is not empty
  - Minimum size: 100 bytes
  - Catches: Build failures that produce empty manifests

- ✅ **Missing rspack chunk detection**
  - Parses: `remoteEntry.js` for chunk references
  - Validates: All referenced chunks exist as `*.bundle.js` files
  - Prevents: Runtime ChunkLoadError (RHOAIENG-59862)
  - Example: If `remoteEntry.js` references `chunk8419.bundle.js`, validates file exists

- ✅ **Large chunk detection**
  - Warns: Chunks larger than 1MB
  - Impact: Slow page loads, Cypress timeouts
  - Optimization: Suggests code splitting

- ✅ **Module Federation load performance**
  - Tests: Endpoint response times
  - Threshold: Flags endpoints slower than 2 seconds
  - Prevents: "Dashboard takes too long to load" (RHOAIENG-59861)
  - Impact: Avoids Cypress test timeouts

- ✅ **Dist size reporting**
  - Reports: Total size per module
  - Helps: Track bundle bloat over time

**Note:** This does NOT test runtime proxy endpoints (`/_mf/*` routes) — those proxy to K8s services and require a cluster.

### Phase 4: Operator Integration (Kind Cluster)
- ✅ **Kind cluster creation**
  - Creates: Temporary local Kubernetes cluster
  - Loads: Built dashboard Docker image and the dashboard-operator image (from the Phase 1 artifacts)

- ✅ **Manifest application**
  - Applies: Kustomize overlays (`manifests/odh`)
  - Tests: CRD installation, ConfigMap generation

- ✅ **Deployment validation**
  - Waits: Up to 5 minutes for pod to be ready
  - Checks: Pod status, logs, health endpoints

- ✅ **Operator CRD + RBAC deployment**
  - Applies: The `Dashboard` CRD (`components.platform.opendatahub.io`) and waits for the `Established` condition
  - Applies: The operator ClusterRole (`config/rbac/role.yaml`) plus a ServiceAccount and ClusterRoleBinding
  - Catches: CRD schema regressions, RBAC manifest errors that only surface on `kubectl apply`

- ✅ **Operator reconciliation smoke test**
  - Deploys: A minimal operator Deployment (no cert-manager webhook/metrics TLS — Kind-friendly)
  - Creates: A minimal `Dashboard` CR and polls for reconciliation evidence
  - Asserts: The finalizer (`components.platform.opendatahub.io/cleanup`) and `status.observedGeneration` are set, with **0 operator restarts**
  - Catches: Controller panics on startup, scheme/registration errors, reconcile crashes that unit + envtest tests can miss on a real API server
  - Note: The operand cannot fully provision on Kind (no OpenShift Routes/Ingress), so the test validates that the controller *starts reconciling cleanly*, not that the operand reaches Ready

### BFF Module Validation

Runs only when a PR changes files in a package that has a `Dockerfile.workspace` (e.g., `packages/gen-ai/`, `packages/mlflow/`). Skipped entirely when no BFF packages are affected.

- ✅ **Dynamic module discovery**
  - Discovers: All `packages/*/Dockerfile.workspace` files automatically
  - Detects: Which packages have changed files in the PR
  - Triggers: The BFF matrix also rebuilds all modules when root `package.json` or `pnpm-lock.yaml` change; `pnpm-workspace.yaml` still triggers the overall workflow and hermetic preflight
  - Future-proof: New modules with a `Dockerfile.workspace` are picked up without config changes

- ✅ **BFF Docker image build**
  - Builds: Each affected module's `Dockerfile.workspace` (same Dockerfile that Konflux uses post-merge)
  - Catches: Go compilation errors, missing COPY dependencies, and pnpm install failures
  - Parallel: Affected modules build concurrently via matrix strategy

- ✅ **BFF startup crash detection**
  - Starts: Each built BFF container and waits 5 seconds
  - Validates: BFF binary starts without crashing (non-zero exit / process death)
  - Scans logs for: `panic:`, `fatal error:`, `runtime error:`, `SIGSEGV`
  - Catches: Go protobuf registration conflicts, import cycles, binary link errors
  - Motivating failure: PR #8479 introduced a protobuf conflict that compiled fine but panicked at runtime

**Note:** BFF startup validation does not test application-level health (`/healthcheck` endpoint) or connectivity to backend services. It validates that the Go binary can start without crashing — the class of failure that previously only surfaced after merge.

### Phase 5: Manifest Validation
Runs independently of the Docker build (no image needed), so it fails fast on manifest regressions.

- ✅ **Kustomize build testing**
  - Builds: The set the `dashboard-operator` actually renders — the platform overlays (`manifests/base`, `manifests/odh`, `manifests/rhoai`), the observability overlays (`manifests/observability/{odh,rhoai}`), the MaaS consumer-portal distribution (`manifests/distributions/maas-consumer-portal`), and every module overlay under `manifests/modules/<slug>` (discovered automatically, so a new module needs no workflow edit). The ConsoleLink overlays are covered transitively through the platform overlays.
  - Validates: YAML syntax, kustomization references, resource generation
  - Catches: Missing files, broken `resources:`/`patches:` paths, ConfigMapGenerator errors

- ✅ **Kubernetes schema validation** (kubeconform)
  - Pipes: Each `kustomize build` output through `kubeconform -strict -ignore-missing-schemas` (parsed as JSON)
  - Validates: Resources conform to the Kubernetes API schema (v1.31.0)
  - Skips: CRDs without a published schema (`-ignore-missing-schemas`) so custom resources don't false-fail
  - Fails: When a *built-in* Kubernetes kind is skipped — i.e. a skipped resource in the core group, `*.k8s.io`, or `apps`/`batch`/`policy`/`autoscaling`/`extensions`. Those always have a schema, so a skip there means a misspelled `kind` or `apiVersion`. This guard is what makes `-ignore-missing-schemas` safe to use.
  - Catches: Invalid field names, wrong types, malformed spec sections, and typo'd built-in kinds before they reach a cluster

## Usage

### GitHub Actions (Automatic)
The workflow runs automatically on all PRs to `main` that modify relevant files (frontend, backend, packages, Dockerfile, manifests, `dashboard-operator/**`).

**Skip validation on a PR:**
Add `[skip konflux-sim]` to the PR title or add the `skip-konflux-sim` label.

### Local Testing
Local testing is not yet available. The validation currently only runs in GitHub Actions CI. A standalone script for local validation may be added in a future update.

## Benefits

### Prevents Build Failures
- ✅ **Catches hermetic build issues** before downstream RHOAI builds
  - Saves: Hours of debugging failed RHOAI builds
  - Prevents: Blocked releases due to dependency issues

- ✅ **Catches workspace dependency issues** before merge
  - Prevents: "Cannot find module" errors in Konflux
  - Validates: All workspace packages are correctly COPYed

- ✅ **Catches FIPS compliance violations** early
  - Prevents: Release blockers (esbuild in production image)
  - Validates: Go binaries use FIPS-compliant crypto

- ✅ **Detects dependency regressions** before merge
  - Example: Fastify v4→v5 breaking changes (PR #6727)
  - Example: @fastify/websocket v11 SocketStream removal (PR #7387)
  - Saves: Hours of debugging crashloops in production

- ✅ **Prevents Module Federation failures**
  - Catches: Missing chunks (RHOAIENG-59862)
  - Catches: Slow loads (RHOAIENG-59861)
  - Prevents: Cypress test failures

### Fast Feedback
- ⚡ **Phase 0 runs in <1 minute** (hermetic checks)
  - Fails fast before Docker build
  - Catches 80% of common issues

- ⚡ **Full workflow runs in 10-20 minutes**
  - Faster than manual testing
  - Faster than waiting for Konflux to fail

### Developer Experience
- 🎯 **Clear error messages** with context
- 📊 **Detailed logs** for debugging
- 🔄 **Automated** — no manual intervention needed

## Time Estimates

### GitHub Actions (Parallel)
- Phase 0: 1-2 minutes
- Phase 1 (ODH + RHOAI + operator): 8-12 minutes (parallel)
- Phase 2-3 (ODH + RHOAI): 3-5 minutes (parallel, after Phase 1)
- Phase 4 (dashboard + operator CRD/CR reconciliation): 6-10 minutes
- Phase 5 (manifest validation): 1-2 minutes (parallel, independent of Docker build)

**Total: 10-20 minutes** (with parallelization)

## Requirements

### GitHub Actions
- GitHub repository with Actions enabled
- No additional setup required (all tools installed in workflow)

## Troubleshooting

### Hermetic Build Failures

**Error: Found unsupported dependency protocols**
```bash
❌ FAIL: Found unsupported dependency protocols for hermetic builds:
"resolved": "git+https://github.com/owner/repo.git#commit"
```

**Fix:**
1. Find the dependency in `package.json`
2. Replace it with a registry version and update the lockfile:
   ```bash
   pnpm add package-name@version --save-exact
   ```
   For a dependency owned by a workspace package, run the command from the repository root with that package selected, for example:
   ```bash
   pnpm --filter @odh-dashboard/<package> add package-name@version --save-exact
   ```

**Error: Hermetic install failed (network disabled)**
```bash
❌ FAIL: Hermetic install failed
ERR_PNPM_NO_OFFLINE_TARBALL  A package is missing from the offline store
```

**Fix:**
1. Refresh dependencies from the repository root:
   ```bash
   rm -rf node_modules
   pnpm install
   ```
   Do not delete `pnpm-lock.yaml`; regenerate it only when dependency manifests intentionally change.
2. Or the dependency has dynamic or unsupported resolution:
   - Check the lockfile for `git+`, `github:`, or `file:` protocols
   - Use an exact registry version with `--save-exact`

### Workspace Dependency Failures

**Error: Dockerfile imports package but doesn't COPY**
```bash
⚠️  WARNING: Dockerfile imports app-config but doesn't COPY packages/app-config
```

**Fix:**
Add COPY command to Dockerfile:
```dockerfile
COPY packages/app-config /usr/src/app/packages/app-config
```

### FIPS Compliance Failures

**Error: Dockerfile should remove esbuild binaries**
```bash
⚠️  WARNING: Dockerfile should remove esbuild binaries for FIPS compliance
```

**Fix:**
Add to Dockerfile after `pnpm install`:
```dockerfile
RUN rm -rf node_modules/esbuild node_modules/@esbuild node_modules/.bin/esbuild
```

### Docker Build Failures

**Error: Cannot find module '@odh-dashboard/app-config'**
- Check: Workspace validation warnings from Phase 0
- Fix: Add missing COPY command (see Workspace Dependency Failures above)

**Error: EACCES permission denied**
- Check: Files are copied with correct ownership
- Fix: Use `COPY --chown=default:root` in Dockerfile

### Runtime Failures

**Error: Container crashed during startup**
- Check: `docker logs odh-dashboard-test` for details
- Common causes:
  - Missing environment variables
  - Port already in use (8080)
  - File permission issues

**Error: Found Fastify error in logs**
- Check: Dependency versions in `package.json`
- Known issues:
  - Fastify v4→v5 breaking changes (content-type handling)
  - @fastify/websocket v11 (SocketStream removal)

### Module Federation Failures

**Error: Missing chunks (ChunkLoadError)**
```bash
❌ FAIL: 5 missing chunks (causes ChunkLoadError at runtime)
```

**Fix:**
1. Check rspack config for output settings
2. Verify `publicPath` is correct
3. Ensure all chunks are generated:
   ```bash
   pnpm run build
   ls frontend/public/*.bundle.js
   ```

**Error: Endpoint took >2s (Cypress timeout risk)**
```bash
⚠️  WARNING: /api/status took 2500ms (>2s, may cause Cypress timeouts)
```

**Optimize:**
1. Check for slow API calls during initialization
2. Add caching for expensive operations
3. Defer non-critical initialization

### BFF Startup Failures

**Error: BFF container exited (exit code: 2)**
```bash
::error::gen-ai BFF container exited (exit code: 2)
The BFF binary crashed on startup.
```

**Common causes:**
- Go protobuf registration conflict (`panic: proto: file already registered`)
- Missing or incompatible Go dependencies
- Binary link errors from CGO/FIPS build

**Fix:**
1. Check the container logs in the CI output for the exact panic/error message
2. If protobuf conflict: check for duplicate `.proto` file registrations across Go dependencies
3. Run locally: `docker build --file packages/<module>/Dockerfile.workspace . && docker run --rm <image>`

## Skipping Validation

### Skip entire workflow
Add `[skip konflux-sim]` to PR title:
```
feat: Add new feature [skip konflux-sim]
```

## CI Integration Tips

### Run validation on every PR
Already configured in `pr-build-validation.yml`.

### Run validation before merge
Add to `.github/workflows/pr-build-validation.yml`:
```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

### Make validation required
1. Go to repository Settings → Branches
2. Add branch protection rule for `main`
3. Require status checks: "Build Validation Summary"

## Maintenance

### Update Node.js or pnpm versions
When updating Node.js or pnpm in the project, update the repository source of truth (`package.json` and `pnpm-workspace.yaml`) and then update the workflow:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'  # Update this
```

Also update the Dockerfile base image and the `packageManager` field in `package.json`:
```dockerfile
ARG BASE_IMAGE="registry.access.redhat.com/ubi9/nodejs-22:latest"  # Update this
```

### Add new validation checks
Add to the appropriate phase in `.github/workflows/pr-build-validation.yml`.

## Related Issues

This validation catches issues like:
- **RHOAIENG-59862**: Missing webpack chunks causing ChunkLoadError
- **RHOAIENG-59861**: Slow dashboard loads causing Cypress timeouts
- **PR #6727**: Fastify v5 content-type rejection (415 errors)
- **PR #7387**: @fastify/websocket v11 SocketStream crashes
- **PR #8479**: Go protobuf registration conflict in gen-ai BFF (startup panic)
- **RHOAIENG-87691**: Operator build + CRD/CR reconciliation and manifest schema validation in the simulator

## References

- [Konflux documentation](https://konflux-ci.dev/)
- [Hermeto/Cachi2 documentation](https://github.com/containerbuildsystem/cachi2)
- [Module Federation documentation](https://module-federation.io/)
- [Fastify v5 migration guide](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/)
