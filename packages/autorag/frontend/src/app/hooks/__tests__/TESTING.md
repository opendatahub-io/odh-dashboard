# Testing Strategy for AutoRAG Hooks

## Why `useAutoragResults` is NOT unit tested

The `useAutoragResults` hook orchestrates multiple cascading async query stages:

```
S3 list query (UUID discovery)
    ↓
Extract non-deterministic UUID from results
    ↓
Pattern list query (using the UUID path)
    ↓
Pattern detail queries (useQueries - one per pattern)
    ↓
Patterns object populated
```

### Why unit testing this hook is problematic:

1. **Non-deterministic path resolution**: The hook must first discover a UUID directory from S3, then use that to construct paths for subsequent queries. This creates a dependency chain that's difficult to mock.

2. **Multiple render cycles required**: Each stage triggers re-renders, and the pattern queries don't start until the UUID is discovered and the path is constructed.

3. **Mock setup complexity**: Mocking the entire cascade requires coordinating multiple query states, timing, and conditional logic that doesn't reflect real-world behavior.

4. **Low value-to-effort ratio**: The complexity of the test doesn't provide significantly better coverage than testing at higher levels.

### Where this hook IS tested:

✅ **`AutoragResultsContext.spec.tsx`**
   Tests the context provider that uses `useAutoragResults` and orchestrates the data flow to components.

✅ **`AutoragResultsPage.spec.tsx`**
   Tests the page-level integration including the context provider and UI components.

✅ **Cypress tests**
   End-to-end tests with real async flows against the actual S3 API or mocked BFF.

### Testing simple hooks vs. complex hooks

| Hook Type | Testing Approach | Example |
|-----------|------------------|---------|
| **Simple query hooks** | Direct unit tests | `usePipelineDefinitions.spec.ts`, `usePipelineRuns.spec.ts` |
| **Complex cascaded hooks** | Test via context/page | `useAutoragResults` (this hook) |
| **Utility hooks** | Direct unit tests | `useDebounce`, `useLocalStorage`, etc. |

### If you need to test changes to `useAutoragResults`:

1. **For logic changes**: Add/update tests in `AutoragResultsContext.spec.tsx`
2. **For integration changes**: Add/update tests in `AutoragResultsPage.spec.tsx`
3. **For E2E flows**: Add/update Cypress tests

**Do not attempt to unit test this hook directly** - the complexity will lead to brittle, hard-to-maintain tests.

---

Last updated: 2026-03-26
Documented after removing a failing unit test file following the same pattern as AutoML.
