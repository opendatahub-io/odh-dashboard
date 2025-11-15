# Gen-AI Cypress Tests

## Overview

Cypress tests for the Gen-AI plugin running in **mocked mode** with stubbed backend APIs. Tests use the Page Object Model (POM) pattern for maintainability and reusability.

## Running Tests

### CI Mode (Recommended)

Automatically starts dev server, runs tests, then cleans up:

```bash
npm run test:cypress-ci
```

### Headless Mode

Run tests in headless mode (requires dev server running separately):

```bash
npm run cypress:run:mock
```

### Interactive Mode

Open Cypress UI for debugging and test development:

```bash
npm run cypress:open
```

## Test Filtering with Tags

Filter tests by tags using the `@cypress/grep` plugin:

```bash
# Run MCP server tests only
npm run cypress:run:mock -- --env grepTags=@MCPServers

# Run multiple tags (AND)
npm run cypress:run:mock -- --env grepTags="@GenAI+@Authentication"

# Run multiple tags (OR)
npm run cypress:run:mock -- --env grepTags="@GenAI,@MCPServers"
```

**Available Tags:**

- `@GenAI` - Gen-AI specific tests
- `@MCPServers` - MCP server functionality
- `@Authentication` - Authentication and token flows
- `@Tools` - MCP tools functionality
- `@Modal` - Modal dialog interactions
- `@Validation` - Form validation tests
- `@Error` - Error handling tests
- `@UI` - UI component tests
- `@MultiServer` - Multiple server scenarios

## Directory Structure

```text
cypress/
├── __mocks__/                    # TypeScript mock functions
│   ├── index.ts
│   ├── mockNamespaces.ts
│   ├── mockMCPServers.ts
│   ├── mockMCPResponses.ts
│   └── mockEmptyResponse.ts
├── fixtures/
│   └── mocked/
│       └── mcpServers/          # MCP test data (YAML/JSON)
├── pages/                        # Page Object Model
│   ├── appChrome.ts             # App navigation
│   ├── chatbotPage.ts           # Chatbot/Playground page
│   ├── aiAssetsPage.ts          # AI Assets page with tab switching
│   ├── aiAssetsPage/            # Tab-specific page objects
│   │   ├── baseTab.ts           # Base class for all tabs
│   │   └── mcpServersTab.ts     # MCP Servers tab
│   └── components/              # Reusable components
│       ├── Contextual.ts        # Base contextual element
│       ├── Modal.ts             # Modal dialogs
│       ├── table.ts             # Table row interactions
│       └── tableActions.ts      # Common table actions
├── support/
│   ├── commands/                # Custom Cypress commands
│   ├── helpers/
│   │   └── mcpServers/         # MCP test helpers
│   ├── e2e.ts                  # Global setup
│   └── websockets.ts           # WebSocket support
├── tests/
│   └── mocked/                 # Mocked tests
│       ├── ci-smoke.cy.ts
│       └── aiAssets/
│           └── mcpServers.cy.ts
└── utils/                       # Utilities
    ├── logger.ts
    └── testConfig.ts
```

## Adding New Tests

### 1. Adding Tests for New Tabs (Models, MaaS, etc.)

Create a new tab page object extending `AIAssetsTabBase`:

```typescript
// pages/aiAssetsPage/modelsTab.ts
import { AIAssetsTabBase } from './baseTab';

class ModelsTab extends AIAssetsTabBase {
  protected tableTestId = 'ai-models-table';

  // Add tab-specific methods here
  selectModelByName(modelName: string): void {
    this.findTableRows()
      .contains(modelName)
      .parents('tr')
      .find('input[type="checkbox"]')
      .check();
  }
}

export const modelsTab = new ModelsTab();
```

Then write tests using the new page object:

```typescript
// tests/mocked/aiAssets/models.cy.ts
import { aiAssetsPage } from '~/pages/aiAssetsPage';
import { modelsTab } from '~/pages/aiAssetsPage/modelsTab';

describe('Models Tab', { tags: ['@GenAI', '@Models'] }, () => {
  beforeEach(() => {
    // Setup mocks
    cy.interceptGenAi('GET /api/v1/models', mockModels());
  });

  it('should display models', () => {
    aiAssetsPage.visit('team-crimson');
    aiAssetsPage.switchToModelsTab();
    modelsTab.verifyTableVisible();
    modelsTab.verifyHasRows();
  });
});
```

### 2. Adding Chatbot Component Tests

Add methods to `chatbotPage.ts` for new components:

```typescript
// In chatbotPage.ts
findSettingsPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
  return cy.findByTestId('chatbot-settings-panel');
}

expandSettingsPanel(): void {
  this.findSettingsPanel().should('be.visible').click();
}
```

### 3. Adding Table Interactions

Extend `TableRow` or `TableRowWithStatus` for custom row behavior:

```typescript
// In your tab page object
import { TableRowWithStatus } from '../components/table';

class ModelRow extends TableRowWithStatus {
  constructor(
    parentSelector: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    private modelName: string,
  ) {
    super(parentSelector, 'model-status-badge');
  }

  clickDeploy(): void {
    this.find().findByTestId('deploy-model-button').click();
  }
}
```

## Reusable Components

### Base Classes

**`AIAssetsTabBase`** - Extend for new tabs

- `findTable()` - Find table element
- `findTableRows()` - Get all rows
- `verifyTableVisible()` - Assert table visible
- `verifyHasRows()` - Assert has data
- `verifyEmptyState()` - Check empty state
- `waitForTableLoad()` - Wait for loading
- `getRowCount()` - Count rows
- `verifyTableHeaders()` - Check headers exist

**`TableRow`** - Base table row interactions

- `find()` - Get row element
- `check()` / `uncheck()` - Toggle checkbox
- `shouldBeChecked()` / `shouldNotBeChecked()` - Assert checkbox state

**`TableRowWithStatus`** - Extends `TableRow` with status badge

- `findStatusBadge()` - Get status badge
- `waitForStatusLoad()` - Wait for status
- `verifyStatus(expected)` - Assert status text
- `getStatusText()` - Get current status

### Utility Components

**`tableActions`** - Common table actions

```typescript
import { tableActions } from '~/pages/components/tableActions';

tableActions.clickTryInPlayground();
```

**`Modal`** - Modal dialog interactions

```typescript
import { modal } from '~/pages/components/Modal';

modal.shouldBeOpen();
modal.findFooter().find('button').contains('Save').click();
```

## Mocking APIs

### Basic Mock Setup

```typescript
import { mockNamespaces, mockMCPServers } from '~/__tests__/cypress/cypress/__mocks__';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('MCP Servers', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  beforeEach(() => {
    setupBaseMCPServerMocks(config);

    cy.interceptGenAi(
      'GET /api/v1/aaa/mcps',
      { query: { namespace: config.defaultNamespace } },
      mockMCPServers([
        { name: 'GitHub-MCP-Server', status: 'Ready' },
      ]),
    );
  });

  it('should display server', () => {
    // Test implementation
  });
});
```

### Available Mocks

**General:**

- `mockNamespaces()` - Namespace list
- `mockMCPServers()` - MCP server list
- `mockMCPServer()` - Single server object
- `mockEmptyList()` - Empty array
- `mockStatus()` - Status response

**MCP Specific:**

- `mockMCPStatusInterceptor(token, serverUrl)` - Status endpoint
- `mockMCPStatusError(errorType, serverUrl)` - Error responses
- `mockMCPToolsInterceptor(token, serverUrl)` - Tools endpoint

**Helpers:**

- `loadMCPTestConfig()` - Load YAML config
- `setupBaseMCPServerMocks(config, options)` - Setup base intercepts

## Custom Commands

```typescript
// API interception
cy.interceptGenAi('GET /api/v1/namespaces', mockNamespaces());

// Test step logging
cy.step('Navigate to playground');

// App navigation
cy.visit('/gen-ai-studio/playground');
```

## Best Practices

1. **Always Use Test IDs** - Use `data-testid` attributes instead of CSS selectors or class names

   ```typescript
   // ✅ Good - uses test ID
   cy.findByTestId('mcp-server-token-input').type('token');
   
   // ❌ Bad - uses CSS class selector
   cy.find('button.pf-m-primary').click();
   
   // ❌ Bad - uses generic element selector
   cy.find('footer').find('button');
   ```

   CSS selectors and class names (like `pf-m-primary`) change frequently and lead to high test maintenance. Always add `data-testid` to components for stable test selectors.

2. **Use Page Objects** - Keep selectors and interactions in page objects, not tests

3. **Extend Base Classes** - Reuse `AIAssetsTabBase`, `TableRow`, `TableRowWithStatus`

4. **Wait for Elements** - Use `.should('be.visible')` instead of `cy.wait(5000)`

5. **Type Safety** - Add TypeScript types for all functions

6. **Tag Tests** - Use tags for filtering: `{ tags: ['@GenAI', '@MCPServers'] }`

7. **Mock Data** - Load from YAML fixtures using `loadMCPTestConfig()`

8. **Step Logging** - Use `cy.step()` for clear test output

## Page Object Pattern Example

```typescript
import { aiAssetsPage } from '~/pages/aiAssetsPage';
import { mcpServersTab } from '~/pages/aiAssetsPage/mcpServersTab';
import { chatbotPage } from '~/pages/chatbotPage';

describe('MCP Server Workflow', () => {
  it('should select server and navigate to playground', () => {
    // Visit AI Assets page
    aiAssetsPage.visit('team-crimson');
    
    // Switch to MCP Servers tab
    aiAssetsPage.switchToMCPServersTab();
    
    // Verify and select server
    mcpServersTab.verifyTableVisible();
    mcpServersTab.selectServerByName('GitHub-MCP-Server', {
      verifyStatus: 'Ready',
    });
    
    // Navigate to playground
    mcpServersTab.clickPlaygroundAction();
    chatbotPage.verifyOnChatbotPage('team-crimson');
  });
});
```

## Additional Resources

- [Main Testing Documentation](/docs/testing.md)
- [Cypress E2E Guidelines](/.cursor/rules/cypress-e2e.mdc)
