# Frontend AGENTS.md

See [root AGENTS.md](../AGENTS.md) for general ODH Dashboard agent guidance.

## Frontend-Specific Guidance

This is the **main dashboard frontend application** built with React 18, TypeScript, and PatternFly v6.

### Key Technologies
- **React 18** with functional components and hooks
- **PatternFly v6** for RHOAI/ODH UI components
- **Material UI** for Kubeflow mode components
- **Webpack Module Federation** as the host application
- **Cypress** for E2E and component testing
- **Jest** for unit testing

### Architecture
- **Module Federation Host**: Loads remote modules from packages at runtime
- **Shared Dependencies**: React, PatternFly, routing libraries shared with remotes
- **Mock Data**: Shared mocks in `src/__mocks__/` (aliased as `@odh-dashboard/internal/__mocks__`)

### Key Directories
```
frontend/
├── src/
│   ├── __mocks__/          # Shared mock data
│   ├── components/         # React components
│   ├── pages/              # Page-level components
│   ├── utilities/          # Utility functions
│   ├── k8sTypes.ts         # Kubernetes type definitions
│   └── types.ts            # TypeScript types
├── public/                 # Static assets
└── @mf-types/              # Module Federation type definitions
```

### Common Tasks

```bash
cd frontend

npm run start:dev           # Development server
npm run build              # Production build
npm run test               # Run tests
npm run test:coverage      # Tests with coverage
npm run lint               # Lint code
npm run type-check         # TypeScript checking
```

### Testing
- **Unit tests**: `src/**/__tests__/*.test.tsx` - Jest + React Testing Library
- **Component tests**: Cypress component tests for complex UI
- **E2E tests**: See `packages/cypress/` for full user flows

See [docs/agent-rules/unit-tests.md](../docs/agent-rules/unit-tests.md) for testing patterns.

### Module Federation

This frontend is the **host** application that loads remote modules:
- Discovers remotes via `package.json` `module-federation` field in each package
- Shares React, PatternFly, routing libraries as singletons
- Loads remotes at runtime based on user access/configuration

See [docs/module-federation.md](../docs/module-federation.md) for details.

### Common Patterns

**React Components:**
- Use functional components with hooks
- Co-locate tests with components
- Use PatternFly for RHOAI/ODH mode
- Use Material UI for Kubeflow mode

**State Management:**
- React Context for global state
- Component state via `useState`
- Side effects via `useEffect`

**Routing:**
- React Router v7
- Routes defined per feature
- Lazy loading for code splitting

For more patterns, see [docs/best-practices.md](../docs/best-practices.md).
