import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { aiAssets } from '~/__tests__/cypress/cypress/pages/aiAssets';
import { mcpServersTab } from '~/__tests__/cypress/cypress/pages/mcpServersTab';
import { playground } from '~/__tests__/cypress/cypress/pages/playground';
import {
  TokenAuthModal,
  MCPToolsModal,
  ConfigurePlaygroundModal,
} from '~/__tests__/cypress/cypress/pages/components/Modal';
import { selectPreferredNamespace } from '~/__tests__/cypress/cypress/utils/helpers';
import {
  getNamespaces,
  getMCPServers,
  verifyApiResponse,
} from '~/__tests__/cypress/cypress/utils/apiRequests';

describe('AI Assets - MCP Servers Tab', () => {
  let selectedNamespace: string;

  before(() => {
    // Setup authentication for E2E mode
    if (!Cypress.env('MOCK')) {
      cy.getAuthToken();
    }
  });

  it(
    'should display MCP servers, verify status, and test full authentication flow',
    { tags: ['@Smoke', '@GenAI', '@MCPServers', '@Authentication'] },
    () => {
      cy.step('Load test configuration');
      cy.getTestConfig().then((testConfig) => {
        cy.log(`Test config loaded: ${JSON.stringify(testConfig, null, 2)}`);

        cy.step('Enable Gen-AI feature and visit home');
        appChrome.visit();
        appChrome.verifyGenAiStudioVisible();

        cy.step('Get available namespaces from API');
        getNamespaces().then((namespaceResponse) => {
          verifyApiResponse(namespaceResponse, 200);

          const { data: namespaces } = namespaceResponse.body;
          if (namespaces.length === 0) {
            throw new Error('No namespaces available in cluster');
          }

          selectedNamespace = selectPreferredNamespace(
            namespaces.map((n) => n.name),
            testConfig.CLUSTER.NAMESPACE,
          );

          cy.step(`Navigate to AI Assets for namespace: ${selectedNamespace}`);
          aiAssets.visit(selectedNamespace);
          aiAssets.verifyBothTabsVisible();

          cy.step('Switch to MCP Servers tab');
          aiAssets.switchToMCPServersTab();

          cy.step('Fetch MCP servers from API and verify UI');
          getMCPServers(selectedNamespace).then((mcpResponse) => {
            verifyApiResponse(mcpResponse, 200);

            const { total_count: totalCount } = mcpResponse.body.data;

            if (totalCount === 0) {
              cy.step('No servers configured - verifying empty state');
              mcpServersTab.verifyEmptyState();
              return; // End test here if no servers
            }

            cy.step(`Found ${totalCount} MCP servers - verifying table`);
            mcpServersTab.verifyTableVisible();
            mcpServersTab.verifyHasRows();

            cy.step(`Select MCP server: ${testConfig.MCP_SERVERS.PREFERRED_SERVER}`);
            mcpServersTab
              .selectServerByName(testConfig.MCP_SERVERS.PREFERRED_SERVER, {
                verifyStatus: 'Token required',
              })
              .then(() => {
                cy.step('Navigate to Playground');
                mcpServersTab.clickPlaygroundAction();

                // Handle optional configure modal
                playground.hasConfigureModal().then((hasModal) => {
                  if (hasModal) {
                    cy.step('Configure playground settings');
                    const configModal = new ConfigurePlaygroundModal();
                    configModal.configure();
                  }
                });

                cy.step('Verify navigation to Playground page');
                playground.verifyOnPlaygroundPage(selectedNamespace);

                cy.step('Expand MCP panel and verify server selection');
                playground.expandMCPPanelIfNeeded();
                playground.verifyMCPPanelVisible();

                playground.getCheckedServer().then((checkedServerName) => {
                  // Verify only one server is checked
                  playground.verifyOnlyOneServerChecked();

                  cy.step(`Authenticate MCP server: ${checkedServerName}`);
                  const serverRow = playground.getServerRow(checkedServerName);

                  // Click Configure button
                  serverRow.clickConfigure();

                  cy.step('Enter authentication token in modal');
                  const tokenModal = new TokenAuthModal();
                  tokenModal.shouldBeOpen();
                  tokenModal.enterToken(testConfig.MCP_SERVERS.GITHUB_TOKEN);
                  tokenModal.submit();
                  tokenModal.waitForClose();

                  cy.step('Verify authentication success');
                  serverRow.verifyAuthenticated();

                  cy.step('Open MCP Tools modal');
                  serverRow.clickTools();

                  cy.step('Verify MCP Tools modal content');
                  const toolsModal = new MCPToolsModal();
                  toolsModal.shouldBeOpen();
                  toolsModal.verifyHasTools();
                  toolsModal.verifyFirstToolHasName();
                  toolsModal.verifyTableHeaders();

                  cy.step('Test completed successfully');
                });
              });
          });
        });
      });
    },
  );
});
