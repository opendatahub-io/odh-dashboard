# @odh-dashboard/plugin-core

Core plugin infrastructure and extension-point definitions for the ODH Dashboard modular architecture.

## Purpose

Defines the contracts that all modular packages must implement to integrate with the main dashboard shell. Provides hook types, registration helpers, and extension point interfaces used by Module Federation remotes.

## Key Exports

| Export | Description |
|--------|-------------|
| Extension types | TypeScript interfaces for all supported extension points |
| Registration helpers | Utilities for packages to declare their extensions |
| Hook utilities | React hooks for consuming extension points in the shell |

## Usage

```ts
import { defineExtension, useExtensions } from '@odh-dashboard/plugin-core';
```

> For full documentation see [`docs/guidelines.md`](../../docs/guidelines.md).
