# Gen-AI Cypress E2E Tests

## ⚠️ MANDATORY: Before Running Tests

**You MUST complete these steps before running any E2E tests:**

### 1. Configure Test Variables

Copy the example file and update with your credentials:

```bash
cd src/__tests__/cypress/cypress/fixtures
cp test-variables.json.example test-variables.json
# Edit test-variables.json with your actual values
```

**Required fields in `test-variables.json`:**

- `CLUSTER.SERVER`: Your OpenShift cluster URL
- `CLUSTER.NAMESPACE`: Default namespace (e.g., "team-crimson")
- `MCP_SERVERS.GITHUB_TOKEN`: GitHub PAT token for MCP authentication

### 2. Connect to OpenShift Cluster

```bash
# Login to your cluster
oc login --server=https://your-cluster:6443

# Verify connection
oc whoami
oc config current-context
```

### 3. Verify Prerequisites

Before running tests, confirm:

- [ ] `test-variables.json` is configured with correct values
- [ ] Connected to the correct OpenShift cluster (`oc whoami` works)
- [ ] All required services are running (Dashboard, Gen-AI remote, BFF)

**❌ DO NOT proceed without completing these steps!**

---

## Overview

This directory contains Cypress end-to-end tests for the Gen-AI plugin. The tests run in **federated mode**, where Gen-AI is loaded as a remote module into the ODH Dashboard, testing the plugin exactly as it runs in production.

## Architecture

### E2E Mode (Real Integration)

```text
┌─────────────────────┐
│  Cypress Test       │
└──────────┬──────────┘
           │ http://localhost:4010
           ↓
┌─────────────────────────────────────┐
│  ODH Dashboard (Host)               │
│  Port 4010                          │
│  - Loads Gen-AI as remote module    │
│  - Proxies /gen-ai/api → 9001       │
└──────────┬──────────────────────────┘
           │ Module Federation
           ↓
┌─────────────────────┐     Proxies /gen-ai/api
│  Gen-AI Frontend    │ ───────────────────────┐
│  Remote Module      │                        │
│  Port 9102          │                        │
└─────────────────────┘                        │
                                               ↓
                                    ┌─────────────────────┐
                                    │  Gen-AI BFF         │
                                    │  Port 9001          │
                                    └──────────┬──────────┘
                                              │ oc token auth
                                              ↓
                                    ┌─────────────────────┐
                                    │  OpenShift/K8s      │
                                    │  Real Cluster       │
                                    └─────────────────────┘
```

**Key Points**:

- Tests run against ODH Dashboard on **port 4010** (not directly against Gen-AI)
- Gen-AI loads as a **remote module** on port 9102
- API calls are **proxied** through Dashboard: `/gen-ai/api` → BFF on port 9001
- Uses **real Kubernetes APIs** and authentication

## Running Tests

### Prerequisites

1. **OpenShift Login** (for real API tests):

   ```bash
   oc login --server=https://your-cluster:6443
   oc whoami -t  # Verify token is available
   ```

2. **Required Services Running**:
   - ODH Dashboard on port 4010
   - Gen-AI remote module on port 9102
   - Gen-AI BFF on port 9001

### Quick Start

#### Interactive Mode (Development)

**Terminal 1: Start ODH Dashboard Frontend**

```bash
# From repo/frontend root
npm run start:dev
# Dashboard will start on port 4010
```

**Terminal 2: Start ODH Dashboard Backend**

```bash
# From repo/backend root
npm run start:dev
# Dashboard will start on port 4010
```

**Terminal 3: Start Gen-AI Remote Module**

```bash
cd packages/gen-ai
make dev-start
# Gen-AI remote module will start on port 9102
```

**Terminal 4: Open Cypress**

```bash
cd packages/gen-ai/frontend
npm run cypress:open:e2e
```

#### Headless Mode (CI/Testing)

```bash
# Assuming all services are running
cd packages/gen-ai/frontend
npm run cypress:run:e2e
```

## Available Scripts

| Script | Purpose |
|--------|---------|
| `cypress:open` | Opens Cypress GUI (base command) |
| `cypress:open:e2e` | Opens Cypress for E2E tests against Dashboard (port 4010) |
| `cypress:run` | Runs tests headless with Chrome (base command) |
| `cypress:run:e2e` | Runs E2E tests headless against Dashboard |

## Directory Structure

```
src/__tests__/cypress/
├── cypress/
│   ├── fixtures/              # Test data
│   │   └── example.json
│   ├── pages/                 # Page Object Model (POM)
│   │   ├── aiAssets.ts       # AI Assets page actions
│   │   ├── appChrome.ts      # App chrome/navigation
│   │   ├── mcpServersTab.ts  # MCP Servers tab interactions
│   │   ├── playground.ts     # Playground page actions
│   │   └── components/       # Reusable component interactions
│   │       ├── Contextual.ts
│   │       ├── Modal.ts      # Modal dialogs (auth, tools, etc.)
│   │       └── table.ts
│   ├── support/
│   │   ├── commands/         # Custom Cypress commands
│   │   │   ├── application.ts
│   │   │   ├── genai.ts     # Gen-AI specific commands
│   │   │   └── index.ts
│   │   └── e2e.ts           # Global setup & auth
│   ├── tests/
│   │   └── e2e/             # E2E test files
│   │       ├── aiAssets/
│   │       │   └── mcpServers.cy.ts  # Full MCP server flow
│   │       └── smoke/
│   │           ├── app.cy.ts         # App smoke tests
│   │           └── namespaces.cy.ts  # Namespace loading
│   └── utils/
│       ├── helpers.ts       # Test helper functions
│       └── testConfig.ts    # Environment configuration
├── cypress.config.ts        # Main Cypress configuration
├── tsconfig.json           # TypeScript config for tests
├── webpack.config.ts       # Webpack preprocessor config
└── README.md              # This file
```

## Test Structure

### Page Object Model (POM)

Tests use the Page Object Model pattern to separate UI interactions from test logic:

```typescript
// cypress/pages/aiAssets.ts
class AIAssets {
  visit(namespace?: string): void {
    if (namespace) {
      cy.visit(`/gen-ai-studio/assets/${namespace}`);
    } else {
      cy.visit('/gen-ai-studio/assets');
    }
  }

  switchToMCPServersTab(): void {
    this.findMCPServersTab().click();
  }
}

export const aiAssets = new AIAssets();
```

### Custom Commands

Custom commands extend Cypress functionality:

```typescript
// Usage in tests
cy.enableGenAiFeature();  // Enable feature flag
cy.getAuthToken();        // Get OpenShift token
cy.apiRequest('/gen-ai/api/v1/namespaces');  // Make authenticated API call
cy.selectMCPServer('GitHub-MCP-Server');     // Select MCP server
cy.authenticateMCPServer('GitHub-MCP-Server', token);  // Authenticate
```

## Writing Tests

### Example Test

```typescript
import { appChrome } from '~/pages/appChrome';
import { aiAssets } from '~/pages/aiAssets';
import { mcpServersTab } from '~/pages/mcpServersTab';

describe('MCP Servers', () => {
  before(() => {
    if (!Cypress.env('MOCK')) {
      cy.getAuthToken();
    }
  });

  it('should select and configure MCP server', () => {
    // Enable Gen-AI feature and visit
    appChrome.visit();
    
    // Navigate to AI Assets
    aiAssets.visit('team-crimson');
    aiAssets.switchToMCPServersTab();
    
    // Select specific server
    mcpServersTab.selectServerByName('GitHub-MCP-Server', {
      verifyStatus: 'Token required'
    });
    
    // Navigate to Playground
    mcpServersTab.clickPlaygroundAction();
  });
});
```

### Best Practices

1. **Use Page Objects** - Keep UI interactions in page objects, not in tests
2. **Use Custom Commands** - Reuse common operations via custom commands
3. **Direct Selection** - When you know exact names, select directly (don't extract/search)
4. **Wait for Elements** - Use `.should('be.visible')` instead of fixed waits
5. **Type Safety** - Add proper TypeScript types for better IDE support

## Configuration

### cypress.config.ts

- **baseUrl**: `http://localhost:4010` (ODH Dashboard)
- **specPattern**: `cypress/tests/e2e/**/*.cy.ts` (E2E tests only)
- **video**: Enabled, deleted on pass
- **screenshots**: On failure only
- **reporters**: Mochawesome + JUnit

### Environment Variables

Set via `BASE_URL` environment variable:

```bash
BASE_URL=http://localhost:4010 npm run cypress:open:e2e
```

### Authentication

Tests automatically:

1. Get OpenShift token via `oc whoami -t`
2. Store in `Cypress.env('AUTH_TOKEN')`
3. Add `Authorization: Bearer <token>` to API requests
