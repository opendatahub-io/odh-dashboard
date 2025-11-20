# Cypress Mock Test Rules - Quick Reference

This document provides a quick reference for the comprehensive mock test rules defined in `cypress-mock.mdc`.

## Quick Start

### Basic Test Structure
```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  });

  it('should test specific behavior', () => {
    featurePage.visit();
    // test implementation
  });
});
```

## Key Differences: Mock vs E2E Tests

| Mock Tests | E2E Tests |
|-----------|-----------|
| All requests mocked | Real cluster APIs |
| Fast (seconds) | Slower (minutes) |
| No cluster needed | Requires cluster |
| Uses `__mocks__` data | Real data |
| No `test-variables.yml` | Uses `test-variables.yml` |
| No OC commands | Uses OC commands |

## Critical Rules

### ✅ ALWAYS DO
- Use `beforeEach` for common setup
- Mock ALL network requests with `cy.interceptOdh()` or `cy.interceptK8sList()`
- Use page objects for ALL UI interactions
- Import mocks from `__mocks__` folder
- Use `.as()` and `cy.wait()` for request validation
- Test access control (admin vs non-admin)
- Include `cy.testA11y()` for accessibility
- Lint before committing: `cd frontend && npm run test:lint && npm run test:fix`

### ❌ NEVER DO
- Use `cy.findByTestId()` directly in tests (use page objects)
- Use `cy.findByRole()` directly in tests (use page objects)
- Use `cy.get()` directly in tests (use page objects)
- Create inline mock data (use `__mocks__` folder)
- Use `test-variables.yml` (not needed for mocks)
- Use OC commands (everything is mocked)
- Use `cy.wait(milliseconds)` for arbitrary delays
- Make real network requests

## Common Patterns

### Access Control Testing
```typescript
it('Feature should not be available for non-admins', () => {
  asProjectAdminUser();
  cy.visitWithLogin('/admin-page');
  pageNotfound.findPage().should('exist');
});
```

### Interceptor Patterns
```typescript
// GET request
cy.interceptOdh('GET /api/items', [mockItem({})]);

// POST with wait
cy.interceptOdh('POST /api/items', { success: true }).as('createItem');
cy.wait('@createItem').then((interception) => {
  expect(interception.request.body).to.containSubset({ name: 'Test' });
});

// Error response
cy.interceptOdh('POST /api/items', {
  success: false,
  error: 'Item already exists',
});
```

### Page Object Pattern
```typescript
class FeaturePage {
  visit() {
    cy.visitWithLogin('/path');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findButton() {
    return cy.findByTestId('button-id');
  }
}

export const featurePage = new FeaturePage();
```

### Using in Tests
```typescript
it('should click button', () => {
  featurePage.visit();
  featurePage.findButton().click(); // Good ✅
  
  // Never do this:
  cy.findByTestId('button-id').click(); // Bad ❌
});
```

## Mock Data

### Using Existing Mocks
```typescript
import { mockDashboardConfig, mockK8sResourceList } from '#~/__mocks__';
import { mockConnectionTypeConfigMap } from '#~/__mocks__/mockConnectionType';

cy.interceptOdh('GET /api/config', mockDashboardConfig({ 
  disableFeature: false 
}));
```

### Creating New Mocks
```typescript
// In __mocks__/mockFeature.ts
export const mockFeature = (options?: Partial<Feature>): Feature => ({
  id: 'test-id',
  name: 'Test Name',
  enabled: true,
  ...options, // Override with provided options
});
```

## Running Tests

```bash
# All mock tests
npm run test:cypress-ci

# Specific test
npm run test:cypress-ci -- --spec "**/featureName.cy.ts"

# Development mode (2 terminals)
npm run cypress:server:dev    # Terminal 1
npm run cypress:open:mock     # Terminal 2
```

## Implementation Checklist

Before starting:
- [ ] Review JIRA ticket and requirements
- [ ] Search for similar tests in `tests/mocked/`
- [ ] Check `__mocks__` for reusable mocks
- [ ] Review existing page objects in `pages/`

During implementation:
- [ ] Use `beforeEach` for setup
- [ ] Mock ALL network requests
- [ ] Use page objects (no direct selectors)
- [ ] Create `data-testid` if missing
- [ ] Test admin and non-admin access
- [ ] Test error scenarios
- [ ] Include accessibility testing

After implementation:
- [ ] Lint: `cd frontend && npm run test:lint && npm run test:fix`
- [ ] Run test locally
- [ ] Verify passes 2-3 times consistently
- [ ] No direct `cy.findByTestId` in tests
- [ ] All mocks from `__mocks__` folder
- [ ] Zero linting errors

## Common Test Scenarios

### Table Testing
```typescript
// Sorting
featurePage.findTableHeaderButton('Name').click();
featurePage.findTableHeaderButton('Name').should(be.sortAscending);

// Rows
const row = featurePage.getTableRow('Item Name');
row.shouldHaveName('Item Name');
row.findKebabAction('Delete').click();
```

### Modal Testing
```typescript
deleteModal.shouldBeOpen();
deleteModal.findSubmitButton().should('be.disabled');
deleteModal.findInput().fill('Item Name');
deleteModal.findSubmitButton().should('be.enabled').click();
cy.wait('@deleteItem');
deleteModal.shouldBeOpen(false);
```

### Form Validation
```typescript
featurePage.findSubmitButton().should('be.disabled');
featurePage.findNameInput().type('Test');
featurePage.findSubmitButton().should('be.enabled');
featurePage.findNameInput().clear();
featurePage.findNameHint().should(be.error);
```

## Getting Help

1. Review existing tests in `frontend/src/__tests__/cypress/cypress/tests/mocked/`
2. Check page objects in `frontend/src/__tests__/cypress/cypress/pages/`
3. Review mocks in `frontend/src/__mocks__/`
4. Read full rules: `.cursor/rules/cypress-mock.mdc`
5. Read testing docs: `docs/testing.md`

## Key Files to Reference

- **Example Tests**: `tests/mocked/connectionTypes/*.cy.ts`, `tests/mocked/clusterSettings/*.cy.ts`
- **Page Objects**: `pages/connectionTypes.ts`, `pages/clusterSettings.ts`
- **Mocks**: `__mocks__/mockConnectionType.ts`, `__mocks__/mockClusterSettings.ts`
- **Utils**: `utils/mockUsers.ts`, `utils/should.ts`, `utils/pagination.ts`



