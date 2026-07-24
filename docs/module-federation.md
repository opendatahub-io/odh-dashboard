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

Shared module policy is centralized in `@odh-dashboard/app-config` and enforced by two webpack plugins:

- **`OdhHostFederationPlugin`** — used by the host (`frontend/`)
- **`OdhRemoteFederationPlugin`** — used by all federated remotes

These plugins automatically configure the correct shared modules, singleton flags, and version constraints so individual `moduleFederation.js` files do not need to maintain shared dependency lists manually.

#### What is automatically shared

| Category | Modules | Notes |
|----------|---------|-------|
| React ecosystem | `react`, `react-dom`, `react-router`, `react-router-dom` | Singleton, eager on host |
| OpenShift SDK | `@openshift/dynamic-plugin-sdk`, `@openshift/dynamic-plugin-sdk-utils` | Singleton, eager on host |
| Query/params | `@tanstack/react-query`, `use-query-params` | Singleton (opt-in via `additionalShared`, not enabled by default) |
| PatternFly JS | `@patternfly/react-core`, `react-icons`, `react-table`, `react-templates`, `react-topology`, `react-code-editor`, `react-charts`, `chatbot`, `react-component-groups`, `react-drag-drop`, `react-log-viewer`, `quickstarts`, `react-catalog-view-extension` | Singleton, whole-package |
| ODH packages | All `@odh-dashboard/*` runtime packages (including `internal`) | Discovered automatically via `npm query .workspace` |

#### CSS ownership

**Only the host owns PatternFly CSS.** The remote plugin discovers all `.css` files within `@patternfly/react-core`, `@patternfly/react-styles`, and `@patternfly/patternfly` and aliases each file to `false` so remotes never bundle PF stylesheets. JS class-name-map modules from these packages remain resolvable. This prevents CSS load-order issues in Module Federation.

#### Remotes use `import: false`

Remotes are configured with `import: false` on forced shared modules. This means they cannot bundle their own copy — they must consume from the host's share scope at runtime.

#### Additional shared modules

Remotes can pass `additionalShared` to add extra shared modules beyond the forced set. Forced keys (react, PF, ODH packages) always take priority and cannot be overridden.

### Future: Dynamic PatternFly module federation

The current implementation shares PatternFly as whole packages. A follow-up can add per-component sharing via PF's `dist/dynamic-modules.json` to reduce host vendor bundle size. The plugin architecture supports adding this transparently without changes to remote configs.

## Module Federation Configuration

Each federated module must include a `module-federation` property in its `package.json` with the following structure:

### Configuration Properties

- **name** (string): The unique identifier for the federated module. Must match the `name` property in the module's webpack `ModuleFederationPlugin` configuration
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
  - **name** (string): Kubernetes service name
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
    "name": "my-module",
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
      "name": "my-module-ui-service",
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

Install the required packages:

```bash
npm install --save-dev @module-federation/enhanced
```

Ensure your module's parent `package.json` includes `@odh-dashboard/app-config` as a dependency:

```json
{
  "dependencies": {
    "@odh-dashboard/app-config": "*"
  }
}
```

### Remote Configuration

Remote modules use `OdhRemoteFederationPlugin` which handles all shared module configuration automatically:

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
      additionalShared: {},
    }),
  ],
};
```

### Host Configuration

The host uses `OdhHostFederationPlugin`:

```javascript
// frontend/config/moduleFederation.js
const { OdhHostFederationPlugin } = require('@odh-dashboard/app-config/webpack');

const updateTypes = !!process.env.MF_UPDATE_TYPES;

// remotes are built from mfConfig discovery (see full file for details)
const remotes = updateTypes
  ? mfConfig.reduce((acc, config) => {
      if (!config.backend) return acc;
      const { localService, remoteEntry, service } = config.backend;
      const host = localService?.host ?? 'localhost';
      const port = localService?.port ?? service.port;
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

1. Add `module-federation` configuration to your `package.json`
2. Add `@odh-dashboard/app-config` and `@module-federation/enhanced` to your frontend `package.json` devDependencies
3. Add `@odh-dashboard/app-config` to the parent `package.json` dependencies
4. Create a `moduleFederation.js` using `OdhRemoteFederationPlugin`
5. Create extensions and extension-points files
6. Build and serve your module locally

### Local Development

1. Start your federated module's development server
2. Start the main ODH Dashboard application
3. The dashboard will automatically discover and load your module

## Sharing Library Packages

The monorepo contains two types of packages:

- **Federated remotes** (webpack + MF config): Packages like `gen-ai`, `maas`, `mlflow` that build separately and the host loads at runtime.
- **Library packages** (no webpack, no MF config): Packages like `llmd-serving`, `model-serving`, `kserve`, `plugin-core` that expose raw TypeScript via `package.json` `exports`.

When a federated remote imports from a library package, webpack must compile the library's TypeScript and the code can end up duplicated between the host and remote bundles. The plugins prevent this automatically — all `@odh-dashboard/*` runtime packages are shared as singletons.

### Webpack Exclude Regex

All `webpack.common.js` files use a negative lookahead in the TS/JS rule to allow `@odh-dashboard/*` packages to be compiled:

```javascript
exclude: [/node_modules\/(?!@odh-dashboard)/, /__tests__/, /__mocks__/],
```

This ensures webpack can parse TypeScript from `@odh-dashboard/*` packages resolved through `node_modules`.

### Adding a New Library Package

When creating a new `@odh-dashboard/*` library package that will be consumed by federated remotes:

1. Add the package to the monorepo under `packages/`. npm workspaces will hoist it into `node_modules/@odh-dashboard/`.
2. The plugins will automatically discover and share it — no manual shared config needed.
3. Ensure the consumer's `webpack.common.js` has the `node_modules\/(?!@odh-dashboard)` exclude pattern.

## Troubleshooting

### Common Issues

1. **Module not loading**: Verify the module name matches between `package.json` and webpack config
2. **Shared dependency conflicts**: The plugins handle this automatically; check `@odh-dashboard/app-config` is properly built (`npm run build` in app-config)
3. **Proxy issues**: Check that the backend service is running and accessible
4. **Asset loading issues**: If you see failing requests for `__federation_expose_` files without the module name in the path, add `output.publicPath = 'auto'` to your webpack configuration
5. **Module parse failed for `@odh-dashboard/*` packages**: Ensure `webpack.common.js` uses `exclude: [/node_modules\/(?!@odh-dashboard)/]` instead of `exclude: [/node_modules/]` in the TS/JS rule
6. **PatternFly CSS issues in remotes**: The remote plugin aliases PF CSS to `false`. If you see missing styles, verify the host is loading `@patternfly/patternfly` CSS correctly
