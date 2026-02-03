# AGENTS.md - ODH Dashboard

This document provides guidance for AI agents working on the Open Data Hub (ODH) Dashboard monorepo.

## Repository Overview

ODH Dashboard is a **monorepo** containing the main dashboard application and multiple feature packages. It provides the web UI for Red Hat OpenShift AI (RHOAI) and Open Data Hub.

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
│   └── ...                     # Other packages
├── .github/                    # GitHub workflows and templates
├── .tekton/                    # Tekton CI/CD pipelines
└── docs/                       # Documentation
```

## Development Requirements

- **Node.js**: >= 22.0.0
- **npm**: >= 10.0.0
- **Go**: >= 1.24 (for packages with BFF)

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
```

## Package-Specific Guidelines

Some packages have their own AGENTS.md with package-specific guidance. Check the package directory for its own AGENTS.md file.

## Specialized Agent Rules

Before performing certain tasks, read and follow the corresponding specialized rules:

| Task                  | Rule File                                                                    | Trigger                                                                      |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Jira Creation**     | [docs/agent-rules/jira-creation.md](docs/agent-rules/jira-creation.md)       | When asked to create Jira issues, tickets, bugs, stories, tasks, or epics    |
| **Contract Tests**    | [docs/agent-rules/contract-tests.md](docs/agent-rules/contract-tests.md)     | When working on contract tests or BFF API validation                         |
| **Cypress E2E Tests** | [docs/agent-rules/cypress-e2e.md](docs/agent-rules/cypress-e2e.md)           | When creating or modifying E2E tests, Robot Framework migrations             |
| **Cypress Mock Tests**| [docs/agent-rules/cypress-mock.md](docs/agent-rules/cypress-mock.md)         | When creating or modifying mock/component tests                              |

**Important**: Always read the relevant rule file before starting the task to ensure you follow the project's conventions and patterns.
