---
description: Module Federation — how modules are exposed and consumed across packages in the modular architecture
globs: "**/config/moduleFederation.js,**/config/webpack.*.js,**/module-federation.ts,**/useAppExtensions.ts,**/ExtensibilityContext.tsx,**/extensions.ts,**/extension-points.ts,**/odh/extensions.ts,**/odh/extension-points.ts"
alwaysApply: false
---

# Module Federation — Modular Architecture

> **Canonical docs** — read these first for full details:
> - [docs/module-federation.md](../../docs/module-federation.md) — MF config schema, shared deps, proxy flow, webpack setup, troubleshooting
> - [docs/extensibility.md](../../docs/extensibility.md) — extension points, code refs, lazy loading, helper components (`LazyCodeRefComponent`, `HookNotify`), hooks (`useExtensions`, `useResolvedExtensions`), type guards, best practices

This rule provides a quick reference for working with Module Federation files. Defer to the docs above for full explanations and code examples.

## Architecture

ODH Dashboard uses Webpack Module Federation (`@module-federation/enhanced`) to dynamically load remote modules at runtime. The host (`frontend/`) discovers and loads remote packages (`packages/*/`) that expose extensions via a plugin system.

| Role | Location | MF Name |
|---|---|---|
| **Host** | `frontend/` | `host` |
| **Remotes** | `packages/*/frontend/` | camelCase (e.g., `genAi`, `modelRegistry`, `maas`) |

The host never exposes modules (`exposes: {}`). Remotes expose `./extensions` and optionally `./extension-points`.

## Registering a Federated Module

See [docs/module-federation.md](../../docs/module-federation.md) for the full config schema and webpack template. In brief:

1. **`package.json`** — add a `module-federation` key (name, remoteEntry, proxy, local port, service) and `"exports": { "./extensions": "..." }`
2. **`moduleFederation.js`** — configure `ModuleFederationPlugin` with `name`, `exposes`, `shared` singletons, `runtime: false`
3. **`src/odh/extensions.ts`** — export a default array of `Extension` objects
4. **Static bundling** — `discoverPluginPackages.js` finds `./extensions` exports and generates `plugin-extensions.ts` at build time

## Shared Dependencies

All remotes **must** share as singletons: `react`, `react-dom`, `react-router`, `react-router-dom`, `@patternfly/react-core`.

Include if used: `@openshift/dynamic-plugin-sdk`, `@openshift/dynamic-plugin-sdk-utils`, `@odh-dashboard/plugin-core`.

All use `singleton: true` and `requiredVersion: deps['<package>']` from the local `package.json`.

## Runtime Loading Flow

1. Backend injects `mfRemotesJson` into `index.html` as `<script id="mf-remotes-json">` (prod) or `DefinePlugin` sets `MF_REMOTES` (dev)
2. `useAppExtensions` calls `init()` from `@module-federation/runtime` with remote entry URLs at `/_mf/{name}/remoteEntry.js`
3. Each remote's `./extensions` is loaded via `loadRemote('{name}/extensions')`
4. Failed loads are caught gracefully — the remote returns `[]` instead of crashing
5. Static and federated extensions merge in `ExtensibilityContext`
6. `PluginStore` makes all extensions available via `useExtensions()` / `useResolvedExtensions()`

## Entry Point Pattern

Both host and remotes use an async bootstrap — **required** for Module Federation shared scope negotiation:

```typescript
// src/index.ts — thin entry
import('./bootstrap');
// src/bootstrap.tsx — actual app mount
```

## Conventions

- **MF name** is camelCase matching `module-federation.name` in `package.json` and `name` in `ModuleFederationPlugin`
- **Remote entry** is always `/remoteEntry.js`
- **Exposes** use `./extensions` and `./extension-points` — not arbitrary module paths
- **Proxy paths** follow `/package-name/api` → `/api` rewrite pattern
- **Local dev ports** are unique per package (9100+)
- Set `runtime: false` on all remotes
- Set `output.publicPath = 'auto'` in webpack
- Lazy-load components in extensions via `component: () => import('./MyComponent')` (CodeRef pattern)
- Use `@mf/*` TypeScript path alias for typed imports of remote modules (types in `frontend/@mf-types/`)

## Key Files

| Purpose | Path |
|---|---|
| Host MF config | `frontend/config/moduleFederation.js` |
| Plugin discovery | `frontend/config/discoverPluginPackages.js` |
| Extensions generator | `frontend/config/generateExtensionsPlugin.js` |
| Runtime init + loading | `frontend/src/plugins/useAppExtensions.ts` |
| PluginStore provider | `frontend/src/plugins/ExtensibilityContext.tsx` |
| MF_REMOTES constant | `frontend/src/utilities/const.ts` |
| Backend proxy setup | `backend/src/routes/module-federation.ts` |
| Backend remotes injection | `backend/src/routes/root.ts` |
| Shared MF config util | `packages/app-config/src/module-federation.ts` |
| Prod ConfigMap | `manifests/modular-architecture/federation-configmap.yaml` |
| Extension point types | `packages/plugin-core/src/extension-points/` |
| Full MF docs | `docs/module-federation.md` |
| Extensibility docs | `docs/extensibility.md` |
