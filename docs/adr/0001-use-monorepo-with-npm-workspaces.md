# 1. Use Monorepo with npm Workspaces

Date: 2024-10-25 (documented 2026-03-11)

## Status

Accepted

## Context

The ODH Dashboard needs to support:
- Main dashboard application (frontend + backend)
- Multiple feature packages (~25 packages)
- Shared utilities, types, and components
- Independent deployability of features
- Consistent tooling and dependencies

We needed to choose between:
1. **Polyrepo**: Separate repositories for each package
2. **Monorepo**: Single repository with multiple packages

## Decision

Use a **monorepo** structure with **npm workspaces** and **Turbo** for orchestration.

Structure:
```
odh-dashboard/
├── frontend/           # Main dashboard
├── backend/            # Main backend
├── packages/           # Feature packages
│   ├── gen-ai/
│   ├── model-registry/
│   └── ...
└── package.json        # Root with workspaces config
```

## Consequences

**Positive:**
- **Atomic changes**: Can update multiple packages in single commit
- **Code sharing**: Easy to share utilities, types, components
- **Simplified dependencies**: Single `node_modules`, consistent versions
- **Developer experience**: Single `npm install`, unified tooling
- **Refactoring**: Safer cross-package refactoring
- **Testing**: Can test packages together before release

**Negative:**
- **Repository size**: Larger checkout and clone times
- **Complexity**: More complex CI/CD (mitigated by Turbo caching)
- **All-or-nothing**: Harder to grant access to just one package
- **Build times**: Without caching, can be slower (mitigated by Turbo)

**Neutral:**
- Requires Turbo or similar tool for efficient builds
- Requires discipline to maintain package boundaries
- Works well with Module Federation for runtime code-splitting

## Alternatives Considered

### Polyrepo
**Rejected because:**
- Cross-package changes require multiple PRs
- Version synchronization is complex
- Harder to share code and types
- More overhead to set up tooling per repo

### Different monorepo tools
- **Nx**: More features but more complex
- **Lerna**: Older, less active development
- **Turborepo**: Chosen for simplicity and speed

## References

- [docs/architecture.md](../architecture.md)
- [npm workspaces documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
- [Turbo documentation](https://turbo.build/repo/docs)
- [ADR 0002: Use Webpack Module Federation](0002-use-webpack-module-federation.md)
