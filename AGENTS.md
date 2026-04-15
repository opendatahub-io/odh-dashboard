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

## Documentation

**[BOOKMARKS.md](BOOKMARKS.md)** indexes key documentation for frontend areas, the backend, and packages. Review relevant docs for the area you are working on before starting a task.

## Package-Specific Guidelines

Some packages have their own AGENTS.md with package-specific guidance. Check the package directory for its own AGENTS.md file.

## Specialized Agent Rules

Before performing certain tasks, read and follow the corresponding specialized rules.

Rules live in `.claude/rules/`. Read the relevant rule file before starting the task.

| Rule                        | File                          | Trigger                                                                        |
| --------------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| **Architecture**            | `architecture.md`             | When making structural changes, adding packages, or modifying package boundaries |
| **BFF Go**                  | `bff-go.md`                   | When working on Go BFF code in `packages/*/bff/`                               |
| **Contract Tests**          | `contract-tests.md`           | When working on contract tests or BFF API validation                           |
| **Conventions**             | `conventions.md`              | When writing or reviewing TypeScript, React, or backend code                   |
| **CSS & PatternFly**        | `css-patternfly.md`           | When writing or modifying styles, SCSS, or PatternFly components               |
| **Cypress E2E Tests**       | `cypress-e2e.md`              | When creating or modifying E2E tests, Robot Framework migrations               |
| **Cypress Mock Tests**      | `cypress-mock.md`             | When creating or modifying mock/component tests                                |
| **Jira Creation**           | `jira-creation.md`            | When asked to create Jira issues, tickets, bugs, stories, tasks, or epics      |
| **Modular Architecture**    | `modular-architecture.md`     | When working on the plugin/extension system or package integration              |
| **Module Federation**       | `module-federation.md`        | When configuring Module Federation, webpack remotes, or shared dependencies    |
| **Module Onboarding**       | `module-onboarding.md`        | When creating a new package/module in the monorepo                             |
| **React**                   | `react.md`                    | When writing React components, hooks, or pages                                 |
| **Security**                | `security.md`                 | When working on auth, secrets, input validation, or K8s API interactions        |
| **Testing Standards**       | `testing-standards.md`        | When working across multiple test types or choosing a testing strategy          |
| **Third-Party Theming**     | `third-party-theming.md`      | When theming external libraries (Perses, MLflow, etc.) or mapping PF tokens into non-PF component systems |
| **Unit Tests**              | `unit-tests.md`               | When creating or modifying Jest unit tests for utilities, hooks, or components |

## Agent Skills

Skills provide multi-step workflows. They live in `.claude/skills/`. Read the relevant skill file before starting the task.

| Skill                              | Directory                              | Use when                                                                       |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| **Dev Workflow**                   | `skills/dev-workflow/`                 | Implementing a feature, fix, or refactor — runs lint, type-check, tests, and optional browser verification |
| **Docs Create**                    | `skills/docs-create/`                  | Creating a new documentation file from a description                           |
| **Docs Create Package**            | `skills/docs-create-package/`          | Scaffolding a package doc and registering it in BOOKMARKS.md                   |
| **Docs Update**                    | `skills/docs-update/`                  | Updating existing docs after code changes                                      |
| **Upstream Sync Status**           | `skills/upstream-sync-status/`         | Checking whether a package's upstream copy is up to date (pass package name or be prompted) |
| **Upstream Sync**                  | `skills/upstream-sync/`                | Syncing upstream changes for a package and opening a PR (pass package name or be prompted)  |
| **Jira Triage**                   | `skills/jira-triage/`                  | Fetching Jira issues by filter criteria, running full triage on New issues (orchestrates all analysis skills), defining triage operations, and bulk-applying them |
| **Jira Validate Priority/Severity** | `skills/jira-validate-priority-severity/` | Analyzing bugs for missing or incorrect severity and priority fields         |
| **Jira Validate Description**     | `skills/jira-validate-description/`    | Validating issue descriptions for completeness per type, requesting missing information from reporters |
| **Jira Evaluate Blockers**        | `skills/jira-evaluate-blockers/`       | Applying needs-\* labels and blocking state during triage, or evaluating whether existing blockers have been resolved |
| **Jira Validate Issue Type**      | `skills/jira-validate-issue-type/`     | Validating or correcting issue types (Bug, Story, Task) and labeling feature requests |
| **Jira Validate Area Label**      | `skills/jira-validate-area-label/`     | Validating or assigning `dashboard-area-*` labels based on multi-signal content analysis |
| **Jira Assign Scrum Team**        | `skills/jira-assign-scrum-team/`       | Assigning a scrum team label based on area-to-scrum mapping during triage |

**Important**: Always read the relevant rule or skill file before starting the task to ensure you follow the project's conventions and patterns.
