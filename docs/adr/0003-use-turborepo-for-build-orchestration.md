# 3. Use Turborepo for Build Orchestration

Date: 2024-12-01 (documented 2026-03-11)

## Status

Accepted

## Context

In a monorepo with ~25 packages, we need efficient build orchestration:
- Packages have dependencies on each other
- Running all builds sequentially is slow
- Many builds can be cached (if inputs haven't changed)
- CI/CD needs to be fast to maintain developer productivity
- Local development should leverage caching

We needed a tool that:
- Understands package dependencies
- Runs tasks in parallel where possible
- Caches task outputs intelligently
- Works with npm workspaces
- Is simple to configure

## Decision

Use **Turborepo (Turbo)** for build orchestration across the monorepo.

Configuration in `turbo.jsonc`:
- Defines pipeline for tasks (`build`, `test`, `lint`, `type-check`)
- Specifies dependencies between tasks
- Configures caching strategy
- Defines outputs for each task type

## Consequences

**Positive:**
- **Speed**: Caches task outputs, only rebuilds changed packages
- **Simplicity**: Single command runs tasks across all workspaces
- **Parallel execution**: Runs independent tasks in parallel
- **CI/CD**: Fast builds in CI with remote caching support
- **Developer experience**: Faster local builds
- **Dependency-aware**: Builds packages in correct order

**Negative:**
- **Another tool**: One more dependency to maintain
- **Cache debugging**: Harder to debug when cache is stale
- **Learning curve**: Team needs to understand Turbo pipelines

**Neutral:**
- Works alongside npm workspaces (doesn't replace)
- Cache can be local or remote (remote not set up yet)
- Configuration requires understanding task dependencies

## Implementation Details

### Common Commands
```bash
# Build all packages (with caching)
npm run build  # → turbo run build

# Type check all packages
npm run type-check  # → turbo run type-check

# Run tests
npm run test-unit  # → turbo run test-unit

# Lint all packages
npm run lint  # → turbo run lint
```

### Pipeline Configuration
Tasks are defined in `turbo.jsonc` with:
- **dependsOn**: What must run before this task
- **outputs**: What files this task produces (for caching)
- **inputs**: What files affect this task (for cache invalidation)

## Alternatives Considered

### Nx
**Pros:**
- More features (code generators, affected commands, etc.)
- Better IDE integration
- More mature

**Rejected because:**
- More complex setup and configuration
- Overkill for our needs
- Steeper learning curve
- We don't need all the features

### Custom npm scripts
**Rejected because:**
- No caching
- Hard to coordinate parallel execution
- Complex dependency management
- Reinventing the wheel

### Lerna
**Rejected because:**
- Focus on package publishing, not builds
- Less active development
- Turbo is faster for build orchestration

## Future Considerations

- **Remote caching**: Could set up Vercel remote cache for CI speedup
- **Task graphs**: Turbo can generate task dependency graphs
- **Affected packages**: Could use `turbo run build --filter=[origin/main]` to build only changed packages

## References

- [turbo.jsonc](../../turbo.jsonc)
- [Turbo documentation](https://turbo.build/repo/docs)
- [package.json scripts](../../package.json)
- [ADR 0001: Use Monorepo](0001-use-monorepo-with-npm-workspaces.md)
