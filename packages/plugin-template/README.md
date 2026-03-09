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
4. Add your package to the Turbo pipeline (`turbo.json`) and BOOKMARKS.md.
5. Run `/docs.package` to generate `docs/overview.md` and register in BOOKMARKS.

## Structure

| Path | Description |
|------|-------------|
| `src/` | Feature source code |
| `Dockerfile.workspace` | BFF container definition |
| `jest.config.ts` | Jest setup (extends shared config) |
| `tsconfig.json` | TS config (extends shared config) |

## Development

```bash
npx turbo run build --filter=@odh-dashboard/template
npx turbo run test  --filter=@odh-dashboard/template
```

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
