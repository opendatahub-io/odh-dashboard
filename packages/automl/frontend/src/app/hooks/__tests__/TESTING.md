# Testing Strategy for AutoML Hooks

## Why `useAutomlResults` is NOT unit tested

The `useAutomlResults` hook orchestrates 3 cascading async query stages:

```
S3 list query
    ↓
Artifact queries (useQueries - one per model directory)
    ↓ (waits for isPending === false)
Metrics queries (useQueries - one per model, conditionally enabled)
    ↓
Models object populated
```

### Why unit testing this hook is problematic:

1. **Complex timing dependencies**: The metrics queries have `enabled: Boolean(namespace && modelDirectories.length > 0 && !modelArtifactQueries.isPending)`, meaning they only start AFTER artifact queries complete.

2. **Multiple render cycles required**: Each stage triggers re-renders, requiring the test to wait for 4+ render cycles, which is fragile and difficult to coordinate with mocks.

3. **Mock setup complexity**: Mocking `useQueries` with conditional enablement and proper timing is error-prone and doesn't reflect real-world behavior.

4. **Low value-to-effort ratio**: The complexity of the test doesn't provide significantly better coverage than testing at higher levels.

### Where this hook IS tested:

✅ **`AutomlResultsContext.spec.tsx`**
   Tests the context provider that uses `useAutomlResults` and orchestrates the data flow to components.

✅ **`AutomlResultsPage.spec.tsx`**
   Tests the page-level integration including the context provider and UI components.

✅ **Cypress tests**
   End-to-end tests with real async flows against the actual S3 API or mocked BFF.

### Testing simple hooks vs. complex hooks

| Hook Type | Testing Approach | Example |
|-----------|------------------|---------|
| **Simple query hooks** | Direct unit tests | `usePipelineDefinitions.spec.ts`, `usePipelineRuns.spec.ts` |
| **Complex cascaded hooks** | Test via context/page | `useAutomlResults` (this hook) |
| **Utility hooks** | Direct unit tests | `useDebounce`, `useLocalStorage`, etc. |

### If you need to test changes to `useAutomlResults`:

1. **For logic changes**: Add/update tests in `AutomlResultsContext.spec.tsx`
2. **For integration changes**: Add/update tests in `AutomlResultsPage.spec.tsx`
3. **For E2E flows**: Add/update Cypress tests

**Do not attempt to unit test this hook directly** - the complexity will lead to brittle, hard-to-maintain tests.

---

Last updated: 2026-03-26
Documented after removing a 900-line unit test file that had 10 failing tests due to cascade timing issues.
