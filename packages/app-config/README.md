# @odh-dashboard/app-config

Shared configuration and utilities for the ODH Dashboard application.

## Purpose

Provides runtime and build-time configuration values consumed across the frontend and package layer. Includes application-wide constants, environment variable handling, and configuration helpers.

## Usage

```ts
import { getAppConfig } from '@odh-dashboard/app-config';
```

## Testing

Both `pnpm run test-unit` and `pnpm run test-unit-coverage` run Jest followed by
offline subtree integration tests. Install the [test prerequisites](../../docs/dev-setup.md#test-prerequisites)
first. Jest arguments are forwarded unchanged, for example
`pnpm run test-unit --runInBand`; the subtree suite always runs after Jest succeeds.

## Contents

| Path | Description |
|------|-------------|
| `src/` | Configuration source modules |
| `scripts/` | Build-time configuration scripts |

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
