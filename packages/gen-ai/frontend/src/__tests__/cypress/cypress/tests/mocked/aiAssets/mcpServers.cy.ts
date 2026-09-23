import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import {
  loadMCPTestConfig,
  initAutoConnectIntercepts,
  navigateFromAIAssetsToPlayground,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('AI Assets - MCP Servers', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  it(
    'should silently auto-unlock server when navigating from AI Assets to Playground',
    {
      tags: ['@GenAI', '@MCPServers', '@AIAssets', '@AutoUnlock', '@Navigation'],
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

      navigateFromAIAssetsToPlayground(namespace);

      cy.step('Select the server and open it in Playground');
      aiAssetsPage.findMCPServerCheckbox(serverName).check().should('be.checked');
      aiAssetsPage.findTryInPlaygroundButton().should('contain.text', 'Try in Playground (1)');
      aiAssetsPage.findTryInPlaygroundButton().should('be.enabled').click();

      cy.step('Verify Playground page loaded');
      playgroundPage.verifyOnPlaygroundPage(namespace);

      cy.step('Verify no modal appears during auto-unlock');
      playgroundPage.mcpTab.verifyNoModalShown();

      cy.step('Open MCP tab');
      playgroundPage.mcpTab.openMCPTab();

      cy.step('Wait for tools to be fetched');
      cy.wait('@toolsRequestAutoConnect', { timeout: 10000 });

      cy.step('Verify server is auto-unlocked and functional');
      playgroundPage.mcpTab.verifyServerAutoUnlocked(serverName, serverUrl);

      cy.step('Verify no modal appeared during flow');
      playgroundPage.mcpTab.verifyNoModalShown();
    },
  );
});
