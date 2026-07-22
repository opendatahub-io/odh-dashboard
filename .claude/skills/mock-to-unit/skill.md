---
name: mock-to-unit
description: Convert fine-grain Cypress mock tests to Jest unit tests based on CI execution time
trigger: /mock-to-unit
---

# Mock-to-Unit Test Conversion

Converts fine-grain UI Cypress mock tests to faster Jest unit tests, focusing on CI execution time savings.

## Conversion Criteria

**CRITICAL RULE**: Convert tests that assert RENDERED STATE ONLY with:
- ✅ **NO user interaction** (no clicks, typing, multi-step sequences)
- ✅ **NO API waits** (no `cy.wait('@alias')` for network requests)

**Formula**: `NO interaction + NO waits = FINE-GRAIN UI = CONVERT`

**KEEP in Cypress (workflow tests)**:
- ❌ User actions (clicks, typing, form submissions)
- ❌ API calls and waiting for responses
- ❌ Multi-step sequences
- ❌ Navigation between pages
- ❌ Modal/wizard flows with state transitions

## Approach

### 1. Identify Bottleneck Files (CI Execution Time)

**DO NOT use file size** — focus on actual CI execution time from GitHub Actions runs.

```bash
# Example GitHub Actions URL:
# https://github.com/opendatahub-io/odh-dashboard/actions/runs/29022853065

# Find the "Run Cypress mocked tests" job
# Look at execution times per file (e.g., "connections.cy.ts (15m47s)")
# Prioritize the TOP 3 LONGEST-running files
```

**Remember**: Cypress mock tests run in parallel — total CI time = longest job time, NOT sum of all jobs.

### 2. Analyze Tests in Target File

For each test in the target file, count interactions:

```python
# Quick classification script
import re

def count_interactions(test_content):
    # User interactions
    clicks = len(re.findall(r'\.click\(', test_content))
    types = len(re.findall(r'\.type\(', test_content))
    selects = len(re.findall(r'\.select\(', test_content))
    checks = len(re.findall(r'\.check\(', test_content))
    clears = len(re.findall(r'\.clear\(', test_content))
    submits = len(re.findall(r'\.submit\(', test_content))
    triggers = len(re.findall(r'\.trigger\(', test_content))
    
    # API/network interactions
    waits = len(re.findall(r'cy\.wait\(', test_content))
    visits = len(re.findall(r'cy\.visit\(', test_content))
    requests = len(re.findall(r'cy\.request\(', test_content))
    intercepts = len(re.findall(r'cy\.intercept\(', test_content))
    
    total = (clicks + types + selects + checks + clears + submits + triggers +
             waits + visits + requests + intercepts)
    
    # Known non-interaction Cypress commands and chaining methods
    KNOWN_CY = {
        'get', 'findByTestId', 'findByRole', 'findByText', 'findByLabelText',
        'findByPlaceholderText', 'findAllByTestId', 'findAllByRole', 'findAllByText',
        'contains', 'find', 'wrap', 'log', 'wait', 'visit', 'request', 'intercept',
        'fixture', 'exec', 'task', 'window', 'document', 'title', 'url', 'hash',
        'location', 'reload', 'go', 'viewport', 'clock', 'tick', 'stub', 'spy',
        'readFile', 'writeFile', 'screenshot', 'scrollTo', 'focused', 'within',
    }
    KNOWN_CHAIN = {
        'should', 'and', 'then', 'its', 'invoke', 'as', 'each', 'spread',
        'find', 'findByTestId', 'findByRole', 'findByText', 'findByLabelText',
        'findByPlaceholderText', 'findAllByTestId', 'findAllByRole', 'findAllByText',
        'contains', 'filter', 'not', 'first', 'last', 'eq', 'next', 'prev',
        'parent', 'parents', 'children', 'siblings', 'closest', 'within',
        'scrollIntoView', 'scrollTo', 'wait', 'wrap', 'focus', 'blur',
        'click', 'type', 'select', 'check', 'clear', 'submit', 'trigger',
        'dblclick', 'rightclick', 'uncheck',
        'exist', 'be', 'have', 'contain', 'match', 'equal', 'include',
    }
    
    # Flag only genuinely unrecognized commands
    cy_cmds = re.findall(r'cy\.(\w+)\(', test_content)
    chain_cmds = re.findall(r'\.(\w+)\(', test_content)
    has_unknown = any(c not in KNOWN_CY for c in cy_cmds) or \
                  any(c not in KNOWN_CHAIN for c in chain_cmds)
    
    # Conversion rule
    if has_unknown and total == 0:
        return "KEEP"  # Conservative: unknown commands mean workflow test
    elif total == 0:
        return "CONVERT"  # No interactions = fine-grain UI test
    elif clicks == 1 and total == 1:
        return "MAYBE"  # Single click to reveal UI
    else:
        return "KEEP"  # Workflow/integration test
```

**Expected conversion rate**: 40-60% for typical files.

### 3. Check for Duplicate Coverage

Before converting, check if existing Jest unit tests already cover the same behavior:

```bash
# Find existing unit tests for the component (repository-wide search)
# Search patterns:
# - __tests__/ directories (co-located or in packages)
# - Adjacent test files (*.spec.ts, *.spec.tsx, *.test.ts, *.test.tsx)
# - Use component name without restricting to specific file extensions

# Example: search for ConnectionsTable tests
find . -type f \( -name "*ConnectionsTable*.spec.*" -o -name "*ConnectionsTable*.test.*" \) \
  -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.cache/*"

# Alternative: use grep to find files importing/testing the component
grep -rl "ConnectionsTable" --include="*.spec.*" --include="*.test.*" \
  frontend/ packages/ distributions/

# Read the test file(s) and compare coverage
# If Jest tests already cover it → DELETE the Cypress test (it's a duplicate)
# If no coverage exists → CONVERT the Cypress test to Jest
```

**Actions**:
- **Duplicate coverage** → Remove Cypress test, add comment pointing to existing Jest test
- **No existing coverage** → Convert Cypress test to new Jest unit test

### 4. Convert Fine-Grain Tests to Jest

**Target components**:
- Table row display components
- Status labels
- Conditional rendering based on props
- Simple UI state (loading, error, empty states)

**Conversion pattern**:

```typescript
// Cypress mock test (connections.cy.ts)
it('Display project-scoped label for a notebook in workbenches table', () => {
  initIntercepts();
  projectDetails.visitSection('test-project', 'workbenches');
  
  // Just checking rendered state - no interaction!
  workbenchPage.findNotebookRow('test-notebook')
    .findByTestId('project-scoped-label')
    .should('exist');
});

// Converted Jest unit test (NotebookTableRow.spec.tsx)
it('should display project-scoped label when notebook uses project image', () => {
  const notebook = mockNotebookK8sResource({
    opts: {
      metadata: {
        annotations: {
          'notebooks.opendatahub.io/last-image-selection': 'test-imagestream:1.2',
        },
      },
    },
  });
  
  renderRow(notebook);
  
  expect(screen.getByTestId('project-scoped-label')).toBeInTheDocument();
});
```

**Key differences**:
- ✅ No Cypress intercepts needed (mock data directly)
- ✅ No page navigation (render component directly)
- ✅ Significantly faster execution (measured ~390x faster for NotebookTableRow: ~50ms Jest vs ~19.5s Cypress)
- ✅ Isolated component testing

**Note**: Speedup varies by test complexity and system. Measured results show 100-1000x improvements for fine-grain UI tests. Always measure before/after on your specific tests.

### 5. Mock Data Pattern

**ALWAYS use `@odh-dashboard/internal/__mocks__`**:

```typescript
import { mockNotebookK8sResource } from '#~/__mocks__/mockNotebookK8sResource';
import { mockNotebookState } from '#~/__mocks__/mockNotebookState';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';

const renderRow = (notebook = mockNotebookK8sResource({})) => {
  const notebookState = mockNotebookState(notebook);
  return render(
    <MemoryRouter>
      <ProjectDetailsContext.Provider value={mockContextValue}>
        <table><NotebookTableRow obj={notebookState} /></table>
      </ProjectDetailsContext.Provider>
    </MemoryRouter>
  );
};
```

### 6. Update Cypress Mock Test

**Option A: If converted to Jest**:
```typescript
// CONVERTED TO JEST UNIT TESTS:
// Tests for table row display (project-scoped label, image display, hardware profile, status)
// are now in:
// frontend/src/pages/projects/screens/detail/notebooks/__tests__/NotebookTableRow.spec.tsx
//
// Removed tests:
// - "Display project-scoped label for a notebook in workbenches table" (line 1192)
// - Total: 1 test converted, now 6 Jest tests running in ~50ms (was ~19.5s in Cypress)

// it('Display project-scoped label...', () => { ... }) ← REMOVED
```

**Option B: If duplicate of existing Jest test**:
```typescript
// CONVERTED TO JEST UNIT TESTS:
// These tests are covered by existing unit tests in:
// frontend/src/pages/projects/screens/detail/connections/__tests__/ConnectionsTable.spec.tsx
//
// Removed tests:
// - "Empty state when no data connections are available" (line 51)
// - "List connections" (line 57)
//
// The ConnectionsTable.spec.tsx already tests:
// - Rendering table with connections
// - Showing connection name, type, description
// - Showing connection type display name
// - Showing connected resources

// it('Empty state when no data connections are available', () => { ... }) ← REMOVED
// it('List connections', () => { ... }) ← REMOVED
```

### 7. Verify and Measure

```bash
# Run new Jest unit tests
npm run test -- NotebookTableRow.spec.tsx

# Run updated Cypress mock tests (verify remaining tests still pass)
npm run test:cypress-ci -- --spec "**/workbench.cy.ts"

# Lint everything
npm run lint:fix

# IMPORTANT: Committing and pushing requires explicit human approval
# After running the above verification steps:
# 1. Review all changes carefully
# 2. Ask the user if they want to commit and push
# 3. Only proceed if the user explicitly approves

# When approved, the user or developer can run:
# git add -A
# git commit -m "test: Convert fine-grain UI tests from Cypress to Jest"
# git push

# Measure CI time savings:
# - Before: Longest Cypress job time (e.g., 15m47s)
# - After: New longest Cypress job time
# - Savings: Difference in parallel execution time
```

## Real-World Results

**File: `workbench.cy.ts` (14m50s → target for conversion)**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cypress test time | ~19.5s | Removed | N/A |
| Jest test time | N/A | ~50ms | 1800x faster |
| Jest test count | N/A | 6 tests | Better coverage |
| Total CI time | 14m50s | TBD | Target: 30-60s reduction |

**File: `connections.cy.ts` (15m47s → target for conversion)**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Duplicate tests | 2 Cypress | 0 (deleted) | Reduced redundancy |
| Existing coverage | Jest unit | Jest unit | Already covered |

## Skill Usage

```bash
# Analyze top CI bottleneck files
/mock-to-unit analyze

# Convert specific file
/mock-to-unit convert packages/cypress/cypress/tests/mocked/projects/tabs/workbench.cy.ts
```

## Quality Checklist

Before committing:

- [ ] Identified target file from actual CI execution time (not file size)
- [ ] Counted interactions for each test (clicks, waits, types)
- [ ] Checked for duplicate coverage in existing Jest tests
- [ ] Converted fine-grain UI tests (NO interaction + NO waits)
- [ ] Used `@odh-dashboard/internal/__mocks__` for all mock data
- [ ] Added clear comments to Cypress file documenting what was converted/removed
- [ ] Verified new Jest tests pass
- [ ] Verified remaining Cypress tests pass
- [ ] Fixed all linting errors
- [ ] Committed with clear message
- [ ] Pushed and tracked CI time savings

## Common Mistakes

❌ **Using file size instead of CI execution time** — Size ≠ execution time  
❌ **Converting workflow tests** — Tests with clicks/waits/API calls should stay in Cypress  
❌ **Not checking for duplicates** — Remove redundant Cypress tests already covered by Jest  
❌ **Inline mock data** — Always use `@odh-dashboard/internal/__mocks__`  
❌ **Forgetting to document removals** — Add comments explaining what was converted/removed  

✅ **Focus on CI bottlenecks** — Use actual GitHub Actions execution times  
✅ **Convert fine-grain UI only** — NO interaction + NO waits = convert  
✅ **Check for duplicates first** — Delete if Jest already covers it  
✅ **Measure before/after** — Track actual CI time savings  
