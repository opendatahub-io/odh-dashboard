# AGENTS.md - ODH Dashboard

This document provides comprehensive guidance for AI agents working on the Open Data Hub (ODH) Dashboard monorepo.

## Repository Overview

ODH Dashboard is a **monorepo** containing the main dashboard application and multiple feature packages. It provides the web UI for Red Hat OpenShift AI (RHOAI) and Open Data Hub.

**Quick Links**: See [BOOKMARKS.md](BOOKMARKS.md) for key documentation and resources.

## Repository Structure

```text
odh-dashboard/
├── frontend/                    # Main dashboard frontend application
│   └── src/
│       └── __mocks__/          # Shared mock data (@odh-dashboard/internal/__mocks__)
├── backend/                     # Main dashboard backend (Node.js/Express)
│   └── src/
├── packages/                    # Feature packages
│   ├── cypress/                # Cypress test framework and shared tests
│   ├── gen-ai/                 # Gen AI / LLM features (has BFF)
│   ├── maas/                   # Mod Arch starter (has BFF)
│   ├── model-registry/         # Model Registry UI (has BFF)
│   ├── model-serving/          # Model Serving UI
│   └── ...                     # Other packages (~25 total)
├── .github/                    # GitHub workflows and templates
├── .tekton/                    # Tekton CI/CD pipelines
└── docs/                       # Documentation
```

## Development Requirements

- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0
- **Go**: >= 1.24 (for packages with Backend-for-Frontend services)

## Key Technologies

| Technology    | Purpose                                    |
| ------------- | ------------------------------------------ |
| React 18      | Frontend framework                         |
| TypeScript    | Type safety                                |
| PatternFly v6 | Primary UI component library (RHOAI/ODH)   |
| Material UI   | Secondary UI library (Kubeflow mode)       |
| Webpack       | Build tooling with Module Federation       |
| Cypress       | E2E and component testing                  |
| Jest          | Unit testing                               |
| Turbo         | Monorepo task runner                       |

## Development Patterns

### 1. Workspace-based Organization

**Pattern**: Code organized by workspace, not by type
```
✅ Good: packages/gen-ai/src/
❌ Bad:  src/gen-ai/
```

**Reason**: Each workspace is independently buildable and deployable

### 2. Shared Configuration

**Pattern**: TypeScript config shared via `packages/tsconfig`
```json
{
  "extends": "@odh-dashboard/tsconfig/tsconfig.json"
}
```

**Reason**: Consistent type-checking across all packages

### 3. Module Federation Remotes

**Pattern**: Packages with UI expose remotes via `package.json` config
```json
{
  "module-federation": {
    "name": "@odh-dashboard/gen-ai",
    "remoteEntry": "/remoteEntry.js"
  }
}
```

**Reason**: Host discovers and loads remotes automatically

### 4. Backend-for-Frontend (BFF) Pattern

**Pattern**: Some packages include Go BFF services
```
packages/gen-ai/
├── frontend/     # React UI
└── bff/         # Go service (API proxy, business logic)
```

**Examples**: gen-ai, model-registry, maas

**Reason**:
- Isolate API complexity from frontend
- Custom business logic per feature
- Type-safe API contracts

## Coding Conventions

### TypeScript

- ✅ Use strict mode
- ✅ Avoid `any` - use `unknown` if type truly unknown
- ✅ Export types alongside implementation
- ✅ Use `type` for object shapes, `interface` for extensibility

### React

- ✅ Functional components only (no class components)
- ✅ Hooks for state management
- ✅ PatternFly components for RHOAI/ODH mode
- ✅ Material UI components for Kubeflow mode
- ✅ Co-locate tests with components (`*.test.tsx` next to `*.tsx`)

### Testing

- ✅ Unit tests: Jest for utilities, hooks, simple components
- ✅ Component tests: Cypress for complex UI interactions
- ✅ E2E tests: Cypress for full user flows
- ✅ Contract tests: Validate BFF API contracts

See [docs/testing.md](docs/testing.md) for details.

### File Organization

```
packages/example/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MyComponent.tsx
│   │   │   └── __tests__/
│   │   │       └── MyComponent.test.tsx
│   │   └── utils/
│   │       ├── helper.ts
│   │       └── __tests__/
│   │           └── helper.test.ts
│   └── package.json
└── bff/ (if needed)
    └── src/
```

## Common Commands

```bash
# Install dependencies
npm install

# Start development server (main dashboard)
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Lint all packages
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Run specific workspace command
cd packages/gen-ai && npm run build
```

## Specialized Agent Rules

Before performing certain tasks, read and follow the corresponding specialized rules:

| Task                  | Rule File                                                                    | Trigger                                                                      |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Jira Creation**     | [docs/agent-rules/jira-creation.md](docs/agent-rules/jira-creation.md)       | When asked to create Jira issues, tickets, bugs, stories, tasks, or epics    |
| **Contract Tests**    | [docs/agent-rules/contract-tests.md](docs/agent-rules/contract-tests.md)     | When working on contract tests or BFF API validation                         |
| **Cypress E2E Tests** | [docs/agent-rules/cypress-e2e.md](docs/agent-rules/cypress-e2e.md)           | When creating or modifying E2E tests, Robot Framework migrations             |
| **Cypress Mock Tests**| [docs/agent-rules/cypress-mock.md](docs/agent-rules/cypress-mock.md)         | When creating or modifying mock/component tests                              |
| **Unit Tests**        | [docs/agent-rules/unit-tests.md](docs/agent-rules/unit-tests.md)             | When creating or modifying Jest unit tests for utilities, hooks, or components |

**Important**: Always read the relevant rule file before starting the task to ensure you follow the project's conventions and patterns.

## Git Workflow

1. **Create feature branch** from main
2. **Make changes** following conventions above
3. **Run tests** locally (`npm run test`)
4. **Run linting** (`npm run lint`)
5. **Commit** with conventional commit format (see pre-commit hooks)
6. **Push** and create PR
7. **CI checks** must pass (tests, lint, type-check)
8. **Review** by code owners (see OWNERS files)

## Pre-commit Hooks

This repository uses Husky for pre-commit hooks (`.husky/pre-commit`):
- Runs ESLint on staged files via lint-staged
- Configured in `package.json` → `lint-staged`

To bypass (not recommended): `git commit --no-verify`

## CI/CD

### GitHub Actions
- `.github/workflows/` - PR checks, release automation
- Runs: lint, type-check, tests, build

### Tekton Pipelines
- `.tekton/` - OpenShift deployment pipelines
- Triggered on merge to main

See [docs/pr-review-guidelines.md](docs/pr-review-guidelines.md) for review process.

## Common Pitfalls for Agents

### ❌ Don't: Create root `/src` or `/tests` directories
**Why**: This is a monorepo - source is in workspaces
**Do**: Use `frontend/src/`, `backend/src/`, `packages/*/src/`

### ❌ Don't: Modify shared dependencies without coordination
**Why**: Module Federation requires consistent versions
**Do**: Discuss in PR if changing React, PatternFly, etc.

### ❌ Don't: Add TypeScript strict mode to root tsconfig.json
**Why**: Root only has project references, workspaces have strict mode
**Do**: Configure strict mode in workspace tsconfig files

### ❌ Don't: Bypass pre-commit hooks regularly
**Why**: Catches issues before CI, maintains consistency
**Do**: Fix linting issues locally, only bypass for WIP commits

### ❌ Don't: Create large PRs without discussion
**Why**: Harder to review, more likely to conflict
**Do**: Break into smaller PRs, use feature flags if needed

## Getting Help

- **Documentation**: See [docs/README.md](docs/README.md) for full doc index
- **Architecture**: See [docs/architecture.md](docs/architecture.md)
- **Testing**: See [docs/testing.md](docs/testing.md)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **SMEs**: See [docs/smes.md](docs/smes.md) for subject matter experts

---

**Last Updated**: 2026-03-11
**Maintained by**: ODH Dashboard team
