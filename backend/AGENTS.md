# Backend AGENTS.md

See [root AGENTS.md](../AGENTS.md) for general ODH Dashboard agent guidance.

## Backend-Specific Guidance

This is the **main dashboard backend** built with Node.js, Express, and TypeScript.

### Key Technologies
- **Node.js** >= 22.0.0
- **Express** for HTTP server
- **TypeScript** for type safety
- **@kubernetes/client-node** for Kubernetes API access
- **Jest** for unit testing

### Architecture
- **BFF (Backend-for-Frontend)** pattern
- **Service Account**: Performs K8s operations on behalf of users
- **Pass-through**: Some requests pass user's bearer token to K8s
- **Custom Logic**: Business logic for dashboard features

### Key Directories
```
backend/
├── src/
│   ├── routes/             # Express route handlers
│   │   ├── api/           # API endpoints
│   │   └── api/k8s/       # Kubernetes proxy endpoints
│   ├── utils/             # Utility functions
│   │   ├── proxyUtils.ts  # Proxy configuration
│   │   └── k8sUtils.ts    # Kubernetes utilities
│   └── typeHelpers.ts     # TypeScript type helpers
└── package.json
```

### Common Tasks

```bash
cd backend

npm run start:dev          # Development server (with watch)
npm start                  # Production server
npm run build             # Build TypeScript to JavaScript
npm run test              # Run tests
npm run test:unit-coverage # Tests with coverage
npm run lint              # Lint code
npm run type-check        # TypeScript checking
```

### Authentication

The backend handles user authentication via multiple strategies:
1. **Kube-RBAC-Proxy Headers** (primary) - `x-auth-request-user`, `x-auth-request-groups`
2. **User API with Token** - Uses `x-forwarded-access-token` for backwards compatibility
3. **SelfSubjectReview** - Kubernetes standard API
4. **JWT Parsing** - Fallback when APIs unavailable
5. **Dev Mode** - Service account for local development

See [docs/architecture.md](../docs/architecture.md) for authentication flow details.

### API Endpoints

**Types of endpoints:**
1. **Service Account Requests**: Backend performs operation with its own credentials
2. **Pass-through Requests**: User's token is forwarded to Kubernetes
3. **Custom Business Logic**: Dashboard-specific functionality

**Example routes:**
- `/api/status` - Health check
- `/api/config` - Dashboard configuration
- `/api/k8s/api/*` - Kubernetes API proxy
- `/api/namespaces/:namespace/...` - Namespace-scoped operations

### Proxy Configuration

Module Federation remotes can define proxy configurations in `package.json`:
```json
{
  "module-federation": {
    "proxy": [
      {
        "path": "/api/models",
        "target": "http://model-service:8080",
        "authorize": true
      }
    ]
  }
}
```

Backend automatically configures these proxies at runtime.

### Testing

- **Unit tests**: `src/**/__tests__/*.test.ts` - Jest
- **Integration tests**: Test route handlers with mocked K8s client
- **Contract tests**: See `packages/contract-tests/` for API contracts

See [docs/agent-rules/unit-tests.md](../docs/agent-rules/unit-tests.md) for testing patterns.

### Common Patterns

**Express Routes:**
- Use TypeScript for type safety
- Validate request parameters
- Handle errors consistently
- Use async/await for asynchronous operations

**Kubernetes Client:**
- Use `@kubernetes/client-node`
- Cache clients where appropriate
- Handle API errors gracefully
- Respect user permissions

**Logging:**
- Use structured logging
- Include request context
- Log errors with stack traces

For more details, see [docs/architecture.md](../docs/architecture.md).
