# Mock-to-Unit Test Conversion Skill

Analyzes Cypress mock tests and converts them to Jest unit tests to improve CI performance.

## Trigger

User requests conversion of mock tests to unit tests, or asks to analyze which mock tests should be unit tests.

## Context

ODH Dashboard has 261 Cypress mock test files consuming ~35 minutes of CI time. Many of these tests are fine-grained UI tests that could be faster Jest unit tests. This skill identifies conversion candidates and performs the conversion.

## What Qualifies as a Unit Test Candidate

A Cypress mock test should be converted to a Jest unit test when it:

1. **Tests isolated component logic** — Form validation, conditional rendering, button states
2. **Has minimal user interaction** — Simple clicks, input changes, no complex multi-step flows
3. **Tests pure UI state** — Component props driving display, error states, loading states
4. **Has no complex page navigation** — Stays within a single component/form context
5. **Tests utility functions or hooks** — Business logic that doesn't need the full Cypress stack

**Should stay as Cypress mock tests**:
- Multi-step workflows (wizards, multi-page flows)
- Complex table interactions (sorting, filtering, pagination together)
- Modal flows with multiple states
- Integration between multiple components
- Navigation between different pages
- Tests requiring realistic DOM rendering and event propagation

## Process

### Phase 1: Analysis

Run this phase when the user asks to analyze mock tests:

```bash
# Get all mock test files sorted by size
find packages/cypress/cypress/tests/mocked -name "*.cy.ts" -type f -exec wc -c {} + | sort -rn > /tmp/mock-test-sizes.txt

# Count tests per file (rough heuristic)
for file in $(find packages/cypress/cypress/tests/mocked -name "*.cy.ts" -type f); do
  count=$(grep -c "^\s*it(" "$file" || echo 0)
  echo "$count $file"
done | sort -rn > /tmp/mock-test-counts.txt
```

For each file in the top 20 by size or test count:

1. **Read the test file**
2. **Analyze each `it()` block** — Extract test name, what it's testing, complexity
3. **Categorize as "Unit Test Candidate" or "Stay Mock"** based on criteria above
4. **Generate justification** — Brief reason why it should/shouldn't convert

Output a markdown report:

```markdown
# Mock Test Conversion Analysis

## File: modelServing/modelServingDeploy.cy.ts

**Size**: 119,811 bytes  
**Tests**: 42 tests  
**Conversion Candidates**: 18 tests (43%)  

### Unit Test Candidates

1. **"should disable submit button when form is invalid"**
   - **Why**: Tests simple form validation logic
   - **Complexity**: Low (checks button state based on input)
   - **Conversion effort**: Easy
   - **Estimated speedup**: 2-3 seconds → <100ms

2. **"should show error message when deployment name is invalid"**
   - **Why**: Tests error display logic
   - **Complexity**: Low (conditional rendering)
   - **Conversion effort**: Easy
   - **Estimated speedup**: 2-3 seconds → <100ms

### Should Stay as Mock Tests

1. **"should complete full deployment wizard flow"**
   - **Why**: Multi-step wizard with navigation
   - **Complexity**: High (5 steps, multiple pages)
   - **Reason to stay**: Integration test, complex flow

## Summary

**Total files analyzed**: 20  
**Total tests**: 487  
**Unit test candidates**: 142 (29%)  
**Estimated CI time savings**: ~15-20 minutes  
```

### Phase 2: Conversion

Run this phase when the user selects specific tests to convert:

1. **Read the Cypress mock test file**
2. **Read related source files** — Find the components being tested
3. **Identify existing unit tests** — Check if `__tests__/` exists for these components
4. **For each test marked for conversion**:

   a. **Extract the test logic**:
   - Test name and description
   - Setup (mocks, props)
   - Actions (clicks, input changes)
   - Assertions (what's being validated)

   b. **Convert to Jest/RTL pattern**:
   ```typescript
   // Cypress mock test pattern
   it('should disable submit button when form is invalid', () => {
     modelServingWizard.visit();
     modelServingWizard.findNameInput().clear();
     modelServingWizard.findSubmitButton().should('be.disabled');
   });

   // Converted to Jest unit test
   it('should disable submit button when form is invalid', () => {
     render(<DeploymentForm project={mockProject} />);
     const nameInput = screen.getByTestId('deployment-name-input');
     const submitButton = screen.getByTestId('submit-button');
     
     fireEvent.change(nameInput, { target: { value: '' } });
     expect(submitButton).toBeDisabled();
   });
   ```

   c. **Convert mocks**:
   - `cy.interceptOdh()` → `jest.mock()` for API modules
   - Page object calls → direct RTL queries
   - `cy.wait()` → React Testing Library's `waitFor()`

   d. **Convert assertions**:
   - `.should('be.disabled')` → `expect(...).toBeDisabled()`
   - `.should('have.text', 'X')` → `expect(...).toHaveTextContent('X')`
   - `.should('exist')` → `expect(...).toBeInTheDocument()`

5. **Create or update unit test file**:
   - Follow naming convention: `ComponentName.test.tsx`
   - Location: `src/components/path/__tests__/ComponentName.test.tsx`
   - Group related tests in `describe()` blocks
   - Use `beforeEach()` for common setup
   - Import from `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`

6. **Run the new unit tests**:
   ```bash
   npm run test-unit -- ComponentName.test.tsx
   ```

7. **Update the original mock test file**:
   - Remove converted tests
   - Add a comment referencing the unit tests:
   ```typescript
   // Note: Simple form validation tests moved to __tests__/DeploymentForm.test.tsx
   // This file now focuses on integration and workflow tests
   ```

8. **Generate conversion report**:
   ```markdown
   # Conversion Report: modelServingDeploy.cy.ts

   ## Tests Converted: 18

   ### Created Unit Test Files
   - `src/components/deploy/__tests__/DeploymentForm.test.tsx` (12 tests)
   - `src/components/deploy/__tests__/ModelSourceStep.test.tsx` (6 tests)

   ### Tests Remaining in Mock File: 24
   - Multi-step wizard flows
   - Integration between steps
   - Complex table interactions

   ## Performance Impact
   - **Before**: 42 tests @ ~3s each = ~126s
   - **After**: 24 mock tests @ ~3s = ~72s, 18 unit tests @ ~50ms = ~1s
   - **Total**: ~73s (42% reduction for this file)
   - **CI impact**: Saves ~53s per run

   ## Next Steps
   1. Run full test suite: `npm run test`
   2. Verify mock tests still pass: `npm run test:cypress-ci`
   3. Check code coverage: `npm run test-unit-coverage`
   ```

## Conversion Patterns

### Pattern 1: Form Validation

**Before (Cypress mock)**:
```typescript
it('should validate required fields', () => {
  formPage.visit();
  formPage.findNameInput().clear();
  formPage.findEmailInput().type('invalid-email');
  formPage.findSubmitButton().click();
  formPage.findNameError().should('exist');
  formPage.findEmailError().should('have.text', 'Invalid email');
});
```

**After (Jest unit)**:
```typescript
it('should validate required fields', async () => {
  const onSubmit = jest.fn();
  render(<MyForm onSubmit={onSubmit} />);
  
  const nameInput = screen.getByLabelText('Name');
  const emailInput = screen.getByLabelText('Email');
  const submitButton = screen.getByRole('button', { name: 'Submit' });
  
  await userEvent.clear(nameInput);
  await userEvent.type(emailInput, 'invalid-email');
  await userEvent.click(submitButton);
  
  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
```

### Pattern 2: Conditional Rendering

**Before (Cypress mock)**:
```typescript
it('should show advanced options when checkbox is checked', () => {
  formPage.visit();
  formPage.findAdvancedOptionsCheckbox().check();
  formPage.findAdvancedSection().should('be.visible');
});
```

**After (Jest unit)**:
```typescript
it('should show advanced options when checkbox is checked', async () => {
  render(<MyForm />);
  
  const checkbox = screen.getByRole('checkbox', { name: 'Show advanced options' });
  expect(screen.queryByTestId('advanced-section')).not.toBeInTheDocument();
  
  await userEvent.click(checkbox);
  expect(screen.getByTestId('advanced-section')).toBeInTheDocument();
});
```

### Pattern 3: Error Handling

**Before (Cypress mock)**:
```typescript
it('should display API error message', () => {
  cy.interceptOdh('POST /api/deploy', { statusCode: 400, body: { error: 'Deployment failed' } });
  formPage.visit();
  formPage.fillForm();
  formPage.findSubmitButton().click();
  formPage.findErrorAlert().should('contain.text', 'Deployment failed');
});
```

**After (Jest unit)**:
```typescript
it('should display API error message', async () => {
  const mockDeploy = jest.fn().mockRejectedValue(new Error('Deployment failed'));
  jest.mock('#~/api/deployments', () => ({ deployModel: mockDeploy }));
  
  render(<DeploymentForm />);
  
  await userEvent.type(screen.getByLabelText('Name'), 'test-deployment');
  await userEvent.click(screen.getByRole('button', { name: 'Deploy' }));
  
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Deployment failed');
  });
  expect(mockDeploy).toHaveBeenCalledTimes(1);
});
```

### Pattern 4: Hook Testing

If a test is really testing a custom hook's logic:

**Before (Cypress mock)**:
```typescript
it('should update form state when inputs change', () => {
  formPage.visit();
  formPage.findNameInput().type('Test Name');
  formPage.findDescriptionInput().type('Test Description');
  // Assertions about derived state...
});
```

**After (Jest hook test)**:
```typescript
import { testHook } from '@odh-dashboard/jest-config/hooks';

it('should update form state when inputs change', () => {
  const renderResult = testHook(useDeploymentForm)();
  
  act(() => {
    renderResult.result.current.setName('Test Name');
    renderResult.result.current.setDescription('Test Description');
  });
  
  expect(renderResult.result.current.formData).toEqual({
    name: 'Test Name',
    description: 'Test Description',
  });
  expect(renderResult).hookToHaveUpdateCount(2);
});
```

## Quality Gates

Before marking conversion complete:

1. **All new unit tests pass**: `npm run test-unit`
2. **Original mock tests still pass**: `npm run test:cypress-ci -- --spec "**/originalFile.cy.ts"`
3. **Linting passes**: `npm run lint`
4. **Type checking passes**: `npm run type-check`
5. **Code coverage maintained or improved**: `npm run test-unit-coverage`

## Output

At the end of conversion, provide:

1. **Summary report** — Files changed, tests converted, performance impact
2. **List of new unit test files** created
3. **List of modified mock test files**
4. **Next steps** for the developer

## When Not to Use This Skill

Do NOT convert:
- E2E tests (those in `cypress/tests/e2e/`)
- Complex integration tests with multiple components
- Tests that genuinely need Cypress's DOM rendering and event handling
- Tests for features without clear component boundaries
- Tests that are already fast (<500ms)

## Notes

- **Conservative approach**: When in doubt, leave as mock test
- **Preserve test coverage**: Don't reduce coverage during conversion
- **Maintain test intent**: Converted test should validate same behavior
- **Follow project conventions**: Use existing patterns from `__tests__/` files
- **Document the why**: Add comments explaining conversion decisions
