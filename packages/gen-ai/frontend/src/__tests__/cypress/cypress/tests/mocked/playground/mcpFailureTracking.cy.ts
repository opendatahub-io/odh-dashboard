/* eslint-disable camelcase */
import { captureTracking, expectSafeTracking } from '@odh-dashboard/cypress/cypress/utils/analytics';
import { playgroundPage } from '~/__tests__/cypress/cypress/pages/playgroundPage';
import { mcpTokenAuthModal } from '~/__tests__/cypress/cypress/pages/playgroundPage/mcpModals';
import mcpStatusError from '~/__tests__/cypress/cypress/fixtures/mocked/mcpServers/mcpStatusError400.json';
import {
  loadMCPTestConfig,
  initIntercepts,
  navigateToPlayground,
  clearMCPRegistryServersFlag,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('MCP failure tracking', () => {
  let config: MCPTestConfig;
  before(() =>
    loadMCPTestConfig().then((data) => {
      config = data;
    }),
  );
  afterEach(() => clearMCPRegistryServersFlag());

  it('should preserve the existing generic alert and console diagnostic without tracking raw_error', () => {
    const namespace = config.defaultNamespace;
    const { name: serverName, url: serverUrl } = config.servers.github;
    const marker = 'Review-secret-95482';
    initIntercepts({
      config,
      namespace,
      serverName,
      serverUrl,
      withStatusError: { errorType: '400', serverUrl },
    });
    cy.intercept('GET', '**/mcp/status*', {
      statusCode: 200,
      body: {
        data: {
          ...mcpStatusError.data,
          server_url: serverUrl,
          error_details: { ...mcpStatusError.data.error_details, raw_error: marker },
        },
      },
    }).as('privacyStatus');
    navigateToPlayground(namespace);
    playgroundPage.mcpTab.getServerRow(serverName, serverUrl).findConfigureButton().click();
    cy.window().then((win) => {
      cy.spy(win.console, 'error').as('diagnosticConsole');
    });
    captureTracking();
    mcpTokenAuthModal.findTokenInput().clear().type(config.tokens.invalid);
    mcpTokenAuthModal.findSubmitButton().click();
    // Preserve the existing generic alert and detailed console diagnostic.
    mcpTokenAuthModal.find().should('contain.text', 'Authorization failed. Try again.');
    mcpTokenAuthModal.find().should('not.contain.text', marker);
    cy.get('@diagnosticConsole').should(
      'have.been.calledWith',
      'MCP Server validation error:',
      marker,
    );
    expectSafeTracking('Playground MCP Auth', { success: false, error: 'unknown_error' }, marker);
    expectSafeTracking(
      'Playground MCP Auth',
      { success: false, error: 'unknown_error' },
      config.tokens.invalid,
    );
  });
});
