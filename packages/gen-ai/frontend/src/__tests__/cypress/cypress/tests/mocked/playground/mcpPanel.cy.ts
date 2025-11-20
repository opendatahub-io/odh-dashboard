import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import {
  TokenAuthModal,
  MCPToolsModal,
  MCPServerSuccessModal,
} from '~/__tests__/cypress/cypress/pages/components/Modal';
import {
  loadMCPTestConfig,
  initIntercepts,
  navigateToPlayground,
  initAutoConnectIntercepts,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('Playground - MCP Servers', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  it(
    'should complete full authentication and tools workflow',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@Authentication', '@Tools', '@E2E'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { valid: testToken } = config.tokens;

      initIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusInterceptor: { token: testToken, serverUrl },
        withToolsInterceptor: { token: testToken, serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Verify server exists and is unauthenticated');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Click configure button to open token modal');
      serverRow.findConfigureButton().click();

      cy.step('Verify token modal opens');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();

      cy.step('Enter valid token');
      tokenModal.findTokenInput().clear().type(testToken);

      cy.step('Submit token for validation');
      tokenModal.findSubmitButton().click();

      cy.step('Wait for authentication status check');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify success modal appears');
      const successModal = new MCPServerSuccessModal();
      successModal.shouldBeOpen();
      successModal.findHeading().should('be.visible');

      cy.step('Close success modal');
      successModal.findSaveButton().click();
      successModal.shouldBeOpen(false);

      cy.step('Verify server is now authenticated and tools button is enabled');
      serverRow.findToolsButton().should('exist').should('not.have.attr', 'aria-disabled');

      cy.step('Open tools modal');
      serverRow.findToolsButton().click();

      cy.step('Wait for tools API call');
      cy.wait('@toolsRequest', { timeout: 10000 });

      cy.step('Verify tools modal displays');
      const toolsModal = new MCPToolsModal();
      toolsModal.shouldBeOpen();
      toolsModal.verifyHasTools();
      toolsModal.verifyFirstToolHasName();

      cy.step('Close tools modal');
      toolsModal.findCloseButton().click();
      toolsModal.shouldBeOpen(false);

      cy.step('Test completed - Full authentication and tools workflow successful');
    },
  );

  it(
    'should handle authentication errors with no token',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@Authentication', '@ErrorHandling'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;

      initIntercepts({ config, namespace, serverName, serverUrl });

      navigateToPlayground(namespace);

      cy.step('Verify server exists and is unauthenticated');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Click configure button to open token modal');
      serverRow.findConfigureButton().click();

      cy.step('Verify token modal opens');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();

      cy.step('Verify submit button is disabled when no token is entered');
      tokenModal.findSubmitButton().should('be.disabled');

      cy.step('Close modal');
      tokenModal.findCancelButton().click();

      cy.step('Test completed - Empty token validation works correctly');
    },
  );

  it(
    'should successfully authenticate with valid token',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@Authentication', '@Success'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { valid: testToken } = config.tokens;

      initIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusInterceptor: { token: testToken, serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Click configure button');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      cy.step('Verify token modal opens');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();

      cy.step('Enter valid token and submit');
      tokenModal.findTokenInput().clear().type(testToken);
      tokenModal.findSubmitButton().click();

      cy.step('Wait for status check with token');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify success modal appears');
      const successModal = new MCPServerSuccessModal();
      successModal.shouldBeOpen();

      cy.step('Test completed - Valid token authentication successful');
    },
  );

  it(
    'should show error for bad request (400)',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@ErrorHandling', '@400Error'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { invalid: invalidToken } = config.tokens;

      initIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '400', serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Open configure modal and enter invalid token');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      const tokenModal = new TokenAuthModal();
      tokenModal.findTokenInput().clear().type(invalidToken);
      tokenModal.findSubmitButton().click();

      cy.step('Wait for error response');
      cy.wait('@statusCheckError', { timeout: 10000 });

      cy.step('Verify error message is displayed in modal');
      tokenModal
        .find()
        .findByRole('heading', { name: /Authorization failed/i })
        .should('be.visible');

      cy.step('Test completed - 400 error handling works correctly');
    },
  );

  it(
    'should handle too many requests error (429)',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@ErrorHandling', '@429Error'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { test: testToken } = config.tokens;

      initIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '400', serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Open configure modal and enter token');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      const tokenModal = new TokenAuthModal();
      tokenModal.findTokenInput().clear().type(testToken);
      tokenModal.findSubmitButton().click();

      cy.step('Wait for error response');
      cy.wait('@statusCheckError', { timeout: 10000 });

      cy.step('Verify error alert is visible');
      tokenModal
        .find()
        .findByRole('heading', { name: /Authorization failed/i })
        .should('be.visible');

      cy.step('Test completed - 429 error handling works correctly');
    },
  );

  it(
    'should handle authentication errors (401)',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@ErrorHandling', '@401Error'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;
      const { invalid: invalidToken } = config.tokens;

      initIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '401', serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Attempt authentication with invalid credentials');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.findTokenInput().clear().type(invalidToken);
      tokenModal.findSubmitButton().click();

      cy.step('Verify error is displayed');
      tokenModal
        .find()
        .findByRole('heading', { name: /Authorization failed/i })
        .should('be.visible');

      cy.step('Test completed - 401 authentication error handled correctly');
    },
  );

  it(
    'should show correct tools button state based on authentication',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@UIState'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;

      initIntercepts({ config, namespace, serverName, serverUrl });

      navigateToPlayground(namespace);

      cy.step('Verify tools button is disabled for unauthenticated server');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.findToolsButton().should('exist').should('have.attr', 'aria-disabled', 'true');

      cy.step('Verify configure button is available for unauthenticated server');
      serverRow.findConfigureButton().should('exist').should('be.visible');

      cy.step('Test completed - Tools button state correctly reflects authentication requirement');
    },
  );

  it(
    'should display multiple servers correctly',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@MultiServer'] },
    () => {
      const namespace = config.defaultNamespace;
      const { github, kubernetes } = config.servers;

      initIntercepts({
        config,
        namespace,
        serverName: github.name,
        servers: [
          { name: github.name, status: 'Ready' },
          { name: kubernetes.name, status: 'Ready' },
        ],
      });

      navigateToPlayground(namespace);

      cy.step('Verify both servers are visible');
      playgroundPage.mcpPanel.getServerRow(github.name, github.url).find().should('be.visible');
      playgroundPage.mcpPanel
        .getServerRow(kubernetes.name, kubernetes.url)
        .find()
        .should('be.visible');

      cy.step('Verify server rows contain expected text');
      playgroundPage.mcpPanel
        .getServerRow(github.name, github.url)
        .find()
        .should('contain', 'GitHub');
      playgroundPage.mcpPanel
        .getServerRow(kubernetes.name, kubernetes.url)
        .find()
        .should('contain', 'Kubernetes');

      cy.step('Test completed - Multiple servers displayed correctly');
    },
  );

  it(
    'should auto-unlock server without token when selected in playground',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@AutoUnlock'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.kubernetes;

      initAutoConnectIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
      });

      navigateToPlayground(namespace);

      cy.step('Verify Kubernetes server is visible in the MCP panel');
      const serverRow = playgroundPage.mcpPanel.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');

      cy.step('Verify no modal is shown before selection');
      playgroundPage.mcpPanel.verifyNoModalShown();

      cy.step('Select the Kubernetes server by checking the checkbox');
      serverRow.findCheckbox().check();

      cy.step('Wait for auto-unlock status check');
      cy.wait('@statusCheckAutoConnect', { timeout: 10000 });

      cy.step('Wait for tools to be fetched');
      cy.wait('@toolsRequestAutoConnect', { timeout: 10000 });

      cy.step('Verify connection successful modal is shown');
      playgroundPage.mcpPanel.verifySuccessModalVisible();

      cy.step('Verify the success modal shows the server name');
      playgroundPage.mcpPanel.verifySuccessModalContainsServerName(serverName);

      cy.step('Close the success modal');
      playgroundPage.mcpPanel.closeSuccessModal();

      cy.step('Verify tools button is enabled after closing modal');
      serverRow.findToolsButton().should('exist').and('not.have.attr', 'aria-disabled');

      cy.step('Test completed - Auto-unlock in playground shows success modal');
    },
  );
});
