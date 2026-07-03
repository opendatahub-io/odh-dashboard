# Mock-to-Unit Conversion Skill Instructions

## Usage

```bash
/mock-to-unit [analyze|convert] [file-path]
```

### Commands

1. **`/mock-to-unit analyze`** — Analyze all mock tests and generate conversion report
2. **`/mock-to-unit analyze <file-path>`** — Analyze specific mock test file
3. **`/mock-to-unit convert <file-path>`** — Convert specific mock test file

## Phase 1: Analysis

When running analysis mode:

1. **Find mock test files**:
   ```bash
   find packages/cypress/cypress/tests/mocked -name "*.cy.ts" -type f
   ```

2. **For each file, extract metrics**:
   - File size (bytes)
   - Test count (count of `it()` or `it.only()` blocks)
   - Describe blocks (test organization)
   - Intercept count (complexity indicator)
   - Page object usage (indicates integration level)

3. **Read each file and analyze tests**:
   - **Unit test candidate indicators**:
     - Single component being tested
     - Simple assertions (1-3 per test)
     - No multi-step workflows
     - Tests form validation, error states, conditional rendering
     - Uses `findByTestId` for single elements, not complex chains
   
   - **Should stay mock indicators**:
     - Multiple `cy.wait()` calls (workflow steps)
     - Page navigation (`visit()` multiple times)
     - Complex table operations (sort + filter + pagination together)
     - Modal flows with state transitions
     - Tests that verify integration between components

4. **Generate report** (see skill.md for format)

## Phase 2: Conversion

When running conversion mode:

1. **Read the target mock test file**
2. **Identify the components under test**:
   - Look at page object imports
   - Trace back to actual component files
   - Find component file paths (e.g., `src/components/deploy/DeploymentForm.tsx`)

3. **Check for existing unit tests**:
   ```bash
   # Check if __tests__ directory exists
   find packages frontend -path "*/__tests__/*" -name "ComponentName.test.tsx"
   ```

4. **For each test marked for conversion**:

   a. **Extract test structure**:
   ```typescript
   it('test name', () => {
     // SETUP: Visit page, intercepts, mocks
     // ACTIONS: User interactions
     // ASSERTIONS: What's being validated
   });
   ```

   b. **Convert to unit test**:
   ```typescript
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import userEvent from '@testing-library/user-event';
   import '@testing-library/jest-dom';
   
   describe('ComponentName', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });
     
     it('test name', async () => {
       // Mock dependencies
       const mockFn = jest.fn();
       
       // Render component
       render(<ComponentName prop={value} />);
       
       // Interact
       const button = screen.getByRole('button', { name: 'Submit' });
       await userEvent.click(button);
       
       // Assert
       expect(mockFn).toHaveBeenCalled();
     });
   });
   ```

   c. **Map Cypress patterns to Jest**:
   
   | Cypress Mock | Jest Unit |
   |--------------|-----------|
   | `cy.findByTestId('x')` | `screen.getByTestId('x')` |
   | `.should('be.disabled')` | `expect(...).toBeDisabled()` |
   | `.should('have.text', 'X')` | `expect(...).toHaveTextContent('X')` |
   | `.should('exist')` | `expect(...).toBeInTheDocument()` |
   | `.should('not.exist')` | `expect(...).not.toBeInTheDocument()` |
   | `.type('text')` | `await userEvent.type(el, 'text')` |
   | `.click()` | `await userEvent.click(el)` |
   | `.check()` | `await userEvent.click(checkbox)` |
   | `.clear()` | `await userEvent.clear(input)` |
   | `cy.wait('@alias')` | `await waitFor(() => expect(...))` |
   | `cy.interceptOdh(...)` | `jest.mock('#~/api/...')` |

5. **Create unit test file**:
   - Path: Find component source file, create `__tests__` sibling directory
   - File: `ComponentName.test.tsx`
   - Structure: Import dependencies, describe block, beforeEach, tests

6. **Update original mock test**:
   - Remove converted tests
   - Add comment at top:
   ```typescript
   // Note: Simple validation and state tests moved to:
   // - src/components/deploy/__tests__/DeploymentForm.test.tsx
   // This file focuses on integration and multi-step workflows
   ```

7. **Verify conversion**:
   ```bash
   # Run new unit tests
   npm run test-unit -- ComponentName.test.tsx
   
   # Run remaining mock tests
   npm run test:cypress-ci -- --spec "**/originalFile.cy.ts"
   
   # Check coverage
   npm run test-unit-coverage
   ```

## Conversion Decision Tree

```
Is this test...

├─ Testing a single component in isolation?
│  ├─ YES → Continue evaluation
│  └─ NO (multiple components) → KEEP AS MOCK
│
├─ Testing simple state/props/rendering?
│  ├─ YES → CONVERT TO UNIT
│  └─ NO → Continue evaluation
│
├─ Testing form validation or error messages?
│  ├─ YES → CONVERT TO UNIT
│  └─ NO → Continue evaluation
│
├─ Has multi-step workflow (wizard, modal flows)?
│  ├─ YES → KEEP AS MOCK
│  └─ NO → Continue evaluation
│
├─ Tests complex table interactions (sort + filter + page)?
│  ├─ YES → KEEP AS MOCK
│  └─ NO → Continue evaluation
│
├─ Tests navigation or routing?
│  ├─ YES → KEEP AS MOCK
│  └─ NO → CONVERT TO UNIT
```

## Example Conversions

### Example 1: Form Validation

**Cypress Mock Test** (`modelServingDeploy.cy.ts`):
```typescript
it('should disable submit when name is invalid', () => {
  modelServingWizard.visit();
  modelServingWizard.findNameInput().type('invalid name!');
  modelServingWizard.findSubmitButton().should('be.disabled');
  modelServingWizard.findNameError().should('contain.text', 'Invalid characters');
});
```

**Converted Unit Test** (`DeploymentForm.test.tsx`):
```typescript
it('should disable submit when name is invalid', async () => {
  render(<DeploymentForm />);
  
  const nameInput = screen.getByLabelText('Deployment name');
  const submitButton = screen.getByRole('button', { name: 'Submit' });
  
  await userEvent.type(nameInput, 'invalid name!');
  
  expect(submitButton).toBeDisabled();
  expect(screen.getByText(/invalid characters/i)).toBeInTheDocument();
});
```

### Example 2: Conditional Rendering

**Cypress Mock Test**:
```typescript
it('should show advanced section when toggled', () => {
  modelServingWizard.visit();
  modelServingWizard.findAdvancedToggle().check();
  modelServingWizard.findAdvancedSection().should('be.visible');
});
```

**Converted Unit Test**:
```typescript
it('should show advanced section when toggled', async () => {
  render(<DeploymentForm />);
  
  const advancedToggle = screen.getByRole('checkbox', { name: /advanced/i });
  expect(screen.queryByTestId('advanced-section')).not.toBeInTheDocument();
  
  await userEvent.click(advancedToggle);
  expect(screen.getByTestId('advanced-section')).toBeInTheDocument();
});
```

## Quality Checklist

Before completing conversion:

- [ ] All new unit tests pass
- [ ] Remaining mock tests still pass
- [ ] Test coverage maintained or improved
- [ ] No linting errors
- [ ] No type errors
- [ ] Mock test file updated with comment about moved tests
- [ ] Conversion report generated
- [ ] Performance impact documented

## Tips

1. **Start small** — Convert 1-2 tests first, verify they work, then continue
2. **Preserve test names** — Keep the same test descriptions for traceability
3. **Group related tests** — If converting multiple tests for same component, put them in same describe block
4. **Check for shared setup** — Use beforeEach for common mocking/rendering
5. **Mock at the right level** — Mock API modules, not internal functions
6. **Use userEvent over fireEvent** — More realistic user interactions
7. **Wait for async** — Use waitFor() for async state changes
8. **Test behavior, not implementation** — Focus on what the user sees/does

## Common Pitfalls

1. **Over-conversion** — Don't convert integration tests that genuinely need Cypress
2. **Under-mocking** — Ensure all external dependencies are mocked
3. **Missing imports** — Remember `@testing-library/jest-dom` for matchers
4. **Sync vs async** — Use `await userEvent.*()` for all interactions
5. **Query selection** — Prefer accessible queries (getByRole, getByLabelText) over getByTestId
6. **Cleanup** — Add beforeEach(() => jest.clearAllMocks())
