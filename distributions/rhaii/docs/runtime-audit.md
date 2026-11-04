# RHAII Production Runtime Audit

The audit builds RHAII with its [production Rspack configuration](../config/rspack.prod.js) and inventories source modules assigned to emitted chunks. It identifies legacy dashboard frontend and KServe frontend code, including transitive imports and lazy chunks, so extraction work can target the code actually included in the production output.

## Run the Audit

From `distributions/rhaii`, with workspace dependencies installed:

```bash
pnpm run audit:runtime
```

This command performs a fresh optimized build and writes these ignored artifacts under `dist/runtime-audit/`:

| Artifact | Contents |
| --- | --- |
| `assets/` | Production build output, including source maps |
| `stats.json` | Complete Rspack module, reason, and chunk statistics |
| `report.json` | Module and owner inventory, chunk membership, violations, and importer paths |
| `report.md` | Summary, imports crossing the boundary, and example importer paths |

The report records the Git revision, tracked working tree state, build hash, and Rspack version. Run from a clean checkout for evidence tied to a committed revision. Previous statistics and reports are removed before each run so a failed build cannot leave a stale passing report.

Report mode exits successfully when the build and audit complete, even if the report says **FAIL**. Build errors, incomplete statistics, and unsupported remote configurations fail the command.

For a strict assertion:

```bash
pnpm run check:runtime-boundary
```

This repeats the production build and exits with status 1 if forbidden modules remain. It has no baseline exemptions. It is intentionally separate from the normal build and CI while the [recorded baseline](runtime-audit-baseline.md) still fails.

## What the Check Measures

The audit includes modules in initial and lazy chunks, recursively includes constituents of concatenated modules, and merges duplicate module records. Modules without emitted chunk membership are excluded. Build dependencies and erased type imports therefore do not fail the check unless code from them reaches emitted chunks.

The forbidden owners are `frontend/` (`@odh-dashboard/internal`) and `packages/kserve/` (`@odh-dashboard/kserve`). Workspace packages resolved through `node_modules` and federation references to those packages are also checked. Shared dependencies may remain when they do not introduce forbidden runtime modules.

Unknown external runtime modules fail the strict check because the local build cannot establish their contents. Unset `MODEL_SERVING_REMOTE_ENTRY` and disable `RHAII_TILT_FIXTURES` before running. The audit uses the real production extension selection and optimizations; only its output directory and explicit build context differ from the normal production command.

The JSON report includes all audited modules and violations. Each violation records its chunks and one shortest active importer path where Rspack records an entry path. Missing importer paths do not exempt modules whose chunk membership proves emission. The boundary-edge table identifies active imports from allowed owners into forbidden owners, including reasons attached to concatenation containers.

Counts represent bundler module instances, including loader variants, rather than unique source files or byte attribution. Chunk membership is conservative evidence of inclusion; it does not prove that every export in a source module survives optimization or executes in the browser.

## Remaining Qualification

This check establishes the frontend bundle boundary. It does not identify every OpenShift-specific API assumption in otherwise allowed packages, inspect the Go BFF or container image, or prove that a cluster lifecycle succeeds on AKS.

Before declaring runtime independence complete:

1. Remove the remaining forbidden module paths and obtain a passing strict production audit.
2. Inspect production browser requests across supported flows and lazy routes, including dynamically fetched scripts or federation remotes that cannot be inspected by this local build.
3. Validate authentication, namespace discovery, permissions, gateway access, and deployment lifecycle against the production image on AKS, without OpenShift-only APIs.

The audit depends on Rspack statistics and the production distribution configuration. Its parser tests cover lazy chunks, concatenated modules, inactive reasons, child compilations, external references, and rejection of truncated or failed build graphs.
