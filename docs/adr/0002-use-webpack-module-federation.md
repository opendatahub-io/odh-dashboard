# 2. Use Webpack Module Federation

Date: 2024-11-15 (documented 2026-03-11)

## Status

Accepted

## Context

ODH Dashboard needs to support:
- Plugin-based architecture where external teams can contribute features
- Dynamic loading of features at runtime
- Independent development and deployment of features
- Sharing of common dependencies (React, PatternFly) to avoid duplication
- Loading only the features a user actually uses

We needed a way to:
- Load code at runtime, not build time
- Share dependencies between host and remotes
- Allow features to be developed independently
- Support lazy loading for performance

## Decision

Use **Webpack Module Federation** as the micro-frontend architecture.

Architecture:
- **Host**: Main dashboard application (`frontend/`)
- **Remotes**: Feature packages (`packages/gen-ai`, `packages/model-registry`, etc.)
- **Shared dependencies**: React, PatternFly, routing libraries
- **Discovery**: Automatic via `package.json` `module-federation` field

## Consequences

**Positive:**
- **Plugin architecture**: External teams can build features independently
- **Runtime loading**: Load features on-demand, not at build time
- **Isolation**: Features can be developed, tested, deployed separately
- **Performance**: Only load features user actually uses
- **Versioning**: Can run different versions of features
- **Sharing**: Shared dependencies reduce bundle size

**Negative:**
- **Complexity**: More complex build setup
- **Debugging**: Harder to debug across federation boundaries
- **Version conflicts**: Shared dependency versions must be compatible
- **Type safety**: TypeScript types across remote boundaries need management
- **Learning curve**: Team needs to understand Module Federation

**Neutral:**
- Requires coordination on shared dependency versions
- Works well with monorepo structure
- Requires careful configuration of shared dependencies

## Implementation Details

### Package Configuration
Features declare themselves as federated modules in `package.json`:
```json
{
  "module-federation": {
    "name": "@odh-dashboard/gen-ai",
    "remoteEntry": "/remoteEntry.js",
    "authorize": false,
    "tls": true,
    "proxy": [...]
  }
}
```

### Shared Dependencies
All remotes must share:
- `react` (singleton)
- `react-dom` (singleton)
- `react-router` (singleton)
- `@patternfly/react-core` (singleton)

## Alternatives Considered

### Single-Spa
**Rejected because:**
- More framework-agnostic (we're all React)
- More boilerplate per feature
- Module Federation better integrates with Webpack

### Iframe-based plugins
**Rejected because:**
- Poor performance
- Complex communication between frames
- Styling isolation issues
- Difficult state management

### Build-time plugins
**Rejected because:**
- Features must be built together
- Can't deploy features independently
- Longer build times
- All-or-nothing deployments

## References

- [docs/module-federation.md](../module-federation.md)
- [Webpack Module Federation](https://webpack.js.org/concepts/module-federation/)
- [Module Federation examples](https://module-federation.io/)
- [ADR 0001: Use Monorepo](0001-use-monorepo-with-npm-workspaces.md)
