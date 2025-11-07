import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { playground } from '~/__tests__/cypress/cypress/pages/playground';
import { TokenAuthModal, MCPToolsModal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import {
  mockMCPServers,
  mockMCPServer,
  mockMCPStatusInterceptor,
  mockMCPToolsInterceptor,
  mockMCPStatusError,
} from '~/__tests__/cypress/cypress/__mocks__';
import {
  type MCPTestConfig,
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

type InitInterceptsOptions = {
  namespace: string;
  serverName: string;
  serverUrl?: string;
  serverStatus?: string;
  servers?: Array<{ name: string; status: string }>;
  withStatusInterceptor?: { token: string; serverUrl: string };
  withToolsInterceptor?: { token: string; serverUrl: string };
  withStatusError?: { errorType: '400' | '401'; serverUrl: string };
};

const initIntercepts = ({
  namespace,
  serverName,
  serverUrl,
  serverStatus = 'Token required',
  servers,
  withStatusInterceptor,
  withToolsInterceptor,
  withStatusError,
}: InitInterceptsOptions) => {
  const mcpServers = servers
    ? servers.map((s) => mockMCPServer(s))
    : [
        mockMCPServer({
          name: serverName,
          status: serverStatus,
          ...(serverUrl && { url: serverUrl }),
        }),
      ];

  cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers(mcpServers));

  if (withStatusError) {
    mockMCPStatusError(withStatusError.errorType, withStatusError.serverUrl);
  } else if (withStatusInterceptor) {
    mockMCPStatusInterceptor(withStatusInterceptor.token, withStatusInterceptor.serverUrl);
  } else if (serverUrl) {
    mockMCPStatusError('401', serverUrl);
  }

  if (withToolsInterceptor) {
    mockMCPToolsInterceptor(withToolsInterceptor.token, withToolsInterceptor.serverUrl);
  }
};

const navigateToPlayground = (namespace: string) => {
  cy.step('Navigate to Playground');
  appChrome.visit();
  playground.visit(namespace);
  playground.verifyOnPlaygroundPage(namespace);
  playground.expandMCPPanelIfNeeded();
  playground.verifyMCPPanelVisible();
};

describe('AI Assets - MCP Servers User Interactions (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  beforeEach(() => {
    setupBaseMCPServerMocks(config, { lsdStatus: 'Ready', includeLsdModel: true });
  });

  it(
    'should complete full authentication and tools workflow',
    { tags: ['@GenAI', '@MCPServers', '@Authentication', '@Tools', '@E2E'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { valid: testToken } = config.tokens;

      initIntercepts({
        namespace,
        serverName,
        serverUrl,
        withStatusInterceptor: { token: testToken, serverUrl },
        withToolsInterceptor: { token: testToken, serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Verify server exists and is unauthenticated');
      const serverRow = playground.getServerRow(serverName);
      serverRow.find().should('be.visible');
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Click Configure button to open authentication modal');
      serverRow.clickConfigure();

      cy.step('Enter GitHub token in authentication modal');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.enterToken(testToken);

      cy.step('Submit token configuration');
      tokenModal.submit();

      cy.step('Wait for authentication status check');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify modal closes after successful authentication');
      tokenModal.waitForClose();

      cy.step('Verify tools button becomes enabled after authentication');
      serverRow.findToolsButton().should('exist').should('not.have.attr', 'aria-disabled');

      cy.step('Click View Tools button');
      serverRow.findToolsButton().click({ force: true });

      cy.step('Wait for tools API call');
      cy.wait('@toolsRequest', { timeout: 10000 });

      cy.step('Verify MCP Tools modal opens');
      const toolsModal = new MCPToolsModal();
      toolsModal.shouldBeOpen();

      cy.step('Verify tools table is populated');
      toolsModal.verifyHasTools();

      cy.step('Verify first tool has a name');
      toolsModal.verifyFirstToolHasName();

      cy.step('Verify table headers are present');
      toolsModal.verifyTableHeaders();

      cy.step('Close tools modal');
      toolsModal.findCloseButton().click();
      toolsModal.shouldBeOpen(false);

      cy.step('Test completed - Full authentication and tools workflow verified');
    },
  );

  it(
    'should open and interact with authorization modal',
    { tags: ['@GenAI', '@MCPServers', '@Authentication', '@Modal'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { valid: testToken } = config.tokens;

      initIntercepts({ namespace, serverName, serverUrl });

      navigateToPlayground(namespace);

      cy.step('Find server requiring authentication');
      const serverRow = playground.getServerRow(serverName);

      cy.step('Click Configure button to open modal');
      serverRow.clickConfigure();

      cy.step('Verify authorization modal opens');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.find().should('be.visible');

      cy.step('Enter token in modal');
      tokenModal.findTokenInput().type(testToken);

      cy.step('Test modal cancel button');
      tokenModal.findCancelButton().click();

      cy.step('Verify modal closes on cancel');
      tokenModal.shouldBeOpen(false);

      cy.step('Test completed - Authorization modal interactions work correctly');
    },
  );

  it(
    'should handle authorization workflow submission',
    { tags: ['@GenAI', '@MCPServers', '@Authentication'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { valid: testToken } = config.tokens;

      initIntercepts({
        namespace,
        serverName,
        serverUrl,
        withStatusInterceptor: { token: testToken, serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Open authorization modal');
      const serverRow = playground.getServerRow(serverName);
      serverRow.clickConfigure();

      cy.step('Fill authorization form with valid token');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.enterToken(testToken);

      cy.step('Submit authorization form');
      tokenModal.findSubmitButton().should('be.visible').should('not.be.disabled');
      tokenModal.submit();

      cy.step('Wait for status check with token');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify modal closes after successful authentication');
      tokenModal.waitForClose();

      cy.step('Test completed - Authorization workflow with valid token succeeds');
    },
  );

  it(
    'should validate token input requirements',
    { tags: ['@GenAI', '@MCPServers', '@Validation'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { test: testToken } = config.tokens;

      initIntercepts({ namespace, serverName, serverUrl });

      navigateToPlayground(namespace);

      cy.step('Open configure modal');
      const serverRow = playground.getServerRow(serverName);
      serverRow.clickConfigure();

      cy.step('Verify modal has token input field');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.findTokenInput().should('exist').should('be.visible');

      cy.step('Verify token field accepts input');
      tokenModal.enterToken(testToken);
      tokenModal.findTokenInput().should('have.value', testToken);

      cy.step('Verify clear button functionality');
      tokenModal.find().findByRole('button', { name: /Clear/i }).click();
      tokenModal.findTokenInput().should('have.value', '');

      cy.step('Test completed - Token input validation works');
    },
  );

  it(
    'should handle authentication errors with invalid token',
    { tags: ['@GenAI', '@MCPServers', '@Authentication', '@Error'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { invalid: invalidToken } = config.tokens;

      initIntercepts({
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '400', serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Open authorization modal');
      const serverRow = playground.getServerRow(serverName);
      serverRow.clickConfigure();

      cy.step('Enter invalid token');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.enterToken(invalidToken);

      cy.step('Submit with invalid token');
      tokenModal.submit();

      cy.step('Wait for error response');
      cy.wait('@statusCheckError', { timeout: 10000 });

      cy.step('Verify modal remains open after authentication failure');
      tokenModal.shouldBeOpen();

      cy.step('Verify error message is displayed');
      tokenModal.find().then(($modal) => {
        const text = $modal.text();
        const hasError =
          text.includes('Token Validation Failed') ||
          text.includes('Invalid request format') ||
          text.includes('Authorization header is badly formatted');
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        expect(hasError).to.be.true;
      });

      cy.step('Test completed - Invalid token error handling works');
    },
  );

  it(
    'should handle authentication errors with no token',
    { tags: ['@GenAI', '@MCPServers', '@Authentication', '@Error'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;

      initIntercepts({
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '401', serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Verify server exists and tools button is disabled without authentication');
      const serverRow = playground.getServerRow(serverName);
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Test completed - Unauthenticated server has disabled tools button');
    },
  );

  it(
    'should show correct tools button state based on authentication',
    { tags: ['@GenAI', '@MCPServers', '@UI'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName } = config.servers.github;

      initIntercepts({ namespace, serverName });

      navigateToPlayground(namespace);

      cy.step('Verify tools button is disabled for unauthenticated server');
      const serverRow = playground.getServerRow(serverName);
      serverRow.findToolsButton().should('exist').should('have.attr', 'aria-disabled', 'true');

      cy.step('Verify configure button is available for unauthenticated server');
      serverRow.findConfigureButton().should('exist').should('be.visible');

      cy.step('Test completed - Tools button state correctly reflects authentication requirement');
    },
  );

  it(
    'should display multiple servers correctly',
    { tags: ['@GenAI', '@MCPServers', '@MultiServer'] },
    () => {
      const namespace = config.defaultNamespace;
      const { github, filesystem } = config.servers;

      initIntercepts({
        namespace,
        serverName: github.name,
        servers: [
          { name: github.name, status: 'Ready' },
          { name: filesystem.name, status: 'Ready' },
        ],
      });

      navigateToPlayground(namespace);

      cy.step('Verify both servers are visible');
      playground.getServerRow(github.name).find().should('be.visible');
      playground.getServerRow(filesystem.name).find().should('be.visible');

      cy.step('Verify server rows contain expected text');
      playground.getServerRow(github.name).find().should('contain', 'GitHub');
      playground.getServerRow(filesystem.name).find().should('contain', 'Filesystem');

      cy.step('Test completed - Multiple servers displayed correctly');
    },
  );
});
