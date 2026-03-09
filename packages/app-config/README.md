# @odh-dashboard/app-config

Shared configuration and utilities for the ODH Dashboard application.

## Purpose

Provides runtime and build-time configuration values consumed across the frontend and package layer. Includes application-wide constants, environment variable handling, and configuration helpers.

## Usage

```ts
import { getAppConfig } from '@odh-dashboard/app-config';
```

## Contents

| Path | Description |
|------|-------------|
| `src/` | Configuration source modules |
| `scripts/` | Build-time configuration scripts |

## Development

```bash
npx turbo run build --filter=@odh-dashboard/app-config
npx turbo run test  --filter=@odh-dashboard/app-config
```

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
