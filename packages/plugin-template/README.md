# @odh-dashboard/template

Starter template for creating new modular packages in the ODH Dashboard monorepo.

## Purpose

Provides a ready-to-use scaffold for adding a new feature package. Includes pre-configured TypeScript, ESLint, Jest, a Dockerfile for the BFF sidecar, and Module Federation entry point wiring.

## Creating a New Package

1. Copy this directory:
   ```bash
   cp -r packages/plugin-template packages/<your-package-name>
   ```
2. Update `package.json` — set `name`, `description`, and dependencies.
3. Update `Dockerfile.workspace` if your package needs a custom BFF image.
4. Add your package to the Turbo pipeline (`turbo.json`) and `BOOKMARKS.md`.
5. Run `/create-package-doc` to generate `docs/overview.md` and register in `BOOKMARKS.md`.

## Structure

| Path | Description |
|------|-------------|
| `src/` | Feature source code |
| `Dockerfile.workspace` | BFF container definition |
| `jest.config.ts` | Jest setup (extends shared config) |
| `tsconfig.json` | TS config (extends shared config) |

## Development

This is a starter template with no active scripts (`scripts__options` in `package.json`).
After copying and renaming, uncomment the scripts block and run:

```bash
npx turbo run build --filter=@odh-dashboard/<your-package-name>
npx turbo run test-unit --filter=@odh-dashboard/<your-package-name>
```

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
