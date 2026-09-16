import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import {
  loadMCPTestConfig,
  configureMCPRegistryServersFlag,
  setMCPRegistryServersFlag,
  clearMCPRegistryServersFlag,
  initAutoConnectIntercepts,
  initRegistryIntercepts,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('AI Assets - MCP Servers', () => {
  let config: MCPTestConfig;

  afterEach(() => {
    clearMCPRegistryServersFlag();
  });

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  it(
    'should show registered and manual servers when the flag is enabled',
    { tags: ['@GenAI', '@MCPServers', '@AIAssets', '@Registry', '@FeatureFlag'] },
    () => {
      const namespace = config.defaultNamespace;

      initRegistryIntercepts({
        config,
        namespace,
        registryServers: [{ name: 'Registry-Server-1', url: 'http://registry-server-1.local/mcp' }],
        configmapServers: [
          { name: 'ConfigMap-Server-1', url: 'http://configmap-server-1.local/mcp' },
        ],
      });
      configureMCPRegistryServersFlag(true);
      appChrome.visit();
      setMCPRegistryServersFlag(true);
      aiAssetsPage.visit(namespace, { devFeatureFlags: 'genAiMcpRegistryServers=true' });
      aiAssetsPage.switchToMCPServersTab();

      aiAssetsPage.findMCPServerRow('Registry-Server-1').should('be.visible');
      aiAssetsPage.findMCPServerRow('ConfigMap-Server-1').should('be.visible');
    },
  );

  it(
    'should hide registered servers and keep manual servers when the flag is disabled',
    { tags: ['@GenAI', '@MCPServers', '@AIAssets', '@Registry', '@FeatureFlag'] },
    () => {
      const namespace = config.defaultNamespace;

      initRegistryIntercepts({
        config,
        namespace,
        registryServers: [{ name: 'Registry-Server-1', url: 'http://registry-server-1.local/mcp' }],
        configmapServers: [
          { name: 'ConfigMap-Server-1', url: 'http://configmap-server-1.local/mcp' },
        ],
      });
      configureMCPRegistryServersFlag(false);
      appChrome.visit();
      aiAssetsPage.visit(namespace);
      aiAssetsPage.switchToMCPServersTab();

      aiAssetsPage.findMCPServersTable().should('not.contain.text', 'Registry-Server-1');
      aiAssetsPage.findMCPServerRow('ConfigMap-Server-1').should('be.visible');
    },
  );

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
