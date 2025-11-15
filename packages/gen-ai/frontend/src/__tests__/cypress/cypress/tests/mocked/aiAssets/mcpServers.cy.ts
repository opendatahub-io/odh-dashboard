import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import { TokenAuthModal, MCPToolsModal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import {
  loadMCPTestConfig,
  initIntercepts,
  navigateToChatbot,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('AI Assets - MCP Servers User Interactions (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  it(
    'should complete full authentication and tools workflow',
    { tags: ['@GenAI', '@MCPServers', '@Authentication', '@Tools', '@E2E'] },
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

      navigateToChatbot(namespace);

      cy.step('Verify server exists and is unauthenticated');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Click Configure button to open authentication modal');
      serverRow.findConfigureButton().should('exist').and('be.visible').click();

      cy.step('Enter GitHub token in authentication modal');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.findTokenInput().clear().type(testToken, { delay: 5 });

      cy.step('Submit token configuration');
      tokenModal.findSubmitButton().should('be.visible').and('not.be.disabled').click();

      cy.step('Wait for authentication status check');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify modal closes after successful authentication');
      tokenModal.shouldBeOpen(false);

      cy.step('Verify tools button becomes enabled after authentication');
      serverRow.findToolsButton().should('exist').should('not.have.attr', 'aria-disabled');

      cy.step('Click View Tools button');
      serverRow.findToolsButton().should('be.visible').and('not.be.disabled').click();

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

      initIntercepts({ config, namespace, serverName, serverUrl });

      navigateToChatbot(namespace);

      cy.step('Find server requiring authentication');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);

      cy.step('Click Configure button to open modal');
      serverRow.findConfigureButton().should('exist').and('be.visible').click();

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
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusInterceptor: { token: testToken, serverUrl },
      });

      navigateToChatbot(namespace);

      cy.step('Open authorization modal');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().should('exist').and('be.visible').click();

      cy.step('Fill authorization form with valid token');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.findTokenInput().clear().type(testToken, { delay: 5 });

      cy.step('Submit authorization form');
      tokenModal.findSubmitButton().should('be.visible').and('not.be.disabled').click();

      cy.step('Wait for status check with token');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify modal closes after successful authentication');
      tokenModal.shouldBeOpen(false);

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

      initIntercepts({ config, namespace, serverName, serverUrl });

      navigateToChatbot(namespace);

      cy.step('Open configure modal');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().should('exist').and('be.visible').click();

      cy.step('Verify modal has token input field');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.findTokenInput().should('exist').should('be.visible');

      cy.step('Verify token field accepts input');
      tokenModal.findTokenInput().clear().type(testToken, { delay: 5 });
      tokenModal.findTokenInput().should('have.value', testToken);

      cy.step('Verify clear button functionality');
      tokenModal.findClearButton().click();
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
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '400', serverUrl },
      });

      navigateToChatbot(namespace);

      cy.step('Open authorization modal');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().should('exist').and('be.visible').click();

      cy.step('Enter invalid token');
      const tokenModal = new TokenAuthModal();
      tokenModal.shouldBeOpen();
      tokenModal.findTokenInput().clear().type(invalidToken, { delay: 5 });

      cy.step('Submit with invalid token');
      tokenModal.findSubmitButton().should('be.visible').and('not.be.disabled').click();

      cy.step('Wait for error response');
      cy.wait('@statusCheckError', { timeout: 10000 });

      cy.step('Verify modal remains open after authentication failure');
      tokenModal.shouldBeOpen();

      cy.step('Verify error message is displayed');
      tokenModal.find().should(($modal) => {
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
        config,
        namespace,
        serverName,
        serverUrl,
        withStatusError: { errorType: '401', serverUrl },
      });

      navigateToChatbot(namespace);

      cy.step('Verify server exists and tools button is disabled without authentication');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Test completed - Unauthenticated server has disabled tools button');
    },
  );

  it(
    'should show correct tools button state based on authentication',
    { tags: ['@GenAI', '@MCPServers', '@UI'] },
    () => {
      const namespace = config.defaultNamespace;
      const { name: serverName, url: serverUrl } = config.servers.github;

      initIntercepts({ config, namespace, serverName, serverUrl });

      navigateToChatbot(namespace);

      cy.step('Verify tools button is disabled for unauthenticated server');
      const serverRow = chatbotPage.getServerRow(serverName, serverUrl);
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
        config,
        namespace,
        serverName: github.name,
        servers: [
          { name: github.name, status: 'Ready' },
          { name: filesystem.name, status: 'Ready' },
        ],
      });

      navigateToChatbot(namespace);

      cy.step('Verify both servers are visible');
      chatbotPage.getServerRow(github.name, github.url).find().should('be.visible');
      chatbotPage.getServerRow(filesystem.name, filesystem.url).find().should('be.visible');

      cy.step('Verify server rows contain expected text');
      chatbotPage.getServerRow(github.name, github.url).find().should('contain', 'GitHub');
      chatbotPage
        .getServerRow(filesystem.name, filesystem.url)
        .find()
        .should('contain', 'Filesystem');

      cy.step('Test completed - Multiple servers displayed correctly');
    },
  );
});
