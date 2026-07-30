---
name: coverage-boost
description: Parses Jest coverage reports to find uncovered lines, then generates targeted unit tests to increase coverage for a specific package or file. Use when you want to improve test coverage for a particular area of the codebase.
---

# Coverage Boost — ODH Dashboard

Generate targeted unit tests for uncovered code. Accepts a package name, file path, or directory. Runs coverage, identifies gaps, and writes tests that follow project conventions.

## Usage

```
/coverage-boost <target>
```

Where `<target>` is one of:
- A package name: `gen-ai`, `model-serving`, `gpuaas`
- A file path: `packages/gpuaas/src/utils/parseK8sQuantity.ts`
- A directory: `frontend/src/concepts/pipelines/`

If no target is provided, ask the user what to cover.

## Input validation

Before executing any command, validate the target argument:

- **Package names** must match `^[a-zA-Z0-9._-]+$` — reject anything else.
- **File/directory paths** must resolve (via `realpath` or `path.resolve`) to a location inside the repository root — reject paths outside the repo or containing `..` traversal.
- **Reject shell metacharacters** — if the target contains `;`, `|`, `&`, `` ` ``, `$`, `(`, `)`, `{`, `}`, `<`, `>`, or newlines, stop and ask the user to provide a clean target.
- **Quote all expansions** in shell commands — always wrap targets in single quotes.

## Workflow

### Step 1: Run coverage and parse the report

Create a timestamp marker, run the appropriate coverage command, then find the report.

**For a specific package:**
```bash
COVERAGE_MARKER=$(mktemp)

npx turbo run test-unit-coverage --filter='@odh-dashboard/<package-name>' 2>&1
```

**For the frontend core:**
```bash
COVERAGE_MARKER=$(mktemp)

cd /path/to/repo/frontend
npx jest --silent --coverage --collectCoverageFrom='src/<target-path>/**/*.{ts,tsx}' 2>&1
```

**For a single file:**
```bash
COVERAGE_MARKER=$(mktemp)

npx jest --silent --coverage --collectCoverageFrom='<relative-path-to-file>' --findRelatedTests '<relative-path-to-file>' 2>&1
```

After running, parse the JSON coverage report to extract uncovered lines:

```bash
COVERAGE_FILE=$(find . -path "*/jest-coverage/coverage-final.json" -newer "$COVERAGE_MARKER" 2>/dev/null | head -1)
rm -f "$COVERAGE_MARKER"

# If targeting a specific file, extract its uncovered lines
node -e "
const cov = require('$COVERAGE_FILE');
const target = '<absolute-path-to-file>';
const entry = cov[target];
if (!entry) { console.log('File not in coverage report'); process.exit(0); }
const uncovered = Object.entries(entry.s)
  .filter(([,count]) => count === 0)
  .map(([id]) => entry.statementMap[id]);
console.log(JSON.stringify({ uncoveredStatements: uncovered.length, totalStatements: Object.keys(entry.s).length, lines: uncovered }, null, 2));
"
```

### Step 2: Identify high-value targets

Prioritize files for test generation based on:

1. **Utility functions** (`utils/`, `helpers/`) — pure functions are easiest to test and give the most coverage per test
2. **Custom hooks** (`hooks/`, `use*.ts`) — test with `testHook` from `@odh-dashboard/jest-config/hooks`
3. **Components with logic** — components that have conditional rendering, event handlers, or state management
4. **Skip**: Type-only files (`*Types.ts`, `*.d.ts`), re-export barrels (`index.ts`), config files, and files with only constants

For each target file, read its source code to understand what's uncovered.

### Step 3: Generate tests

Follow these conventions (see `/.claude/rules/unit-tests.md` for full details):

**File placement**: `__tests__/<FileName>.spec.ts(x)` adjacent to the source file.

**Test structure**:
```typescript
import { render, screen } from '@testing-library/react';
// or for hooks:
import { testHook } from '@odh-dashboard/jest-config/hooks';

describe('FunctionOrComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle the happy path', () => {
    // Test the primary behavior
  });

  it('should handle edge case X', () => {
    // Test boundary conditions, null inputs, empty arrays
  });

  it('should handle error state', () => {
    // Test error paths if applicable
  });
});
```

**Mocking**:
- Use `jest.mocked()` for type-safe mocks
- Check `@odh-dashboard/internal/__mocks__` for shared mock data
- Mock external dependencies at the module level with `jest.mock()`
- For k8s resources, use mock factories from `__mocks__/mockResourceData.ts`

**Hook tests**:
```typescript
import { testHook } from '@odh-dashboard/jest-config/hooks';

describe('useMyHook', () => {
  it('should return initial state', () => {
    const result = testHook(useMyHook)('arg');
    expect(result).hookToStrictEqual({ data: null, loaded: false });
    expect(result).hookToHaveUpdateCount(1);
  });

  it('should load data', async () => {
    const result = testHook(useMyHook)('arg');
    await result.waitForNextUpdate();
    expect(result).hookToStrictEqual({ data: 'value', loaded: true });
    expect(result).hookToHaveUpdateCount(2);
  });
});
```

### Step 4: Verify the tests pass

```bash
# Run the new tests
npx jest --silent <path-to-new-test-file>

# Re-run coverage to confirm improvement
npx jest --silent --coverage --collectCoverageFrom='<target-file>' --findRelatedTests <target-file>
```

Fix any test failures before reporting results.

### Step 5: Report results

After generating tests, summarize:
- Files covered and number of new tests added
- Coverage improvement (before/after percentages if available)
- Any files skipped and why (type-only, no testable logic, etc.)
- Suggested next targets for further coverage improvement

## Important notes

- **Don't test implementation details** — test behavior and outputs, not internal state
- **Don't test trivial code** — simple getters, re-exports, and constant definitions don't need tests
- **Don't test framework behavior** — don't test that React renders, that PatternFly components work, etc.
- **Focus on business logic** — conditional rendering, data transformations, validation, error handling
- **One assertion per behavior** — each `it()` block should test one logical behavior
- **Use realistic mock data** — leverage existing mock factories from `__mocks__/` directories
