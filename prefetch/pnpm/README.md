# prefetch/pnpm — hermetic pnpm CLI bootstrap

This package installs the pinned pnpm CLI inside Konflux image builds without network
access, while keeping pnpm a normal npm package in the SBOM.

## Why it exists

- `npm install -g pnpm` needs network access, which hermetic builds do not have.
- Prefetching the pnpm tarball as a _generic_ artifact records a raw registry URL in the
  SBOM, which fails Conforma `sbom_spdx.allowed_package_sources`.

## How it works

- PipelineRuns declare `{"path": "prefetch/pnpm", "type": "npm"}` so Hermeto caches pnpm
  like any other npm dependency.
- Dockerfiles run `npm ci --prefix ./prefetch/pnpm` and put
  `prefetch/pnpm/node_modules/.bin` on `PATH` for the workspace install.

## Updating (only when upgrading pnpm)

1. Bump the `pnpm` version in `package.json`, then run `npm install` in this directory to
   regenerate `package-lock.json` (integrity updates automatically).
2. Match `packageManager` in the root `package.json`.
3. Update the `pnpm --version` assertion in the Dockerfiles.

## Do not

- Do not delete this folder; hermetic builds would lose their pnpm CLI.
- Do not add other dependencies to it.
- Keep it outside the pnpm workspace — that is intentional.
