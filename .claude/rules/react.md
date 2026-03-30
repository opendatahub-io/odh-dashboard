---
description: React component, hook, and page development conventions for ODH Dashboard
globs: "**/*.tsx,**/*.ts"
alwaysApply: false
---

# React Development — ODH Dashboard

## Component Structure

Functional components only. Type with `React.FC` or explicit props. Default-export components; named-export utilities/hooks.

```tsx
import React from 'react';
import { Alert } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

type MyComponentProps = {
  title: string;
  onClose?: () => void;
};

const MyComponent: React.FC<MyComponentProps> = ({ title, onClose }) => {
  const { api } = usePipelinesAPI();
  // ...
  return <Alert variant="info" title={title} />;
};

export default MyComponent;
```

### Key conventions

| Convention | Detail |
|---|---|
| Import alias | `#~/` maps to `frontend/src/` (main app), `~/` maps to `src/` within each package's frontend |
| Cross-package imports | Use `@odh-dashboard/<package>` scoped imports (e.g., `@odh-dashboard/plugin-core/extension-points`). Avoid importing from `@odh-dashboard/internal` when possible — prefer dedicated package exports |
| Props | Defined as `type` above the component, destructured in signature |
| Exports | Default export for components, named exports for hooks/utils |
| Test IDs | Add `data-testid` on interactive and testable elements |
| File naming | PascalCase for components (`MyComponent.tsx`), camelCase for hooks (`useMyHook.ts`) |
| Imports | Import directly from source modules — avoid barrel `index.ts` re-exports for bundle size |

### Anti-patterns

- **Never define components inside other components** — causes remount on every render:

```tsx
// Bad — Inner remounts every render
const Outer: React.FC = () => {
  const Inner = () => <div>child</div>;
  return <Inner />;
};

// Good — defined at module scope
const Inner: React.FC = () => <div>child</div>;
const Outer: React.FC = () => <Inner />;
```

- **Hoist static JSX** outside the component when it never changes:

```tsx
const EMPTY_ICON = <EmptyStateIcon icon={SearchIcon} />;

const MyEmpty: React.FC = () => (
  <EmptyState>{EMPTY_ICON}<EmptyStateBody>No results</EmptyStateBody></EmptyState>
);
```

## TypeScript

- Strict typing everywhere — avoid `any`.
- Use `jest.mocked()` for type-safe mocks in tests.
- Prefer `type` over `interface` for props (project convention).
- Use discriminated unions for complex state:

```typescript
type StatusState =
  | { type: 'loading' }
  | { type: 'loaded'; data: Resource[] }
  | { type: 'error'; error: Error };
```

## Custom Hooks

### Naming and location

| Location | Purpose |
|---|---|
| `concepts/<domain>/apiHooks/` | Domain API hooks (e.g., `usePipelineByName`) |
| `concepts/<domain>/context/` | Context-related hooks |
| `utilities/` | Generic reusable hooks (`useFetchState`, `useDebounceCallback`) |

### Data fetching pattern

Wrap API calls with `useFetchState` and stabilize the callback with `React.useCallback`:

```tsx
export const usePipelineByName = (name: string): FetchState<PipelineKF | null> => {
  const { api } = usePipelinesAPI();

  const call = React.useCallback<FetchStateCallbackPromise<PipelineKF | null>>(
    async (opts) => {
      if (!name) {
        return Promise.reject(new NotReadyError('No pipeline name'));
      }
      return api.getPipelineByName(opts, name);
    },
    [api, name],
  );

  return useFetchState(call, null);
};
```

### Rules

- Always include correct dependency arrays in `useCallback`/`useMemo`/`useEffect`.
- Return `FetchState` tuple `[data, loaded, error, refresh]` from data-fetching hooks.
- Guard against missing preconditions with `NotReadyError`.

## Async Patterns

### Parallelize independent operations

Use `Promise.all` when fetching independent resources — never await sequentially:

```typescript
// Bad — sequential waterfall
const users = await fetchUsers();
const projects = await fetchProjects();

// Good — parallel
const [users, projects] = await Promise.all([fetchUsers(), fetchProjects()]);
```

### Defer await to where it's needed

Move `await` into the branch that actually uses the result:

```typescript
// Bad — always waits even if unused
const data = await fetchData();
if (condition) {
  return data;
}
return fallback;

// Good — only await when needed
const dataPromise = fetchData();
if (condition) {
  return await dataPromise;
}
return fallback;
```

## State Management

### Global state — Redux

Used for app-wide state (user, dashboard namespace, feature flags).

```tsx
import { useAppSelector } from '#~/redux/hooks';
import { useUser } from '#~/redux/selectors/user';

const { username, isAdmin } = useUser();
```

### Feature state — React Context

Each feature area has its own context provider. Pattern:

```tsx
const MyContext = React.createContext<MyContextProps>(defaultValue);

const MyContextProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [data, loaded, error] = useMyData();

  const contextValue = React.useMemo(
    () => ({ data, loaded, error }),
    [data, loaded, error],
  );

  return <MyContext.Provider value={contextValue}>{children}</MyContext.Provider>;
};
```

**Always** wrap context values in `React.useMemo` to prevent unnecessary re-renders of consumers.

## Navigation

### Prefer `<Link>` over `useNavigate`

Use React Router's `<Link>` (or PatternFly's `component` prop pattern) for navigation instead of calling `navigate()` imperatively. Links are accessible by default (right-click, Cmd+click, screen readers), while `navigate()` breaks these expectations.

```tsx
// Bad — imperative navigation in a click handler
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
<Button onClick={() => navigate('/projects')}>View projects</Button>

// Good — declarative link
import { Link } from 'react-router-dom';

<Button component={(props) => <Link {...props} to="/projects" />}>
  View projects
</Button>
```

For PatternFly empty states and other components that accept `href` props, prefer those over `handleClick` + `navigate`:

```tsx
// Bad
<ModelsEmptyState
  actionButtonText="Deploy a model"
  handleActionButtonClick={() => navigate(`/deployments/${ns}`)}
/>

// Good
<ModelsEmptyState
  actionButtonText="Deploy a model"
  actionButtonHref={`/deployments/${ns}`}
/>
```

### When `useNavigate` is acceptable

Reserve `useNavigate` for programmatic navigation that cannot be expressed as a static href:

- **Post-action redirects** — navigating after an async operation completes:

```tsx
const navigate = useNavigate();

const handleSubmit = async () => {
  await api.createResource(data);
  navigate(`/resources/${data.name}`);
};
```

- **Cancel / go-back buttons** — returning to a known route:

```tsx
const navigate = useNavigate();

<Button variant="link" onClick={() => navigate(redirectPath)}>Cancel</Button>
```

## Performance

### Memoization

| Tool | When to use |
|---|---|
| `React.useMemo` | Derived data, context values, expensive computations |
| `React.useCallback` | Callbacks passed as props or to `useFetchState` |
| `React.memo` | Heavy child components receiving stable-but-reconstructed props |
| `useDeepCompareMemoize` | When shallow comparison isn't sufficient for deps |

### Guidelines

- Don't over-memoize — only memoize when there's a measurable benefit or to stabilize references.
- For hooks returning tuples, ensure stable references across renders for callbacks.
- Avoid creating objects/arrays inline in JSX that would cause child re-renders:

```tsx
// Bad — new object every render
<Child config={{ mode: 'dark' }} />

// Good — stable reference
const config = React.useMemo(() => ({ mode: 'dark' }), []);
<Child config={config} />
```

### Lazy loading

Use `React.lazy` + `Suspense` for route-level code splitting. Use conditional dynamic `import()` for heavy modules only needed behind feature flags.

### Bundle size

- Import directly from source modules, not barrel files (`index.ts`).
- Dynamically import heavy dependencies only when the feature is activated.

## Re-render Prevention

### Derive state during render, not in effects

```tsx
// Bad — unnecessary effect + state
const [fullName, setFullName] = React.useState('');
React.useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// Good — derived directly
const fullName = `${first} ${last}`;
```

### Functional setState for stable callbacks

```tsx
// Bad — count in deps forces new callback each render
const increment = React.useCallback(() => setCount(count + 1), [count]);

// Good — no dependency on count
const increment = React.useCallback(() => setCount((c) => c + 1), []);
```

### Lazy state initialization

```tsx
// Bad — runs expensive function every render (result discarded after first)
const [data, setData] = React.useState(parseExpensiveData(raw));

// Good — initializer runs once
const [data, setData] = React.useState(() => parseExpensiveData(raw));
```

### Use primitive deps in effects

```tsx
// Bad — object reference changes every render
React.useEffect(() => { ... }, [user]);

// Good — primitive is stable
React.useEffect(() => { ... }, [user.id]);
```

### Conditional rendering — prefer ternary over &&

```tsx
// Bad — renders "0" when count is 0
{count && <Badge>{count}</Badge>}

// Good — explicit null
{count > 0 ? <Badge>{count}</Badge> : null}
```

### Refs for transient values

Use refs for frequently-changing values that don't need re-renders (mouse position, timer IDs, latest callback):

```tsx
const timerRef = React.useRef<number>();
const handleStart = () => {
  timerRef.current = window.setInterval(tick, 100);
};
```

### useTransition for non-urgent updates

Wrap expensive state updates in `startTransition` to keep the UI responsive:

```tsx
const [isPending, startTransition] = React.useTransition();

const handleFilter = (text: string) => {
  setInputValue(text);
  startTransition(() => {
    setFilteredItems(items.filter((i) => i.name.includes(text)));
  });
};
```

## JavaScript Performance

- **Set/Map for lookups**: use `Set` for membership checks and `Map` for key-value lookups instead of `Array.find()` / `.includes()` on large collections.
- **Combine iterations**: prefer a single `.reduce()` or loop over chaining `.filter().map()` on large arrays.
- **Early return**: return early from functions to reduce nesting and skip unnecessary work.

## Accessibility

### Required practices

- **`aria-label`** on all interactive elements without visible text (icon buttons, toggles, tabs).
- **Semantic HTML**: use `<button>`, `<a>`, `<nav>`, `<main>` — not `<div onClick>`.
- **Keyboard navigation**: ensure all interactive elements are reachable via Tab and operable via Enter/Space.
- PatternFly components handle most a11y concerns — prefer them over custom implementations.

```tsx
<Button variant="plain" aria-label="Remove item" onClick={onRemove}>
  <TimesIcon />
</Button>
```

### In tests

Use accessibility selectors as a secondary strategy after `data-testid`:
- `screen.getByRole('button', { name: 'Submit' })`
- `screen.getByLabelText('Username')`

## Testing

See [unit-tests rules](./unit-tests.md) for full details.

### Quick reference

| Area | Convention |
|---|---|
| Framework | Jest + React Testing Library |
| File location | `__tests__/*.spec.ts(x)` adjacent to source |
| Selectors | `data-testid` (preferred), then a11y selectors |
| Naming | `it('should ...')` inside `describe('<FunctionOrComponent>')` |
| Mocks | `jest.mocked()`, shared mocks from `@odh-dashboard/internal/__mocks__` |
| Hook testing | `testHook(hook)(args)` from `@odh-dashboard/jest-config/hooks` |
| Isolation | `beforeEach(() => jest.clearAllMocks())`, fresh data per test |

### Component test example

```tsx
import { render, screen, fireEvent } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render title', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByTestId('my-title')).toHaveTextContent('Hello');
  });

  it('should call onClose when dismiss is clicked', () => {
    const onClose = jest.fn();
    render(<MyComponent title="Hello" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

### Hook test — verify render count

```typescript
import { testHook } from '@odh-dashboard/jest-config/hooks';

describe('useMyHook', () => {
  it('should load data', async () => {
    const renderResult = testHook(useMyHook)('arg');
    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual({ data: 'value', loaded: true });
    expect(renderResult).hookToHaveUpdateCount(2);
  });
});
```

## Code Review Checklist

When reviewing React code, verify:

### Correctness
- [ ] Logic handles edge cases (null, undefined, empty arrays)
- [ ] Effects clean up subscriptions/timers
- [ ] Dependency arrays are complete and correct
- [ ] Error states are handled and surfaced to the user
- [ ] No components defined inside other components

### TypeScript
- [ ] No `any` types — use proper generics or specific types
- [ ] Props type is defined and accurate
- [ ] Discriminated unions for complex state shapes

### Performance
- [ ] Context values wrapped in `useMemo`
- [ ] Callbacks passed to children wrapped in `useCallback`
- [ ] No inline object/array creation in JSX causing re-renders
- [ ] `React.memo` used where appropriate for heavy components
- [ ] Independent async operations parallelized with `Promise.all`
- [ ] Derived state computed during render, not synced via effects
- [ ] Functional `setState` used where it eliminates deps
- [ ] Lazy state initialization for expensive computations
- [ ] Primitive values preferred in dependency arrays
- [ ] No barrel file imports — import from source modules directly

### Navigation
- [ ] `<Link>` used instead of `navigate()` for user-initiated navigation
- [ ] `useNavigate` only used for post-action programmatic redirects

### Accessibility
- [ ] `aria-label` on icon buttons and non-text interactive elements
- [ ] Semantic HTML elements used
- [ ] Keyboard navigable

### Testing
- [ ] `data-testid` on testable elements
- [ ] Tests cover happy path, error states, and edge cases
- [ ] Hook tests verify render count
- [ ] No shared mutable state between tests
