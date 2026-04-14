# @odh-dashboard/tsconfig

Shared TypeScript compiler configurations for all ODH Dashboard packages.

## Purpose

Provides base `tsconfig.json` presets that enforce consistent compiler options (strict mode, target, module resolution) across the monorepo. Packages extend the appropriate preset rather than defining their own from scratch.

## Usage

In your package `tsconfig.json`:

```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json",
  "compilerOptions": { "outDir": "dist" },
  "include": ["src"]
}
```

## Presets

| File | Use case |
|------|----------|
| `tsconfig.json` | Default browser/React packages |
| `tsconfig.node.json` | Node.js scripts and BFF servers |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
