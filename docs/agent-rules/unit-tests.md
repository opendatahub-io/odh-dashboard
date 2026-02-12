# Unit Test Rules

Guidelines for creating Jest unit tests for ODH Dashboard utility functions, React hooks, and React components.

## When to Write Unit Tests

| Category | Requirement |
|----------|-------------|
| Utility functions, custom hooks, API utilities, data transformations, business logic | ✅ Required |
| React Components (isolated logic, render conditions, simple interactions) | ⚪ Optional |
| Simple re-exports, type definitions, configuration files | ❌ Not required |

## Framework and Tools

| Tool | Purpose |
|------|---------|
| Jest | Test runner and assertion library |
| React Testing Library | Component and hook testing utilities |
| `@odh-dashboard/jest-config` | Custom hook testing utilities and matchers |
| `@odh-dashboard/internal/__mocks__` | Shared mock data factories |

## Test File Structure

### File Naming and Location

```text
# Source: /frontend/src/foo/bar/utils.ts
# Test:   /frontend/src/foo/bar/__tests__/utils.spec.ts
```

- Use `.spec.ts` (or `.spec.tsx` for JSX)
- Place in `__tests__` directory adjacent to source

### Test Organization

One test file per source file. Use `describe('<function name>')` to group tests:

```typescript
import { getDisplayName, formatDate } from '../utils';

describe('getDisplayName', () => {
  it('should return the display name from resource metadata', () => {
    // ...
  });

  it('should return the resource name if display name is not present', () => {
    // ...
  });
});

describe('formatDate', () => {
  it('should format date in ISO format', () => {
    // ...
  });
});
```

### Test Naming

Use `it('should ...')` pattern:

```typescript
// ✅ GOOD
it('should return empty array when input is null', () => { /*...*/ });
it('should throw error for invalid parameters', () => { /*...*/ });

// ❌ BAD
it('works', () => { /*...*/ });
it('test formatDate', () => { /*...*/ });
```

## Testing React Components

### Selector Priority

**MANDATORY** priority order:

1. ✅ `data-testid` attributes (preferred)
2. ✅ Accessibility selectors: `getByRole`, `getByLabelText`, `getByPlaceholderText`
3. ❌ NEVER DOM structure (`div > form > button`)
4. ❌ NEVER CSS selectors (`.btn-primary`)

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Counter', () => {
  it('should render initial count', () => {
    render(<Counter initialCount={5} />);
    expect(screen.getByTestId('count-display')).toHaveTextContent('5');
  });

  it('should increment count when button is clicked', () => {
    render(<Counter initialCount={0} />);
    fireEvent.click(screen.getByTestId('increment-button'));
    expect(screen.getByTestId('count-display')).toHaveTextContent('1');
  });

  it('should call onChange callback when count changes', () => {
    const onChange = jest.fn();
    render(<Counter initialCount={0} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('increment-button'));
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
```

### Testing Conditional Rendering

```tsx
describe('ConditionalComponent', () => {
  it('should show loading state when loading', () => {
    render(<ConditionalComponent loading />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('should show content when not loading', () => {
    render(<ConditionalComponent loading={false} data="Hello" />);
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.getByTestId('content')).toHaveTextContent('Hello');
  });
});
```

### Testing User Interactions

```tsx
describe('FormComponent', () => {
  it('should submit form with entered values', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    render(<FormComponent onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('name-input'), 'John');
    await user.click(screen.getByTestId('submit-button'));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
  });
});
```

## Testing Utility Functions

### Basic Function Testing with Input Variations

**MANDATORY**: Test all input variations including edge cases:

```typescript
import { calculateTotal } from '../math';

describe('calculateTotal', () => {
  // Positive case
  it('should calculate total for positive numbers', () => {
    expect(calculateTotal([1, 2, 3])).toBe(6);
  });

  // Zero/empty
  it('should return zero for empty array', () => {
    expect(calculateTotal([])).toBe(0);
  });

  // Negative numbers
  it('should handle negative numbers', () => {
    expect(calculateTotal([-1, 2, -3])).toBe(-2);
  });

  // Null/undefined
  it('should return zero for null input', () => {
    expect(calculateTotal(null)).toBe(0);
  });

  it('should return zero for undefined input', () => {
    expect(calculateTotal(undefined)).toBe(0);
  });

  // Boundary values
  it('should handle single element array', () => {
    expect(calculateTotal([5])).toBe(5);
  });
});
```

### Testing Error Scenarios

Test both sync throws and async rejections:

```typescript
// Sync errors
describe('parseJSON', () => {
  it('should parse valid JSON string', () => {
    expect(parseJSON('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('should throw error for invalid JSON', () => {
    expect(() => parseJSON('invalid')).toThrow('Invalid JSON format');
  });
});

// Async errors (4xx/5xx)
describe('fetchResource', () => {
  it('should handle 404 Not Found', async () => {
    fetchMock.mockRejectedValue({ status: 404 });
    await expect(fetchResource('missing-id')).rejects.toThrow('Resource not found');
  });

  it('should handle 500 Server Error', async () => {
    fetchMock.mockRejectedValue({ status: 500 });
    await expect(fetchResource('any-id')).rejects.toThrow('Server error');
  });
});
```

## Testing React Hooks

### Hook Testing Utilities

| API | When to Use |
|-----|-------------|
| `testHook(hook)(args)` | Simple hooks with direct arguments |
| `renderHook(callback, options)` | Complex scenarios (context, props changes) |

### Custom Hook Matchers

| Matcher | Purpose |
|---------|---------|
| `hookToBe(value)` | Identity equality (`toBe`) |
| `hookToStrictEqual(value)` | Deep equality (`toStrictEqual`) |
| `hookToHaveUpdateCount(n)` | Assert render count (catch excessive re-renders) |
| `hookToBeStable(booleans?)` | Assert value unchanged from previous render |

| Method | Purpose |
|--------|---------|
| `waitForNextUpdate()` | Wait for async state updates |
| `rerender(args)` | Re-render with new arguments |

### Basic Hook Testing

```typescript
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const renderResult = testHook(useCounter)(0);
    expect(renderResult).hookToBe(0);
  });

  it('should increment counter', () => {
    const renderResult = testHook(useCounter)(0);
    renderResult.result.current.increment();
    renderResult.rerender(0);
    expect(renderResult).hookToBe(1);
  });
});
```

### Async Hook Testing with Render Count Verification

**CRITICAL**: Always verify render counts to catch performance issues from unnecessary state updates.

```typescript
import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import useFetch from '../useFetch';

describe('useFetch', () => {
  it('should return default state initially', () => {
    const renderResult = testHook(useFetch)(
      () => Promise.resolve('success'),
      'default-value',
    );

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: 'default-value' }),
    );
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should update to loaded state', async () => {
    const renderResult = testHook(useFetch)(
      () => Promise.resolve('fetched-data'),
      'default-value',
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: 'fetched-data', loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2); // Exactly 2: initial + loaded
  });

  it('should handle errors', async () => {
    const renderResult = testHook(useFetch)(
      () => Promise.reject<string>(new Error('fetch failed')),
      'default-value',
    );

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({
        data: 'default-value',
        loaded: false,
        error: new Error('fetch failed'),
      }),
    );
  });

  it('should not cause excessive re-renders on rerender with same input', async () => {
    const renderResult = testHook(useFetch)(
      () => Promise.resolve('data'),
      'default',
    );

    await renderResult.waitForNextUpdate();
    expect(renderResult).hookToHaveUpdateCount(2);

    renderResult.rerender(() => Promise.resolve('data'), 'default');
    expect(renderResult).hookToHaveUpdateCount(3); // Only the rerender, no extra updates
  });
});
```

### Testing Hook Stability

```typescript
describe('useProcessedData', () => {
  it('should return stable values on rerender with same inputs', () => {
    const renderResult = testHook(useProcessedData)({ id: '1' });

    renderResult.rerender({ id: '1' });
    expect(renderResult).hookToBeStable(); // Value identical to previous render
  });

  it('should return new values when inputs change', () => {
    const renderResult = testHook(useProcessedData)({ id: '1' });

    renderResult.rerender({ id: '2' });
    expect(renderResult).hookToBeStable({ data: false }); // data changed
  });
});
```

### Using `renderHook` for Complex Props

```typescript
import { renderHook } from '@odh-dashboard/jest-config/hooks';

describe('useFeature', () => {
  it('should handle props changes', () => {
    type Props = { enabled: boolean; name: string };

    const renderResult = renderHook(
      ({ enabled, name }: Props) => useFeature(enabled, name),
      { initialProps: { enabled: true, name: 'test' } },
    );

    expect(renderResult).hookToStrictEqual({ enabled: true, name: 'test' });

    renderResult.rerender({ enabled: false, name: 'updated' });
    expect(renderResult).hookToStrictEqual({ enabled: false, name: 'updated' });
  });
});
```

### Tuple Stability with Array Notation

For hooks returning tuples like `[data, loaded, error, refresh]`:

```typescript
it('should have stable refresh callback', async () => {
  const renderResult = testHook(useFetchState)(
    () => Promise.resolve([1, 2, 3]),
    [],
  );

  await renderResult.waitForNextUpdate();

  // [dataStable, loadedStable, errorStable, refreshStable]
  expect(renderResult).hookToBeStable([false, false, true, true]);
});
```

## Mocking

### Module Mocking with Type Safety

**MANDATORY**: Use `jest.mocked()` for type-safe mocks.

```typescript
import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { mockProjectK8sResource, mockK8sResourceList } from '@odh-dashboard/internal/__mocks__';
import { useProjects } from '../useProjects';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const k8sListResourceMock = jest.mocked(k8sListResource);

describe('useProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch and return projects', async () => {
    const mockProjects = mockK8sResourceList([
      mockProjectK8sResource({ name: 'project-1' }),
      mockProjectK8sResource({ name: 'project-2' }),
    ]);

    k8sListResourceMock.mockResolvedValue(mockProjects);

    const renderResult = testHook(useProjects)();
    await renderResult.waitForNextUpdate();

    // Assert mock was called correctly
    expect(k8sListResourceMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: expect.any(Object) }),
    );
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(renderResult.result.current.projects).toHaveLength(2);
  });
});
```

### Partial Mocking with `jest.requireActual()`

```typescript
import * as areasUtils from '../areas';

jest.mock('../areas', () => ({
  ...jest.requireActual('../areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(areasUtils.useIsAreaAvailable);

describe('useFeature', () => {
  beforeEach(() => {
    mockUseIsAreaAvailable.mockReturnValue({
      status: true,
      devFlags: {},
      featureFlags: {},
      reliantAreas: {},
      requiredComponents: {},
      requiredCapabilities: {},
      customCondition: () => false,
    });
  });

  it('should use real utility functions with mocked area check', () => {
    // Real functions from areasUtils are available
    // Only useIsAreaAvailable is mocked
  });
});
```

### Mock Return Value Patterns

```typescript
describe('with different mock scenarios', () => {
  it('should handle successful response', () => {
    apiMock.mockResolvedValue({ data: 'success' });
  });

  it('should handle error response', () => {
    apiMock.mockRejectedValue(new Error('Network error'));
  });

  it('should handle empty response', () => {
    apiMock.mockResolvedValue({ data: null });
  });
});
```

## Test Isolation

**MANDATORY**: Tests must be independent and use fresh data.

```typescript
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__';

describe('processResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ✅ GOOD: Fresh mock data per test
  it('should handle resource with metadata', () => {
    const resource = mockProjectK8sResource({ name: 'test-1' });
    const result = processResource(resource);
    expect(result.name).toBe('test-1');
  });

  it('should handle resource with display name', () => {
    const resource = mockProjectK8sResource({
      name: 'test-2',
      displayName: 'Test Display',
    });
    const result = processResource(resource);
    expect(result.displayName).toBe('Test Display');
  });
});

// ❌ BAD: Shared mutable mock data
const sharedResource = mockProjectK8sResource({ name: 'shared' });
// Tests mutating sharedResource will affect each other
```

## Common Patterns

### Fake Timers

```typescript
jest.useFakeTimers();

describe('debounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should debounce function calls', () => {
    const callback = jest.fn();
    const debounced = debounce(callback, 1000);

    debounced();
    debounced();
    debounced();

    expect(callback).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

### Nested Describe for Complex Functions

```typescript
describe('createPatchesFromDiff', () => {
  describe('basic operations', () => {
    it('should return empty array when objects are identical', () => { /*...*/ });
    it('should generate replace patches for changed values', () => { /*...*/ });
  });

  describe('nested objects', () => {
    it('should handle deeply nested changes', () => { /*...*/ });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => { /*...*/ });
    it('should handle null values', () => { /*...*/ });
  });
});
```

### Partial Object Matching

```typescript
expect(state).toEqual({
  formData: { selectedProfile: undefined },
  setFormData: expect.any(Function),
  profilesLoaded: true,
});

expect(k8sListResourceMock).toHaveBeenCalledWith(
  expect.objectContaining({
    model: expect.any(Object),
    queryOptions: expect.objectContaining({
      queryParams: { labelSelector: 'opendatahub.io/dashboard=true' },
    }),
  }),
);
```

## Best Practices Summary

### DO ✅

- One test file per source file
- `it('should ...')` naming pattern
- Test all input variations (null, undefined, empty, boundaries)
- `jest.mocked()` for type-safe mocks
- Assert mock calls with expected parameters
- Fresh mock data per test
- `beforeEach(() => jest.clearAllMocks())`
- Verify `hookToHaveUpdateCount` for hooks
- `data-testid` for component testing (preferred)
- Accessibility selectors as fallback

### DON'T ❌

- Share mutable mock data between tests
- Skip edge case or error testing
- Use `any` type for mocks
- Write tests that depend on execution order
- Use DOM structure or CSS selectors
- Ignore excessive re-render issues in hooks
