# RHAII Production Runtime Audit

The audit builds both frontend bundles shipped by the [RHAII Dockerfile](../Dockerfile): the RHAII host and the Model Serving federation remote. It inventories source modules assigned to emitted chunks, including transitive imports and lazy chunks, to identify legacy dashboard frontend and KServe frontend code in either bundle.

## Run the Audit

From `distributions/rhaii`, with workspace dependencies installed:

```bash
pnpm run audit:runtime
```

This command performs a fresh optimized build and writes these ignored artifacts under `dist/runtime-audit/`:

| Artifact | Contents |
| --- | --- |
| `host/assets/`, `model-serving/assets/` | Each production build's output, including source maps |
| `host/stats.json`, `model-serving/stats.json` | Complete Rspack module, reason, and chunk statistics for each build |
| `report.json` | Combined module and owner inventory, chunk membership, violations, importer paths, and build metadata |
| `report.md` | Per-build counts, combined summary, imports crossing the boundary, and example importer paths |

The report records the Git revision, working tree state (including untracked files), and each build's hash and Rspack version. Commit the changes being measured, verify `git status --short` is empty, and run the audit from that checkout for reproducible evidence tied to a revision. Previous reports are removed before each run so a failed build cannot leave a stale passing result. Both builds must succeed and provide complete statistics before a report is written.

Report mode exits successfully when the build and audit complete, even if the report says **FAIL**. Build errors, incomplete statistics, and unsupported remote configurations fail the command.

For a strict assertion:

```bash
pnpm run check:runtime-boundary
```

This repeats both production builds and exits with status 1 if either contains forbidden modules. It has no baseline exemptions. It remains separate from the normal build and CI until the remaining dependencies in the [follow-up work list](runtime-audit-baseline.md) are removed.

## Production Profile

| Build | Configuration | Image settings |
| --- | --- | --- |
| Host | [RHAII production config](../config/rspack.prod.js) | `MODEL_SERVING_REMOTE_ENTRY=/_mf/modelServing/remoteEntry.js`, Tilt fixtures disabled |
| Model Serving | [Remote production config](../../../packages/model-serving/frontend/config/rspack.prod.js) | `DEPLOYMENT_MODE=federated`, `PUBLIC_PATH=/_mf/modelServing/` |

Each configuration runs in its own process and workspace directory so dotenv loading and federation discovery use the correct context. Outputs go to the audit directory. The host retains the production remote registration and extension-loading branch; the remote's exposed extensions and lazy chunks are included in the inventory.

The same-origin remote is treated as inspected only after its local production build succeeds, emits `remoteEntry.js`, and is audited with the same parser. This verifies the contents available at the image's remote URL; it does not exempt forbidden code inside that remote. The report maps `main.0` chunk/module identifiers to the host and `main.1` identifiers to Model Serving. Module instances shared by source path across the two compilations remain separate.

## What the Check Measures

The audit includes modules in initial and lazy chunks, recursively includes constituents of concatenated modules, and merges duplicate module records. Modules without emitted chunk membership are excluded. Build dependencies and erased type imports therefore do not fail the check unless code from them reaches emitted chunks.

The forbidden owners are `frontend/` (`@odh-dashboard/internal`) and `packages/kserve/` (`@odh-dashboard/kserve`). Workspace packages resolved through `node_modules` and federation references to those packages are also checked. Shared dependencies may remain when they do not introduce forbidden runtime modules.

Unknown external runtime modules fail the strict check because the local build cannot establish their contents. Leave `MODEL_SERVING_REMOTE_ENTRY` unset to use the image default, or set it to exactly `/_mf/modelServing/remoteEntry.js`. Other URLs and enabled Tilt fixtures are rejected. Same-origin URLs are not automatically trusted: only the exact Model Serving binding backed by the freshly audited local build is verified.

The JSON report includes all audited modules and violations. Each violation records its chunks and one shortest active importer path where Rspack records an entry path. Missing importer paths do not exempt modules whose chunk membership proves emission. The boundary-edge table identifies active imports from allowed owners into forbidden owners, including reasons attached to concatenation containers.

Counts represent bundler module instances, including loader variants and separate instances in the host and remote, rather than unique source files or byte attribution. Dependencies nested beneath a legacy package are attributed to their own innermost package. Chunk membership is conservative evidence of inclusion; it does not prove that every export in a source module survives optimization or executes in the browser. Use the generated report for current counts instead of maintaining a numeric snapshot in this guide.

## Remaining Qualification

This check establishes the frontend bundle boundary. It does not identify every OpenShift-specific API assumption in otherwise allowed packages, inspect the Go BFF or container image, or prove that a cluster lifecycle succeeds on AKS.

Before declaring runtime independence complete:

1. Remove the remaining forbidden module paths in both builds and obtain a passing strict production audit.
2. Inspect production browser requests across supported flows and lazy routes, including the audited Model Serving remote's loading and any additional dynamically fetched code outside these two builds.
3. Validate authentication, namespace discovery, permissions, gateway access, and deployment lifecycle against the production image on AKS, without OpenShift-only APIs.

The audit depends on Rspack statistics and the host and remote production configurations. Tests cover lazy chunks, concatenated modules, federation container entries, nested package ownership, external references, failure propagation from the remote, and rejection of missing or incomplete evidence. A cross-file test checks that the audit profile matches the Dockerfile's remote entry, deployment mode, public path, and workspace directories.
