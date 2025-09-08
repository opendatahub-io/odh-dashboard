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

The host application defines shared dependencies that are made available to all remote modules:

#### Required Shared Dependencies

All federated modules **must** include these shared dependencies in their configuration:

```javascript
const deps = require('../package.json').dependencies;

const config = {
  // ...
  shared: {
    react: { singleton: true, requiredVersion: deps.react },
    'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
    'react-router': { singleton: true, requiredVersion: deps['react-router'] },
    'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
    '@patternfly/react-core': { singleton: true, requiredVersion: deps['@patternfly/react-core'] },
  }
};
```

#### Optional Shared Dependencies

Include these if your module uses the corresponding functionality:

```javascript
const config = {
  // ...
  shared: {
    '@openshift/dynamic-plugin-sdk': {
      singleton: true,
      requiredVersion: deps['@openshift/dynamic-plugin-sdk'],
    },
    '@odh-dashboard/plugin-core': {
      singleton: true,
      requiredVersion: deps['@odh-dashboard/plugin-core'],
    },
  }
};
```

## Module Federation Configuration

Each federated module must include a `module-federation` property in its `package.json` with the following structure:

### Configuration Properties

- **name** (string): The unique identifier for the federated module. Must match the `name` property in the module's webpack `ModuleFederationPlugin` configuration
- **remoteEntry** (string): The path to the remote entry file (typically `/remoteEntry.js`)
- **authorize** (boolean, optional): Whether requests to this module require authorization (defaults to false)
- **tls** (boolean, optional): Whether to use TLS for connections (defaults to true)
- **proxy** (array): Array of API proxy configurations for backend services
  - **path** (string): The URL path to proxy (e.g., `/api/v1/models`)
  - **pathRewrite** (string, optional): Path rewrite rule (defaults to the same as `path`)
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
// webpack config
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'my-module',
      exposes: {
        './extensions': './src/extensions',
      },
      // ... other config
    }),
  ],
};
```

### Extension Format

Extensions should export an array of extension objects:

```typescript
// src/extensions.ts
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

Install the required webpack plugin:

```bash
npm install @module-federation/enhanced
```

### Basic Configuration

```javascript
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const deps = require('./package.json').dependencies;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'my-module', // Must match package.json module-federation.name
      filename: 'remoteEntry.js',
      exposes: {
        './extensions': './src/extensions',
      },
      shared: {
        // Required shared dependencies
        react: { singleton: true, requiredVersion: deps.react },
        'react-dom': { singleton: true, requiredVersion: deps['react-dom'] },
        'react-router': { singleton: true, requiredVersion: deps['react-router'] },
        'react-router-dom': { singleton: true, requiredVersion: deps['react-router-dom'] },
        '@patternfly/react-core': {
          singleton: true,
          requiredVersion: deps['@patternfly/react-core'],
        },
        
        // Optional shared dependencies (include if used)
        '@openshift/dynamic-plugin-sdk': {
          singleton: true,
          requiredVersion: deps['@openshift/dynamic-plugin-sdk'],
        },
        '@odh-dashboard/plugin-core': {
          singleton: true,
          requiredVersion: deps['@odh-dashboard/plugin-core'],
        },
      },
      // Important for compatibility with runtimeChunk: "single"
      runtime: false,
    }),
  ],
  output: {
    // Required to allow for dynamic resolution of asset paths
    publicPath: 'auto',
  },
};
```

## Development Workflow

### Creating a New Federated Module

1. Add `module-federation` configuration to your `package.json`
2. Configure webpack with `ModuleFederationPlugin` and `publicPath: 'auto'`
3. Create an extensions file to export your module's functionality
4. Build and serve your module locally

### Local Development

1. Start your federated module's development server
2. Start the main ODH Dashboard application
3. The dashboard will automatically discover and load your module

## Troubleshooting

### Common Issues

1. **Module not loading**: Verify the module name matches between `package.json` and webpack config
2. **Shared dependency conflicts**: Ensure all required shared dependencies are configured with correct versions  
3. **Proxy issues**: Check that the backend service is running and accessible
4. **Asset loading issues**: If you see failing requests for `__federation_expose_` files without the module name in the path, add `output.publicPath = 'auto'` to your webpack configuration (see [Webpack Configuration](#webpack-configuration) section above)
