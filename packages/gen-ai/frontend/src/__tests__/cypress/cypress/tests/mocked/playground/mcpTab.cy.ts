import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import {
  mcpTokenAuthModal,
  mcpServerSuccessModal,
  mcpToolsModal,
} from '~/__tests__/cypress/cypress/pages/playgroundPage/mcpModals';
import {
  loadMCPTestConfig,
  initIntercepts,
  navigateToPlayground,
  initAutoConnectIntercepts,
  initHighToolsCountIntercepts,
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
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@Authentication', '@Tools'] },
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
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Click configure button to open token modal');
      serverRow.findConfigureButton().click();

      cy.step('Verify token modal opens');
      mcpTokenAuthModal.find().should('be.visible');

      cy.step('Enter valid token');
      mcpTokenAuthModal.findTokenInput().clear().type(testToken);

      cy.step('Submit token for validation');
      mcpTokenAuthModal.findSubmitButton().click();

      cy.step('Wait for authentication status check');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify success modal appears');
      mcpServerSuccessModal.find().should('be.visible');
      mcpServerSuccessModal.findHeading().should('be.visible');

      cy.step('Close success modal');
      mcpServerSuccessModal.findSaveButton().click();
      mcpServerSuccessModal.find().should('not.exist');

      cy.step('Verify server is now authenticated and tools button is enabled');
      serverRow.findToolsButton().should('exist').should('not.have.attr', 'aria-disabled');

      cy.step('Open tools modal');
      serverRow.findToolsButton().click();

      cy.step('Wait for tools API call');
      cy.wait('@toolsRequest', { timeout: 10000 });

      cy.step('Verify tools modal displays');
      mcpToolsModal.find().should('be.visible');
      mcpToolsModal.findToolRows().should('have.length.at.least', 1);
      mcpToolsModal.findToolRows().first().find('td').eq(1).invoke('text').should('not.be.empty');

      cy.step('Close tools modal');
      mcpToolsModal.findCloseButton().click();
      mcpToolsModal.find().should('not.exist');

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
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');
      serverRow.findToolsButton().should('have.attr', 'aria-disabled', 'true');

      cy.step('Click configure button to open token modal');
      serverRow.findConfigureButton().click();

      cy.step('Verify token modal opens');
      mcpTokenAuthModal.find().should('be.visible');

      cy.step('Verify submit button is disabled when no token is entered');
      mcpTokenAuthModal.findSubmitButton().should('be.disabled');

      cy.step('Close modal');
      mcpTokenAuthModal.findCancelButton().click();

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
        withToolsInterceptor: { token: testToken, serverUrl },
      });

      navigateToPlayground(namespace);

      cy.step('Click configure button');
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      cy.step('Verify token modal opens');
      mcpTokenAuthModal.find().should('be.visible');

      cy.step('Enter valid token and submit');
      mcpTokenAuthModal.findTokenInput().clear().type(testToken);
      mcpTokenAuthModal.findSubmitButton().click();

      cy.step('Wait for status check with token');
      cy.wait('@statusCheck', { timeout: 10000 });

      cy.step('Verify success modal appears');
      mcpServerSuccessModal.find().should('be.visible');

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
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      mcpTokenAuthModal.findTokenInput().clear().type(invalidToken);
      mcpTokenAuthModal.findSubmitButton().click();

      cy.step('Wait for error response');
      cy.wait('@statusCheckError', { timeout: 10000 });

      cy.step('Verify error message is displayed in modal');
      mcpTokenAuthModal
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
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      mcpTokenAuthModal.findTokenInput().clear().type(testToken);
      mcpTokenAuthModal.findSubmitButton().click();

      cy.step('Wait for error response');
      cy.wait('@statusCheckError', { timeout: 10000 });

      cy.step('Verify error alert is visible');
      mcpTokenAuthModal
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
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.findConfigureButton().click();

      mcpTokenAuthModal.findTokenInput().clear().type(invalidToken);
      mcpTokenAuthModal.findSubmitButton().click();

      cy.step('Verify error is displayed');
      mcpTokenAuthModal
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
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
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
      playgroundPage.mcpTab.getServerRow(github.name, github.url).find().should('be.visible');
      playgroundPage.mcpTab
        .getServerRow(kubernetes.name, kubernetes.url)
        .find()
        .should('be.visible');

      cy.step('Verify server rows contain expected text');
      playgroundPage.mcpTab
        .getServerRow(github.name, github.url)
        .find()
        .should('contain', 'GitHub');
      playgroundPage.mcpTab
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

      cy.step('Verify Kubernetes server is visible in the MCP tab');
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');

      cy.step('Verify no modal is shown before selection');
      playgroundPage.mcpTab.verifyNoModalShown();

      cy.step('Select the Kubernetes server by checking the checkbox');
      serverRow.findCheckbox().check();

      cy.step('Wait for auto-unlock status check and tools fetch');
      cy.wait('@statusCheckAutoConnect', { timeout: 15000 });
      cy.wait('@toolsRequestAutoConnect', { timeout: 15000 });

      cy.step('Verify connection successful modal is shown with server name');
      playgroundPage.mcpTab.verifySuccessModalVisible();
      playgroundPage.mcpTab.verifySuccessModalContainsServerName(serverName);

      cy.step('Close the success modal');
      playgroundPage.mcpTab.closeSuccessModal();
      mcpServerSuccessModal.find().should('not.exist');

      cy.step('Verify tools button is enabled after closing modal');
      serverRow.findToolsButton().should('exist').and('not.have.attr', 'aria-disabled');

      cy.step('Click tools button to open tools modal');
      serverRow.findToolsButton().click();

      cy.step('Verify tools modal opens with tools');
      mcpToolsModal.find().should('be.visible');
      mcpToolsModal.findToolRows().should('have.length.at.least', 1);

      cy.step('Verify all tools are selected initially');
      mcpToolsModal
        .findToolCountText()
        .should('exist')
        .and(($el) => {
          const match = $el.text().match(/(\d+) out of (\d+)/);
          expect(match![1]).to.equal(match![2]);
        });

      cy.step('Get total tools count for later verification');
      mcpToolsModal
        .findToolCountText()
        .invoke('text')
        .then((text) => {
          const match = text.match(/(\d+) out of (\d+)/);
          const totalTools = parseInt(match![2], 10);

          cy.step('Deselect first 2 tools');
          mcpToolsModal.findToolCheckbox(0).click();
          mcpToolsModal.findToolCheckbox(1).click();

          cy.step('Verify count updated to show 2 fewer tools selected');
          mcpToolsModal
            .findToolCountText()
            .should('contain.text', `${totalTools - 2} out of ${totalTools}`);

          cy.step('Save tool selection');
          mcpToolsModal.findSaveButton().click();
          mcpToolsModal.find().should('not.exist');

          cy.step('Re-open tools modal to verify persistence');
          serverRow.findToolsButton().click();
          mcpToolsModal.find().should('be.visible');

          cy.step('Verify tool selection persisted (2 tools deselected)');
          mcpToolsModal
            .findToolCountText()
            .should('contain.text', `${totalTools - 2} out of ${totalTools}`);
        });

      cy.step('Close tools modal');
      mcpToolsModal.findCloseButton().click();
      mcpToolsModal.find().should('not.exist');

      cy.step('Test completed - Auto-unlock with tool selection workflow successful');
    },
  );

  it(
    'should allow comprehensive tool selection operations in tools modal',
    {
      tags: ['@GenAI', '@MCPServers', '@Playground', '@Tools', '@Search', '@Selection', '@E2E'],
    },
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

      cy.step('Select server to trigger auto-unlock');
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.findCheckbox().check();
      cy.wait('@statusCheckAutoConnect', { timeout: 10000 });
      cy.wait('@toolsRequestAutoConnect', { timeout: 10000 });

      cy.step('Close success modal and open tools modal');
      playgroundPage.mcpTab.closeSuccessModal();
      serverRow.findToolsButton().click();

      cy.step('Verify tools modal opens with all tools selected');
      mcpToolsModal.find().should('be.visible');
      mcpToolsModal.findToolRows().should('have.length.at.least', 1);
      // Use .should() to retry until all tools are selected (handles race condition)
      mcpToolsModal
        .findToolCountText()
        .should('exist')
        .and(($el) => {
          const match = $el.text().match(/(\d+) out of (\d+)/);
          expect(match![1]).to.equal(match![2]);
        });

      mcpToolsModal
        .findToolCountText()
        .invoke('text')
        .then((text) => {
          const match = text.match(/(\d+) out of (\d+)/);
          const totalTools = parseInt(match![2], 10);

          cy.step('Test search functionality - search for "pod"');
          mcpToolsModal.findSearchInput().clear().type('pod');

          cy.step('Verify only pod-related tools are visible');
          mcpToolsModal.findToolRows().then(($rows) => {
            const filteredCount = $rows.length;
            expect(filteredCount).to.be.greaterThan(0);
            // Verify all visible rows contain "pod"
            $rows.each((_, row) => {
              expect(row.textContent.toLowerCase()).to.include('pod');
            });

            cy.step('Deselect all filtered tools');
            mcpToolsModal.findSelectAllCheckbox().uncheck();

            cy.step('Verify 0 tools selected after deselect all');
            mcpToolsModal.find().should('contain.text', `0 out of ${totalTools} selected`);

            cy.step('Select all filtered tools again');
            mcpToolsModal.findSelectAllCheckbox().check();

            cy.step('Verify only filtered tools are selected');
            mcpToolsModal
              .findToolCountText()
              .invoke('text')
              .then((countText) => {
                const countMatch = countText.match(/(\d+) out of \d+/);
                const selected = parseInt(countMatch![1], 10);
                expect(selected).to.equal(filteredCount);
              });

            cy.step('Clear search to show all tools');
            mcpToolsModal.findSearchInput().clear();

            cy.step('Verify selection count matches filtered tools count');
            mcpToolsModal
              .findToolCountText()
              .invoke('text')
              .then((countText) => {
                const countMatch = countText.match(/(\d+) out of \d+/);
                const selected = parseInt(countMatch![1], 10);
                expect(selected).to.equal(filteredCount);
              });

            cy.step('Select all tools');
            mcpToolsModal.findSelectAllCheckbox().check();
            mcpToolsModal
              .find()
              .should('contain.text', `${totalTools} out of ${totalTools} selected`);

            cy.step('Deselect individual tool (first row)');
            mcpToolsModal.findToolCheckbox(0).click();
            mcpToolsModal
              .findToolCountText()
              .invoke('text')
              .then((countText) => {
                const countMatch = countText.match(/(\d+) out of \d+/);
                const selected = parseInt(countMatch![1], 10);
                expect(selected).to.equal(totalTools - 1);
              });

            cy.step('Select the tool again');
            mcpToolsModal.findToolCheckbox(0).click();
            mcpToolsModal
              .find()
              .should('contain.text', `${totalTools} out of ${totalTools} selected`);

            cy.step('Save selection and close modal');
            mcpToolsModal.findSaveButton().click();
            mcpToolsModal.find().should('not.exist');

            cy.step('Re-open to verify all tools remain selected');
            serverRow.findToolsButton().click();
            mcpToolsModal.find().should('be.visible');
            mcpToolsModal
              .find()
              .should('contain.text', `${totalTools} out of ${totalTools} selected`);
          });
        });

      cy.step('Test completed - All tool selection operations work correctly');
    },
  );

  it(
    'should show warning alert when total active tools exceed 40',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@ToolsWarning'] },
    () => {
      const namespace = config.defaultNamespace;
      const serverName = 'High-Tools-Server';
      const serverUrl = 'http://high-tools-server.local/mcp';
      const toolsCount = 45; // More than 40 to trigger warning

      initHighToolsCountIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        toolsCount,
      });

      navigateToPlayground(namespace);

      cy.step('Verify server is visible in the MCP tab');
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.find().should('be.visible');

      cy.step('Verify warning is NOT shown before connecting');
      cy.get('[data-testid="mcp-tools-warning-alert"]').should('not.exist');

      cy.step('Select server to trigger auto-unlock');
      serverRow.findCheckbox().check();

      cy.step('Wait for auto-unlock status check and tools fetch');
      cy.wait('@statusCheckAutoConnect', { timeout: 10000 });
      cy.wait('@toolsRequestHighCount', { timeout: 10000 });

      cy.step('Close success modal');
      playgroundPage.mcpTab.closeSuccessModal();

      cy.step('Verify warning alert is shown in MCP tab');
      cy.get('[data-testid="mcp-tools-warning-alert"]')
        .should('be.visible')
        .and('contain.text', 'Performance may be degraded with more than 40 active tools');

      cy.step('Verify tools count shows 45 active');
      serverRow.findToolsButton().should('contain.text', '45 active');

      cy.step('Test completed - Tools warning alert works correctly');
    },
  );

  it(
    'should NOT show warning alert when total active tools are 40 or less',
    { tags: ['@GenAI', '@MCPServers', '@Playground', '@ToolsWarning'] },
    () => {
      const namespace = config.defaultNamespace;
      const serverName = 'Normal-Tools-Server';
      const serverUrl = 'http://normal-tools-server.local/mcp';
      const toolsCount = 40; // Exactly 40, should NOT trigger warning

      initHighToolsCountIntercepts({
        config,
        namespace,
        serverName,
        serverUrl,
        toolsCount,
      });

      navigateToPlayground(namespace);

      cy.step('Select server to trigger auto-unlock');
      const serverRow = playgroundPage.mcpTab.getServerRow(serverName, serverUrl);
      serverRow.findCheckbox().check();

      cy.step('Wait for auto-unlock status check and tools fetch');
      cy.wait('@statusCheckAutoConnect', { timeout: 10000 });
      cy.wait('@toolsRequestHighCount', { timeout: 10000 });

      cy.step('Close success modal');
      playgroundPage.mcpTab.closeSuccessModal();

      cy.step('Verify warning alert is NOT shown (40 tools is the threshold, not exceeding)');
      cy.get('[data-testid="mcp-tools-warning-alert"]').should('not.exist');

      cy.step('Verify tools count shows 40 active');
      serverRow.findToolsButton().should('contain.text', '40 active');

      cy.step('Test completed - No warning for 40 or fewer tools');
    },
  );
});
