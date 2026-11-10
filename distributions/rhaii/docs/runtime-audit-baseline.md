# RHAII Runtime Audit Follow-up

Use the [production runtime audit](runtime-audit.md) to obtain current module counts and importer paths for both bundles shipped in the RHAII image. Generate evidence from a clean committed checkout and retain its reports with the Git revision and both build hashes. Counts are intentionally kept out of this maintained work list because they change with extraction work and dependency updates.

## Dependency Cleanup

- Remove KServe frontend registration and its transitive dependencies when the replacement serving integration is ready.
- Remove the legacy application settings and dashboard configuration paths reached through shared hardware profiles. Move runtime constants and enums to their owning shared package where needed.
- Replace the legacy workload and Kueue status dependencies used by LLMD deployment watching.
- Replace the legacy gateway proxy helper while preserving the required transport behavior.
- Remove legacy settings UI and permission helpers from emitted LLMD paths, or exclude settings outside the supported production scope. Preserve permission enforcement when replacing shared access checks.
- Inspect the Model Serving remote's own legacy imports and shared-module fallback code. Removing a path from the host does not remove a separate emitted instance from the remote.

Re-run the audit after each extraction: removing one importer can leave the same forbidden module reachable through another or through the other bundle. Use module identity and importer paths to plan changes; counts describe bundler instances and do not measure bundle size or user impact.

## Regression Prevention

Add a CI ratchet after agreeing on a reproducible production profile and baseline policy. Keep the zero-violation strict check as the completion goal. A count-only ratchet can miss replacing an old violation with a new one, so consider comparing module identities as well as counts.

## Runtime Qualification

OpenShift API independence, production browser/network checks, and deployment lifecycle validation on AKS remain required. Audit coverage includes the locally built Model Serving remote; arbitrary runtime downloads remain outside the two-build inventory.
