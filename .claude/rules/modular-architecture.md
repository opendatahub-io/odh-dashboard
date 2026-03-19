---
description: Modular Architecture — Module Federation, plugin/extension system, and how packages integrate with the host app
globs: "packages/**,frontend/src/plugins/**,frontend/config/**"
alwaysApply: false
---

# Modular Architecture — ODH Dashboard

> **Canonical docs** — read these first for full details:
> - [docs/module-federation.md](../../docs/module-federation.md) — MF config properties, shared deps, proxy flow, webpack setup, troubleshooting
> - [docs/extensibility.md](../../docs/extensibility.md) — extension points, code refs, lazy loading, helper components, hooks, type guards, best practices

This rule summarises the architecture at a glance and lists key files. Defer to the docs above for full explanations.

## Quick architecture summary

The host app (`frontend/`) uses Webpack Module Federation (`@module-federation/enhanced`) to load remote packages at runtime. Remotes are discovered automatically from workspace packages that declare a `module-federation` key in `package.json`.

| Role | Location | MF Name |
|---|---|---|
| **Host** | `frontend/` | `host` |
| **Remotes** | `packages/*/frontend/` | camelCase (e.g., `genAi`, `modelRegistry`, `maas`) |

### Runtime loading flow

1. Backend injects `mfRemotesJson` into the HTML template (`backend/src/routes/root.ts`)
2. `useAppExtensions()` calls `init()` with remotes at `/_mf/{name}/remoteEntry.js`
3. `loadRemote('{name}/extensions')` fetches each remote's extensions
4. Backend proxies `/_mf/{name}/*` to each module's service (`backend/src/routes/module-federation.ts`)
5. Static (`pluginExtensions`) and federated (`appExtensions`) extensions merge in `ExtensibilityContext`
6. `PluginStore` makes all extensions available via `useExtensions()` / `useResolvedExtensions()`

> **Security**: Treat `mfRemotesJson` as a privileged config surface.
> - Only allow remotes from an explicit backend allowlist (name + origin + path).
> - Enforce HTTPS origins in non-local environments.
> - Reject unknown/unsigned remote entries and fail closed.

## Extension point types (quick reference)

Full details in [docs/extensibility.md](../../docs/extensibility.md).

| Extension Point | Type | Purpose |
|---|---|---|
| `app.area` | `AreaExtension` | Feature area definition with flags |
| `app.navigation/href` | `HrefNavItemExtension` | Sidebar nav link |
| `app.navigation/section` | `NavSectionExtension` | Sidebar nav group |
| `app.route` | `RouteExtension` | Page route with lazy component |
| `app.status-provider` | `StatusProviderExtension` | Status hook for nav items |
| `app.project-details/tab` | `ProjectDetailsTab` | Tab in project details |
| `app.project-details/overview-section` | `OverviewSectionExtension` | Section on project overview |

Naming convention: `namespace.section[/sub-section]` (e.g., `model-registry.registered-models/table-column`).

Packages can define their own extension points in `frontend/src/odh/extension-points/`.

## How packages register as plugins

1. Package exports `./extensions` in `package.json` `exports` field
2. `discoverPluginPackages.js` discovers them via `npm query .workspace`
3. At build time, `GenerateExtensionsPlugin` creates `plugin-extensions.ts` importing all package extensions
4. At runtime, federated modules load extensions via `loadRemote('{name}/extensions')`
5. `ExtensibilityContextProvider` creates a `PluginStore` with all extensions

## Feature gating

Extensions use `flags.required` / `flags.disallowed` arrays referencing `SupportedArea` values. `PluginStore.isExtensionInUse()` filters extensions by checking all required flags are `true` and all disallowed flags are `false`.

`SupportedArea` is defined in `frontend/src/concepts/areas/types.ts`. Each area maps to feature flags (from `OdhDashboardConfig`), required DSC components, and reliant areas in `frontend/src/concepts/areas/const.ts`.

## Standard package structure

```text
packages/<name>/
├── package.json              # module-federation, exports ./extensions
├── extensions.ts             # Root extensions (or re-exports from frontend/src/odh/)
├── frontend/
│   ├── config/
│   │   ├── moduleFederation.js
│   │   └── webpack.{common,dev,prod}.js
│   └── src/
│       ├── odh/
│       │   ├── extensions.ts       # Extension definitions
│       │   └── extension-points/   # Custom extension point types
│       └── app/                    # Application code
├── bff/                      # Go BFF (when needed)
└── Makefile
```

## Key files

| Purpose | Path |
|---|---|
| Host MF config | `frontend/config/moduleFederation.js` |
| Plugin discovery | `frontend/config/discoverPluginPackages.js` |
| Extensions codegen | `frontend/config/generateExtensionsPlugin.js` |
| Extensions loader | `frontend/src/plugins/useAppExtensions.ts` |
| Plugin store | `packages/plugin-core/src/core/plugin-store.ts` |
| Extension points | `packages/plugin-core/src/extension-points/` |
| Area flags | `frontend/src/concepts/areas/types.ts`, `const.ts` |
| Backend MF proxy | `backend/src/routes/module-federation.ts` |
| Backend remotes injection | `backend/src/routes/root.ts` |
| Shared MF config util | `packages/app-config/src/module-federation.ts` |
| Prod ConfigMap | `manifests/modular-architecture/federation-configmap.yaml` |
| Full MF docs | `docs/module-federation.md` |
| Extensibility docs | `docs/extensibility.md` |
