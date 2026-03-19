# BOOKMARKS.md - ODH Dashboard Quick Reference

This file serves as a context anchor for AI agents, providing quick links to key documentation and resources.

## 📋 Project Documentation

### Getting Started
- [AGENTS.md](AGENTS.md) - Comprehensive AI agent guidance
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [README.md](README.md) - Project overview
- [docs/dev-setup.md](docs/dev-setup.md) - Development environment setup

### Architecture & Design
- [docs/architecture.md](docs/architecture.md) - Overall system architecture
- [docs/architecture-decisions.md](docs/architecture-decisions.md) - Key architecture decisions (monorepo, Module Federation, Turbo)
- [docs/module-federation.md](docs/module-federation.md) - Module Federation implementation
- [docs/extensibility.md](docs/extensibility.md) - Plugin/extension system
- [docs/modular-architecture-quality-gates.md](docs/modular-architecture-quality-gates.md) - Quality standards

### Development Workflows
- [docs/pr-review-guidelines.md](docs/pr-review-guidelines.md) - PR review process
- [docs/PRE-COMMIT.md](docs/PRE-COMMIT.md) - Pre-commit hook details
- [docs/best-practices.md](docs/best-practices.md) - Coding best practices
- [docs/code_examples.md](docs/code_examples.md) - Code examples and patterns

### Testing
- [docs/testing.md](docs/testing.md) - Comprehensive testing guide
- [docs/cypress-tutorial.md](docs/cypress-tutorial.md) - Cypress testing tutorial
- [docs/agent-rules/unit-tests.md](docs/agent-rules/unit-tests.md) - Unit testing rules
- [docs/agent-rules/cypress-e2e.md](docs/agent-rules/cypress-e2e.md) - E2E testing rules
- [docs/agent-rules/cypress-mock.md](docs/agent-rules/cypress-mock.md) - Mock testing rules
- [docs/agent-rules/contract-tests.md](docs/agent-rules/contract-tests.md) - Contract testing rules

### Process & Collaboration
- [docs/adding-owners-and-reviewers.md](docs/adding-owners-and-reviewers.md) - OWNERS file management
- [docs/definition-of-ready.md](docs/definition-of-ready.md) - DoR for features
- [docs/definition-of-done.md](docs/definition-of-done.md) - DoD for tasks
- [docs/smes.md](docs/smes.md) - Subject matter experts
- [docs/agent-rules/jira-creation.md](docs/agent-rules/jira-creation.md) - Jira ticket creation

### Deployment & Operations
- [docs/release-steps.md](docs/release-steps.md) - Release process
- [docs/dashboard-environment-variables.md](docs/dashboard-environment-variables.md) - Environment configuration
- [docs/observability.md](docs/observability.md) - Monitoring and observability

### Feature-Specific
- [docs/SDK.md](docs/SDK.md) - OpenShift SDK integration
- [docs/user-interaction.md](docs/user-interaction.md) - User interaction patterns
- [docs/external-redirects.md](docs/external-redirects.md) - External link handling
- [docs/admin-dashboard.md](docs/admin-dashboard.md) - Admin features
- [docs/onboard-modular-architecture.md](docs/onboard-modular-architecture.md) - Onboarding new modules

## 📦 Key Package Locations

### Main Applications
- [frontend/](frontend/) - Main dashboard frontend
- [backend/](backend/) - Main dashboard backend

### Feature Packages
- [packages/gen-ai/](packages/gen-ai/) - Generative AI features
- [packages/model-registry/](packages/model-registry/) - Model Registry UI
- [packages/model-serving/](packages/model-serving/) - Model Serving UI
- [packages/model-training/](packages/model-training/) - Model Training UI
- [packages/maas/](packages/maas/) - Model-as-a-Service
- [packages/observability/](packages/observability/) - Observability features

### Infrastructure Packages
- [packages/cypress/](packages/cypress/) - Cypress testing framework
- [packages/contract-tests/](packages/contract-tests/) - API contract tests
- [packages/tsconfig/](packages/tsconfig/) - Shared TypeScript configuration
- [packages/eslint-config/](packages/eslint-config/) - Shared ESLint configuration
- [packages/jest-config/](packages/jest-config/) - Shared Jest configuration

### Plugin System
- [packages/plugin-core/](packages/plugin-core/) - Plugin core utilities
- [packages/plugin-template/](packages/plugin-template/) - Plugin template

## 🚀 Common Tasks Quick Reference

| Task | Command | Documentation |
|------|---------|---------------|
| Setup project | `npm install` | [docs/dev-setup.md](docs/dev-setup.md) |
| Start dev server | `npm run dev` | [AGENTS.md](AGENTS.md#common-commands) |
| Run tests | `npm run test` | [docs/testing.md](docs/testing.md) |
| Lint code | `npm run lint` | [docs/best-practices.md](docs/best-practices.md) |
| Type check | `npm run type-check` | [AGENTS.md](AGENTS.md#typescript) |
| Build all | `npm run build` | [AGENTS.md](AGENTS.md#common-commands) |
| Create Jira | Follow template | [docs/agent-rules/jira-creation.md](docs/agent-rules/jira-creation.md) |
| Write unit test | Follow patterns | [docs/agent-rules/unit-tests.md](docs/agent-rules/unit-tests.md) |
| Write E2E test | Follow patterns | [docs/agent-rules/cypress-e2e.md](docs/agent-rules/cypress-e2e.md) |
| Add new package | Follow module guide | [docs/onboard-modular-architecture.md](docs/onboard-modular-architecture.md) |

---

**Tip for AI Agents**: This file is designed to help you quickly navigate to relevant documentation. Always check the linked docs before making changes to understand context and conventions.

**Last Updated**: 2026-03-11
