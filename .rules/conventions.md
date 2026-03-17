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
- Use React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useContext`)
- Custom hooks should be prefixed with `use` and placed in a `hooks/` directory
- Components should be modular and self-contained
- Use `data-testid` attributes on interactive elements for test selectors

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
