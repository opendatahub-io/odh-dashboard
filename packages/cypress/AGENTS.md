# Cypress Package AGENTS.md

See [root AGENTS.md](../../AGENTS.md) for general ODH Dashboard agent guidance.

## Cypress Testing Package

This package contains the **shared Cypress testing framework** and utilities used across the ODH Dashboard monorepo.

### Purpose
- Shared Cypress configuration
- Common test utilities and helpers
- Shared fixtures and test data
- Reusable custom commands
- E2E and component test infrastructure

### Key Files
```
packages/cypress/
├── src/
│   ├── support/          # Cypress support files
│   ├── fixtures/         # Test data and fixtures
│   └── utils/            # Testing utilities
├── cypress.config.ts     # Cypress configuration
└── package.json
```

### Usage

Packages use this as a shared dependency:
```json
{
  "devDependencies": {
    "@odh-dashboard/cypress": "*"
  }
}
```

### Testing Rules

**IMPORTANT**: When writing Cypress tests, always follow the agent rules:

- **E2E Tests**: See [docs/agent-rules/cypress-e2e.md](../../docs/agent-rules/cypress-e2e.md)
- **Mock/Component Tests**: See [docs/agent-rules/cypress-mock.md](../../docs/agent-rules/cypress-mock.md)

### Common Patterns

**Custom Commands:**
- Located in `src/support/commands/`
- Available to all tests via `cy.customCommand()`

**Fixtures:**
- Located in `src/fixtures/`
- Load via `cy.fixture('filename')`

**Utilities:**
- Located in `src/utils/`
- Import and use in tests

### Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [docs/cypress-tutorial.md](../../docs/cypress-tutorial.md)
- [docs/testing.md](../../docs/testing.md)
