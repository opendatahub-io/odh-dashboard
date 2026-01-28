# CLAUDE.md

Follow the instructions in [AGENTS.md](./AGENTS.md).

## Specialized Rules

Before performing certain tasks, read and follow the corresponding specialized rules:

| Task | Rule File | Trigger |
|------|-----------|---------|
| **Jira Creation** | [docs/agent-rules/jira-creation.md](docs/agent-rules/jira-creation.md) | When asked to create Jira issues, tickets, bugs, stories, tasks, or epics |
| **Contract Tests** | [docs/agent-rules/contract-tests.md](docs/agent-rules/contract-tests.md) | When working on contract tests or BFF API validation |
| **Cypress E2E Tests** | [docs/agent-rules/cypress-e2e.md](docs/agent-rules/cypress-e2e.md) | When creating or modifying E2E tests, Robot Framework migrations |
| **Cypress Mock Tests** | [docs/agent-rules/cypress-mock.md](docs/agent-rules/cypress-mock.md) | When creating or modifying mock/component tests |

**Important**: Always read the relevant rule file before starting the task to ensure you follow the project's conventions and patterns.
