# ODH federation integration

This directory contains Open Data Hub (ODH) Dashboard-specific integration for
the Model Registry frontend.

## Ownership and sync boundary

`packages/model-registry/upstream/` is synced from the upstream [`kubeflow/hub`](https://github.com/kubeflow/hub) repository
(formerly `kubeflow/model-registry`), source path `clients/ui`).

Files in `src/odh/` are intentionally maintained in ODH Dashboard and are not
expected to exist in the upstream repository. They contain product-specific
federation behavior, including Dashboard host integration, ODH API hooks, and
ODH-specific namespace resolution.

Keeping this layer separate prevents ODH-only changes from creating recurring
conflicts during upstream subtree synchronization.

## Where to make changes

- Make generic Model Registry UI and BFF changes in the upstream Model Registry
  repository. They are brought here through the subtree sync.
- Make ODH Dashboard federation, host-hook, RBAC-dependent, or
  product-specific behavior changes in this directory.
- Do not move ODH-only wrappers into the upstream repository solely to make
  them part of the subtree.

For example, wrappers in this directory may use Dashboard host APIs such as
`useFetchAIHub`. Such APIs are not available to standalone or Kubeflow
deployments and must remain ODH-specific.

## Sync workflow

The `@odh-dashboard/model-registry` package declares the upstream source and
the last synchronized commit in `packages/model-registry/package.json` under
the `subtree` field.

The `Model Registry Upstream Sync` GitHub Actions workflow runs every Monday
and Wednesday at 08:00 UTC. It invokes:

```sh
pnpm --filter @odh-dashboard/model-registry run update-subtree

A clean sync opens or updates an automated pull request. If conflicts occur,
resolve them while preserving this directory's ODH-specific ownership
boundary.