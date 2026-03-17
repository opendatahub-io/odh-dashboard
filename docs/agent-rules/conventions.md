# ODH Dashboard Coding Conventions

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | Frontend framework — functional components and hooks only, no class components |
| TypeScript | Type safety — avoid `any` types, use strict typing |
| PatternFly v6 | Primary UI component library — import from `@patternfly/react-core`, `@patternfly/react-table`, `@patternfly/react-icons` |
| Material UI | Secondary UI library (Kubeflow mode only) |
| Fastify | Backend server framework |
| Webpack | Build tooling with Module Federation |
| Turbo | Monorepo task runner |

## Code Style

### Formatting (Prettier)

- Print width: 100 characters
- Single quotes
- Trailing commas (all)
- Arrow parens: always

### Linting (ESLint)

- Centralized config in `packages/eslint-config/`
- Root `.eslintrc.js` uses `@odh-dashboard/eslint-config` recommended presets
- Each package extends the shared config with package-specific overrides
- Custom ESLint plugin in `packages/eslint-plugin/` with project-specific rules

### TypeScript

- Strict mode enabled
- Shared `tsconfig` in `packages/tsconfig/`
- Avoid `any` types — use `unknown` with type guards instead
- Use `interface` for extendable object contracts (leverages declaration merging and `extends`/`implements`)
- Use `type` for unions, intersections, mapped/conditional types, and utility-type composition

## React Patterns

- Functional components only — never class components
- Custom hooks should be prefixed with `use` and placed in a `hooks/` directory
- Components should be modular and self-contained
- Use `data-testid` attributes on interactive elements for test selectors

### Hooks Best Practices

- **`useEffect`** — [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect). Common misuses to flag:
  - Do NOT use `useEffect` to transform data for rendering — compute it during render or use `useMemo`
  - Do NOT use `useEffect` to handle user events — use event handlers instead
  - Do NOT use `useEffect` to reset state when a prop changes — use a `key` to reset the component
  - Do NOT use `useEffect` + `setState` to derive state from props — compute it inline or use `useMemo`
  - Valid uses: fetching data, subscriptions, synchronizing with external systems (DOM, timers, third-party libs)
- **`useCallback`** — only memoize when reference stability matters:
  - Use when: function is passed as prop, used as `useEffect` dependency, or returned from a custom hook
  - Do NOT use for: simple event handlers used only in the same component
- **`useMemo`** — only memoize expensive computations; React is performant by default
- **`useRef`** — avoid unless you need DOM access or a mutable value that persists across renders without triggering re-renders
- **Custom hooks** — always memoize functions returned from hooks (consumers can't control reference stability)
- See [docs/best-practices.md](../best-practices.md) for detailed examples and code patterns

## PatternFly v6

- Always use PatternFly v6 components — do not use v5 or earlier APIs
- Follow PatternFly accessibility guidelines (aria attributes, keyboard navigation)
- Use PatternFly layout components for consistent spacing and structure

## Backend Patterns

- Fastify route handlers with proper error handling
- Kubernetes API calls via `@kubernetes/client-node`
- No hardcoded secrets or credentials
- Proper async/await usage with error propagation
- Auth and permission checks on all routes

## Import Organization

- Avoid cross-package internal imports — use exported APIs only
- Use path aliases defined in tsconfig for cleaner imports
- Group imports: external libraries, then internal modules, then relative imports
