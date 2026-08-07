# Module Federation

This document describes how Module Federation is implemented in ODH Dashboard.

For more information on Module Federation concepts, see [module-federation.io](http://module-federation.io).

## Overview

ODH Dashboard uses Module Federation to dynamically load remote modules at runtime, enabling a plugin-based architecture where external packages can extend the application.

## Frontend Implementation

### Architecture

The frontend implementation consists of several key components:

1. **Host Application**: The main ODH Dashboard application acts as the Module Federation host
2. **Remote Modules**: Federated packages that expose functionality to be consumed by the host
3. **Shared Dependencies**: Common libraries shared between host and remotes to avoid duplication
4. **Extension System**: A plugin system that allows remotes to register UI extensions

### Configuration Discovery

At this time, all known modules must exist in the monorepo. The system automatically discovers federated modules by scanning all workspace packages for a [`module-federation` configuration property](#module-federation-configuration) in their `package.json` files.

### Shared Dependencies

Shared module policy is centralized in `@odh-dashboard/app-config` and enforced by bundler plugins:

- **`OdhHostFederationPlugin`** — host (`frontend/`); import from `@odh-dashboard/app-config/rspack`
- **`OdhRemoteFederationPlugin`** — federated remotes; import from `@odh-dashboard/app-config/webpack`

These plugins configure shared modules, singleton flags, and version constraints so individual `moduleFederation.js` files do not maintain shared dependency lists manually. Entries from the default PatternFly / React / SDK map are shared only when they appear in that package's `package.json` `dependencies`. ODH packages are shared from workspace discovery (see table below), not gated on each remote's `dependencies`.

#### What is automatically shared

| Category | Modules | Notes |
|----------|---------|-------|
| React ecosystem | `react`, `react-dom`, `react-router`, `react-router-dom` | Singleton, eager on host; remotes use `import: false` |
| OpenShift SDK | `@openshift/dynamic-plugin-sdk`, `@openshift/dynamic-plugin-sdk-utils` | Singleton, eager on host; remotes use `import: false` |
| Query/params | `@tanstack/react-query`, `use-query-params` | In the default map; shared when present in that package's `dependencies` |
| PatternFly | `@patternfly/react-core`, `@patternfly/react-styles`, `@patternfly/react-tokens`, `@patternfly/react-icons`, `@patternfly/react-table`, `@patternfly/react-templates`, `@patternfly/react-topology`, `@patternfly/react-code-editor`, `@patternfly/react-charts`, `@patternfly/chatbot`, `@patternfly/react-component-groups`, `@patternfly/react-drag-drop`, `@patternfly/react-log-viewer`, `@patternfly/quickstarts`, `@patternfly/react-catalog-view-extension` | Singleton. `@patternfly/react-core` and `@patternfly/react-styles` are eager on host; remotes use `import: false` for those two; other listed packages allow remote fallback |
| ODH packages | Discovered via `npm query .workspace` | Shared as singletons. **Host-provided** (host `@odh-dashboard/*` dependency closure + packages that export `./extensions`): remotes use `import: false`. **Federated-only** packages (and their deps that are not host-provided): shared as singletons with import/fallback allowed |

#### Remotes and `import: false`

In federated mode, remotes set `import: false` on modules that must come from the host: React, routers, OpenShift SDK, `@patternfly/react-core`, `@patternfly/react-styles`, and host-provided ODH packages. Other shared PatternFly packages and federated-only `@odh-dashboard/*` packages remain singleton but may fall back to a remote-bundled copy. Standalone mode (`DEPLOYMENT_MODE=standalone`) skips `import: false`.

#### Additional shared modules

Host and remotes can pass `shared` for modules beyond the forced set. Keys already registered by the plugin always take priority and cannot be overridden.

## Module Federation Configuration

Each federated module must include a `module-federation` property in its `package.json` with the following structure:

### Configuration Properties

- **name** (string): The unique identifier for the federated module (camelCase). Must match the `name` passed to `OdhRemoteFederationPlugin`
- **remoteEntry** (string): The path to the remote entry file (typically `/remoteEntry.js`)
- **authorize** (boolean, optional): Whether requests to this module require authorization (defaults to false)
- **tls** (boolean, optional): Whether to use TLS for connections (defaults to true)
- **proxy** (array): Array of API proxy configurations for backend services
  - **path** (string): The URL path to proxy (e.g., `/api/v1/models`)
  - **pathRewrite** (string, optional): Path rewrite rule (defaults to empty string)
- **local** (object): Development server configuration
  - **host** (string, optional): Development host (defaults to `localhost`)
  - **port** (number): Development server port
- **service** (object): Production service configuration
  - **name** (string): Kubernetes service name. In standalone deployment mode, this should match the module's standalone Service name (e.g., `odh-dashboard-<slug>-ui`). In sidecar mode (legacy), this typically points to the shared `odh-dashboard` service.
  - **namespace** (string, optional): Kubernetes namespace (uses current namespace if not specified)
  - **port** (number): Service port

#### Proxy

The proxy configuration allows the module's frontend API requests to be routed to their respective Backend for Frontend (BFF). Since all requests first go through the dashboard's backend reverse proxy, it must be configured to know which paths belong to which module and how to forward the request.

When a federated module makes an API call, the request flows through the following path:

1. Module frontend makes API request (e.g., `/my-module/api/data`)
2. Dashboard backend receives the request and matches it against configured proxy paths
3. Backend forwards the request to the appropriate module's service
4. Response is returned back through the same proxy chain

The `proxy` array defines which API paths should be forwarded to the module's backend service:

```json
{
  "proxy": [
    {
      "path": "/my-module/api",
      "pathRewrite": "/api"
    }
  ]
}
```

In this example:

- Frontend requests to `/my-module/api/*` are intercepted by the dashboard backend
- The path is rewritten from `/my-module/api/*` to `/api/*`
- The rewritten request is forwarded to the module's backend service
- This allows the module's backend to serve APIs at `/api/*` while the frontend accesses them at `/my-module/api/*`

#### Security Considerations

- Use `authorize: true` for modules that require authentication. By setting this property, the backend reverse proxy will forward the user token in the header `Authorization: Bearer <token>`
- Validate all shared dependencies and their versions
- Ensure remote modules are served from trusted sources
- Consider implementing Content Security Policy (CSP) headers

### Example Configuration

```json
{
  "name": "@odh-dashboard/my-module",
  "module-federation": {
    "name": "myModule",
    "remoteEntry": "/remoteEntry.js",
    "authorize": true,
    "tls": true,
    "proxy": [
      {
        "path": "/my-module/api",
        "pathRewrite": "/api"
      }
    ],
    "local": {
      "host": "localhost",
      "port": 9000
    },
    "service": {
      "name": "odh-dashboard-my-module-ui",
      "namespace": "my-namespace",
      "port": 8080
    }
  }
}
```

## Backend Implementation

The backend automatically configures proxies for federated modules based on their configuration:

### Proxy Setup

For each configured module, the backend sets up:

1. **Static Asset Proxy**: Serves the module's built JavaScript files
   - Pattern: `/_mf/{moduleName}/*`
   - Routes to the module's development server or production service

2. **API Proxy**: Forwards API requests to the module's backend service
   - Uses the `proxy` configuration from the module-federation config
   - Supports path rewriting and authorization

In standalone deployment mode (primary), each module runs as its own Kubernetes Service. The proxy routes requests to the module's standalone Service (e.g., `odh-dashboard-gen-ai-ui`) rather than to localhost ports within a shared pod. The `federation-config` ConfigMap provides the Fastify backend with the service name, namespace, and port for each enabled module.

## Federation Configuration in Production

The `federation-config` ConfigMap is the bridge between the Dashboard Module Controller (operator) and the frontend's Module Federation system. It tells the Fastify backend how to proxy requests to each module's BFF and where to find each module's `remoteEntry.js`.

### How it Works

In standalone deployment mode, the operator dynamically builds the `federation-config` ConfigMap based on which modules are currently enabled. The process works as follows:

1. **Module resolution**: The operator evaluates DSC component gates, CR overrides, and inter-module dependencies to determine which modules are enabled.
2. **ConfigMap generation**: For each enabled module, the operator creates an entry in the ConfigMap containing:
   - **Service name**: The module's standalone Kubernetes Service (e.g., `odh-dashboard-gen-ai-ui`)
   - **Namespace**: The namespace where the module is deployed
   - **Port**: The container port the module listens on
   - **Proxy paths**: API paths that should be forwarded to the module's BFF
   - **Remote entry path**: Where to find `remoteEntry.js` for the module's frontend
3. **Rolling restart**: The operator computes a content hash of the ConfigMap and sets it as an annotation on the main dashboard Deployment. When the ConfigMap changes (modules enabled/disabled), the annotation changes and triggers a rolling restart of the dashboard pods, ensuring the Fastify backend picks up the new configuration.

### ConfigMap Structure

Each module entry in the ConfigMap follows this structure:

```json
{
  "name": "genAi",
  "remoteEntry": "/remoteEntry.js",
  "authorize": true,
  "tls": true,
  "proxy": [
    {
      "path": "/gen-ai/api",
      "pathRewrite": "/api"
    }
  ],
  "service": {
    "name": "odh-dashboard-gen-ai-ui",
    "namespace": "redhat-ods-applications",
    "port": 8143
  }
}
```

### Module Enable/Disable Flow

When a module is enabled or disabled:

1. The `Dashboard` CR spec changes (or a DSC component becomes available/unavailable)
2. The operator reconciles and re-evaluates module statuses
3. The `federation-config` ConfigMap is regenerated with only the enabled modules
4. The content hash annotation on the dashboard Deployment changes
5. Kubernetes triggers a rolling restart of dashboard pods
6. The Fastify backend reads the updated ConfigMap on startup and registers/deregisters proxy routes accordingly

## Extension System

Federated modules can extend the host application by exposing extensions through the `./extensions` export. For comprehensive information about the extension system, extension points, and best practices, see [Extensibility Documentation](./extensibility.md).

### Exposing Extensions

Your module's webpack configuration must expose extensions:

```javascript
// webpack config (packages/my-module/frontend/config/moduleFederation.js)
const { OdhRemoteFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhRemoteFederationPlugin({
      name: 'myModule',
      packageJson: require('../package.json'),
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
    }),
  ],
};
```

### Extension Format

Extensions should export an array of extension objects:

```typescript
// src/odh/extensions.ts
import type { Extension } from '@openshift/dynamic-plugin-sdk';

const extensions: Extension[] = [
  {
    type: 'app.route',
    properties: {
      path: '/my-module',
      component: () => import('./MyModuleComponent'),
    },
  },
  // ... more extensions
];

export default extensions;
```

For detailed information about:
- Extension point types and naming conventions
- Code references and lazy loading
- Extension flags and feature gating
- Helper components like `LazyCodeRefComponent`
- Best practices for extension design

Please refer to the [Extensibility Documentation](./extensibility.md).

## Webpack Configuration

### Required Dependencies

In the remote's **frontend** `package.json`:

```bash
npm install --save-dev @module-federation/enhanced
```

In the module's **parent** `package.json`, add `@odh-dashboard/app-config` as a `devDependency` (resolved via workspace hoisting when the frontend webpack config requires it):

```json
{
  "devDependencies": {
    "@odh-dashboard/app-config": "*"
  }
}
```

`@odh-dashboard/app-config` exports TypeScript source directly — there is no separate build step. Consumers require **Node.js 22.18.0+** so Node can load those `.ts` entrypoints via native type stripping.

### Remote Configuration

Remote modules use `OdhRemoteFederationPlugin`, which handles shared module configuration automatically:

```javascript
// packages/my-module/frontend/config/moduleFederation.js
const { OdhRemoteFederationPlugin } = require('@odh-dashboard/app-config/webpack');

module.exports = {
  moduleFederationPlugins: [
    new OdhRemoteFederationPlugin({
      name: 'myModule',           // Must match package.json module-federation.name
      packageJson: require('../package.json'),
      exposes: {
        './extensions': './src/odh/extensions',
        './extension-points': './src/odh/extension-points',
      },
      // Optional: add extra shared modules beyond the forced set
      shared: {},
    }),
  ],
};
```

### Host Configuration

The host uses the rspack variant of `OdhHostFederationPlugin`. The snippet below is
abridged: discovery of `mfConfig` from workspace `module-federation` fields (or
`MODULE_FEDERATION_CONFIG`) lives in `frontend/config/moduleFederation.js` and is
omitted here.

```javascript
// frontend/config/moduleFederation.js (abridged — not a complete runnable script)
const { OdhHostFederationPlugin } = require('@odh-dashboard/app-config/rspack');

const updateTypes = !!process.env.MF_UPDATE_TYPES;
// const mfConfig = getModuleFederationConfig(); // workspace / ENV discovery

const remotes = updateTypes
  ? mfConfig.reduce((acc, config) => {
      if (!config.backend) return acc;
      const { localService, remoteEntry, service } = config.backend;
      const host = localService?.host ?? 'localhost';
      const port = localService?.port ?? service?.port;
      if (port == null || !remoteEntry) return acc;
      acc[`@mf/${config.name}`] = `${config.name}@http://${host}:${port}${remoteEntry}`;
      return acc;
    }, {})
  : undefined;

module.exports = {
  moduleFederationPlugins: [
    new OdhHostFederationPlugin({
      packageJson: require('../package.json'),
      remotes,
      dts: updateTypes,
    }),
  ],
};
```

## Development Workflow

### Creating a New Federated Module

1. Add camelCase `module-federation` configuration to the parent `package.json`
2. Add `@module-federation/enhanced` to the frontend `package.json` `devDependencies`
3. Add `@odh-dashboard/app-config` to the parent `package.json` `devDependencies` (requires Node.js 22.18.0+; no separate app-config build)
4. Create a `moduleFederation.js` using `OdhRemoteFederationPlugin` from `@odh-dashboard/app-config/webpack`
5. Create extensions and extension-points files under `src/odh/`
6. Build and serve your module locally

### Local Development

1. Start your federated module's development server
2. Start the main ODH Dashboard application
3. The dashboard will automatically discover and load your module

## Sharing Library Packages

The monorepo contains two types of packages:

- **Federated remotes** (webpack + MF config): Packages like `gen-ai`, `maas`, `mlflow` that build separately and the host loads at runtime.
- **Library packages** (no webpack, no MF config): Packages like `llmd-serving`, `model-serving`, `kserve`, `plugin-core` that expose raw TypeScript via `package.json` `exports`.

When a federated remote imports from a library package, webpack must compile the library's TypeScript and the code can end up duplicated between the host and remote bundles. Host-provided ODH packages (on the host dependency graph or that export `./extensions`) are shared as singletons with `import: false` on remotes so the remote consumes the host copy.

### Webpack Exclude Regex

All `webpack.common.js` files use a negative lookahead in the TS/JS rule to allow `@odh-dashboard/*` packages to be compiled:

```javascript
exclude: [/node_modules\/(?!@odh-dashboard)/, /__tests__/, /__mocks__/],
```

This ensures webpack can parse TypeScript from `@odh-dashboard/*` packages resolved through `node_modules`.

### Adding a New Library Package

When creating a new `@odh-dashboard/*` library package that will be consumed by federated remotes:

1. Add the package to the monorepo under `packages/`. npm workspaces will hoist it into `node_modules/@odh-dashboard/`.
2. For remotes to use `import: false` against it, the package must be host-provided: either appear in the host's `@odh-dashboard/*` dependency closure, or export `./extensions` (included in the host via the virtual `plugin-extensions` module). Otherwise it is only shared as a singleton with import/fallback if reached from a federated package's dependency tree.
3. Ensure the consumer's `webpack.common.js` has the `node_modules\/(?!@odh-dashboard)` exclude pattern.

## Troubleshooting

### Common Issues

1. **Module not loading**: Verify the camelCase module name matches between `package.json` `module-federation.name` and `OdhRemoteFederationPlugin`
2. **Shared dependency conflicts**: Confirm the module is listed in that package's `dependencies` (plugins only share packages present there) and that `@odh-dashboard/app-config` is installed as a parent `devDependency`
3. **Proxy issues**: Check that the backend service is running and accessible
4. **Asset loading issues**: If you see failing requests for `__federation_expose_` files without the module name in the path, add `output.publicPath = 'auto'` to your webpack configuration
5. **Module parse failed for `@odh-dashboard/*` packages**: Ensure `webpack.common.js` uses `exclude: [/node_modules\/(?!@odh-dashboard)/]` instead of `exclude: [/node_modules/]` in the TS/JS rule
