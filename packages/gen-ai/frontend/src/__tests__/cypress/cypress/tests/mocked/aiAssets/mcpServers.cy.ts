import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import {
  loadMCPTestConfig,
  initAutoConnectIntercepts,
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

      cy.step('Navigate to Playground with route state');
      cy.visit(`/gen-ai-studio/playground/${namespace}`, {
        onBeforeLoad(win) {
          // React Router v6 wraps custom state in { idx, key, usr: {...} } structure
          win.history.pushState(
            {
              idx: 0,
              key: 'test-navigation-key',
              usr: {
                mcpServers: [serverUrl],
                mcpServerStatuses: {
                  [serverUrl]: {
                    status: 'connected',
                    // eslint-disable-next-line camelcase
                    auth_required: false,
                    message: 'Connection successful',
                  },
                },
              },
            },
            '',
            win.location.pathname,
          );
        },
      });

      cy.step('Verify Playground page loaded');
      playgroundPage.verifyOnPlaygroundPage(namespace);

      cy.step('Verify no modal appears during auto-unlock');
      playgroundPage.mcpTab.verifyNoModalShown();

      cy.step('Open MCP tab');
      playgroundPage.mcpTab.openMCPTab();

      cy.step('Wait for auto-unlock status check');
      cy.wait('@statusCheckAutoConnect', { timeout: 10000 });

      cy.step('Wait for tools to be fetched');
      cy.wait('@toolsRequestAutoConnect', { timeout: 10000 });

      cy.step('Verify server is auto-unlocked and functional');
      playgroundPage.mcpTab.verifyServerAutoUnlocked(serverName, serverUrl);

      cy.step('Verify no modal appeared during flow');
      playgroundPage.mcpTab.verifyNoModalShown();
    },
  );
});
