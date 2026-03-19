# ODH Dashboard Testing Standards

## Test Types Overview

| Type | Framework | Location | Purpose |
|------|-----------|----------|---------|
| Unit Tests | Jest + React Testing Library | `__tests__/` adjacent to source | Test utilities, hooks, components in isolation |
| Cypress Mock Tests | Cypress | `packages/cypress/cypress/tests/mocked/` or `packages/<pkg>/frontend/src/__tests__/cypress/` | Component/integration tests with mocked backends |
| Cypress E2E Tests | Cypress | `packages/cypress/cypress/tests/e2e/` | End-to-end user journeys on live clusters |
| Contract Tests | Jest + `@odh-dashboard/contract-tests` | `packages/<pkg>/contract-tests/__tests__/` | BFF API contract validation |

## Unit Tests (Jest)

- File naming: `*.spec.ts` or `*.spec.tsx`
- Location: `__tests__/` directory adjacent to source file
- Use `describe('<function name>')` grouping and `it('should ...')` naming
- Use `@odh-dashboard/jest-config` for shared configuration and custom matchers
- Use `@odh-dashboard/internal/__mocks__` for shared mock data factories
- Selector priority: accessibility selectors (`getByRole`, `getByLabelText`) > `data-testid` (last resort) > NEVER DOM structure selectors

### What Requires Unit Tests

- Utility functions, custom hooks, API utilities, data transformations, business logic: Required
- React Components (isolated logic, render conditions, simple interactions): Optional
- Simple re-exports, type definitions, configuration files: Not required

## Cypress Mock Tests

- Test UI logic, state management, component interactions with mocked network requests
- Use Page Object Model pattern for reusable page interactions
- Store mock data in `__mocks__/` directories (TypeScript functions)
- Store fixture data in `fixtures/mocked/` (YAML/JSON)
- Run without cluster access — all API calls are intercepted

## Cypress E2E Tests

- Test end-to-end user journeys against live OpenShift clusters
- Use `data-testid` selectors, avoid `cy.wait()` with arbitrary times
- Store test data in YAML fixture files under `fixtures/e2e/`
- User configuration must come from `test-variables.yml`
- Never include credentials in fixture files
- Tags specified in `it()` block options: `it('...', { tags: ['@Tag'] }, ...)`

## Contract Tests

- Validate frontend (consumer) expectations match BFF (provider) API contracts
- Must use `@odh-dashboard/contract-tests` central framework
- Module should only contain test files and one `test:contract` script
- OpenAPI schemas define the contract source of truth
- Do not duplicate framework utilities in individual modules

## General Testing Principles

- Tests should be independent and runnable in isolation
- Avoid hardcoded waits — use Cypress retries or Jest async utilities
- Mock external dependencies, not internal code
- Test behavior, not implementation details
