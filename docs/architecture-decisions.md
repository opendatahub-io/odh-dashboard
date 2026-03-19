# Architecture Decisions

Key architectural decisions for the ODH Dashboard monorepo. For formal ADRs, see [docs/adr/](adr/).

## Why Monorepo?

**Decision**: Use npm workspaces + Turbo monorepo structure

**Rationale**:
- **Code sharing**: Shared utilities, types, and components across features
- **Atomic changes**: Update multiple packages in single commit
- **Simplified dependencies**: Single node_modules, consistent versions
- **Developer experience**: Single install, unified tooling

**Trade-offs**:
- Larger repository size
- More complex CI/CD (partially mitigated by Turbo caching; note: some tasks like `build` and Cypress have caching disabled in turbo.jsonc)

## Why Module Federation?

**Decision**: Use Webpack Module Federation for runtime code-splitting

**Rationale**:
- **Plugin architecture**: External teams can build features independently
- **Runtime loading**: Load features on-demand, not at build time
- **Isolation**: Features can be developed, tested, deployed separately
- **Performance**: Only load features user actually uses

**Implementation**: See [module-federation.md](module-federation.md)

## Why Turbo?

**Decision**: Use Turbo for monorepo task orchestration

**Rationale**:
- **Speed**: Caches task outputs, only rebuilds changed packages
- **Simplicity**: Runs tasks across workspaces with single command
- **CI/CD**: Intelligent task scheduling based on dependencies

**Alternative considered**: Nx (more features, more complex)
