# Gen-AI Cypress E2E Tests

## Overview

This directory contains Cypress end-to-end tests for the Gen-AI plugin. Tests run in **federated mode**, where Gen-AI loads as a remote module into the ODH Dashboard.

## Prerequisites

### Required Configuration

**You MUST configure test variables before running E2E tests:**

```bash
cd src/__tests__/cypress
cp test-variables.yml.example test-variables.yml
# Edit test-variables.yml with your actual values
```

**Required fields:**

- `CLUSTER.SERVER`: Your OpenShift cluster URL
- `CLUSTER.NAMESPACE`: Default namespace
- `MCP_SERVERS.GITHUB_TOKEN`: GitHub PAT token for MCP authentication

### OpenShift Connection

```bash
oc login --server=https://your-cluster:6443
oc whoami  # Verify connection
```

## Running Tests

### E2E Tests (Live Cluster)

Tests run against real cluster with actual backend APIs.

**Interactive mode:**

```bash
npm run cypress:open:e2e
```

**Headless mode:**

```bash
npm run cypress:run:e2e
```

### Mocked Tests (No Cluster Required)

Tests run with mocked backend APIs.

**Interactive mode:**

```bash
npm run cypress:open
```

**Headless mode:**

```bash
npm run cypress:run:mock
```

**CI mode (starts dev server automatically):**

```bash
npm run test:cypress-ci
```

## Test Filtering with Tags

Use `@cypress/grep` plugin to run specific tests:

```bash
# Run smoke tests only
npm run cypress:run:mock -- --env grepTags=@Smoke

# Run MCP server tests
npm run cypress:run:mock -- --env grepTags=@MCPServers

# Combine tags (AND)
npm run cypress:run:mock -- --env grepTags="@Smoke+@MCPServers"

# Combine tags (OR)
npm run cypress:run:e2e -- --env grepTags="@Smoke,@Authentication"
```

**Available tags:**

- `@Smoke` - Critical smoke tests
- `@GenAI` - Gen-AI specific tests
- `@MCPServers` - MCP server functionality
- `@Authentication` - Authentication flows

## Directory Structure

```text
src/__tests__/cypress/
├── cypress/
│   ├── __mocks__/                    # TypeScript mock functions
│   │   ├── index.ts
│   │   ├── mockNamespaces.ts
│   │   ├── mockMCPServers.ts
│   │   ├── mockMCPResponses.ts      # MCP API response interceptors
│   │   └── mockEmptyResponse.ts
│   ├── fixtures/                     # Test data files
│   │   ├── e2e/
│   │   │   └── mcpServers/          # MCP E2E test config (YAML)
│   │   └── mocked/
│   │       └── mcpServers/          # MCP mocked responses (JSON)
│   ├── pages/                        # Page Object Model (POM)
│   │   ├── aiAssets.ts
│   │   ├── appChrome.ts
│   │   ├── mcpServersTab.ts
│   │   ├── playground.ts
│   │   └── components/              # Reusable component interactions
│   ├── support/
│   │   ├── commands/                # Custom Cypress commands
│   │   ├── helpers/
│   │   │   └── mcpServers/         # MCP-specific test helpers
│   │   ├── e2e.ts                  # Global setup & auth
│   │   └── websockets.ts           # WebSocket support
│   ├── tests/
│   │   ├── e2e/                    # E2E tests (live cluster)
│   │   └── mocked/                 # Mocked tests (no cluster)
│   └── utils/                      # Test utilities
│       ├── apiRequests.ts
│       ├── helpers.ts
│       ├── logger.ts
│       ├── testConfig.ts
│       └── oc_commands/            # OpenShift CLI utilities
├── cypress.config.ts               # Cypress configuration
├── test-variables.yml              # Test configuration (gitignored)
├── test-variables.yml.example      # Test configuration template
└── README.md                       # This file
```

**Organization:**

- **Nested `mcpServers/` folders**: MCP-specific code grouped in dedicated subdirectories
- **YAML for E2E configs**: Test configuration data in `fixtures/e2e/`
- **JSON for mocked responses**: API response fixtures in `fixtures/mocked/`

## Mock Functions

Mocked tests use TypeScript mock functions following the ODH Dashboard pattern.

### Usage

```typescript
import { mockNamespaces, mockMCPServers } from '~/__tests__/cypress/cypress/__mocks__';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('AI Assets (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  beforeEach(() => {
    setupBaseMCPServerMocks(config, { lsdStatus: 'Ready' });

    cy.interceptGenAi(
      'GET /api/v1/aaa/mcps',
      { query: { namespace: config.defaultNamespace } },
      mockMCPServers([mockMCPServer({ name: 'GitHub-MCP-Server', status: 'Ready' })]),
    );
  });

  it('should display servers', () => {
    // Test implementation
  });
});
```

### Available Mock Functions

**General Mocks:**

- `mockNamespaces()` - Namespace list responses
- `mockMCPServers()` - MCP server list responses
- `mockMCPServer()` - Individual MCP server object
- `mockEmptyList()` - Empty data arrays
- `mockStatus()` - Status responses

**MCP API Response Interceptors:**

- `mockMCPStatusInterceptor(token, serverUrl)` - Intercepts MCP status endpoint
- `mockMCPStatusError(errorType, serverUrl)` - Returns error responses (400/401)
- `mockMCPToolsInterceptor(token, serverUrl)` - Intercepts MCP tools endpoint

**MCP Test Helpers:**

- `loadMCPTestConfig()` - Loads test configuration from YAML
- `setupBaseMCPServerMocks(config, options)` - Sets up common API intercepts

## Writing Tests

### Page Object Model

Tests use the Page Object Model pattern to separate UI interactions from test logic:

```typescript
import { appChrome } from '~/pages/appChrome';
import { aiAssets } from '~/pages/aiAssets';
import { mcpServersTab } from '~/pages/mcpServersTab';

describe('MCP Servers', () => {
  it('should navigate to MCP servers tab', () => {
    appChrome.visit();
    aiAssets.visit('team-crimson');
    aiAssets.switchToMCPServersTab();
    mcpServersTab.shouldBeVisible();
  });
});
```

### Custom Commands

```typescript
cy.interceptGenAi('GET /api/v1/namespaces', mockNamespaces());
cy.step('Navigate to playground'); // Log test steps
cy.getTestConfig(); // Load test variables
```

### Best Practices

1. **Use Page Objects** - Keep UI interactions in page objects
2. **Use Custom Commands** - Reuse common operations
3. **Wait for Elements** - Use `.should('be.visible')` instead of fixed waits
4. **Type Safety** - Add proper TypeScript types
5. **Test Data** - Use YAML fixtures for E2E, mock functions for mocked tests

## Configuration

### Environment Variables

Set via environment or test scripts:

```bash
BASE_URL=http://localhost:4010 npm run cypress:open:e2e
```

**Available variables:**

- `BASE_URL` - Dashboard URL (default: <http://localhost:4010> for E2E, <http://localhost:8080> for mocked)
- `CY_MOCK` - Enables mocked test mode (set by `cypress:run:mock` script)
- `CY_WS_PORT` - WebSocket server port for mocked tests

### Authentication

E2E tests automatically:

1. Get OpenShift token via `oc whoami -t`
2. Store in `Cypress.env('AUTH_TOKEN')`
3. Add `Authorization: Bearer <token>` to API requests

## Additional Documentation

For comprehensive Cypress testing guidelines, see:

- [Main Testing Documentation](/docs/testing.md) - Overall testing strategy
- [Cypress E2E Rules](/.cursor/rules/cypress-e2e.mdc) - Detailed E2E test guidelines
