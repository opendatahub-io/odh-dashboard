import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  enableGenAiStudio,
  disableGenAiStudio,
  isGenAiStudioEnabled,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/genAiStudioCommands';
import { genAIStudioPage } from '#~/__tests__/cypress/cypress/pages/genAIStudio';

/**
 * GenAI Studio Access Test
 *
 * This test verifies the GenAI Studio feature can be enabled and accessed:
 * 1. Enables GenAI Studio via OdhDashboardConfig patch
 * 2. Verifies the GenAI Studio navigation is available
 * 3. Tests navigation to the GenAI Studio
 * 4. Validates the GenAI Studio page loads correctly
 *
 * Prerequisites:
 * - User must have admin access to patch OdhDashboardConfig
 * - The odh-dashboard-config must exist in APPLICATIONS_NAMESPACE
 * - Test variables must be configured with correct cluster details
 */
describe('Verify GenAI Studio Access', () => {
  before(() => {
    cy.step('Enable GenAI Studio feature');
    enableGenAiStudio().then(() => {
      cy.step('Verify GenAI Studio is enabled in cluster config');
      isGenAiStudioEnabled().should('eq', true);
    });
  });

  after(() => {
    cy.step('Disable GenAI Studio feature');
    disableGenAiStudio();
  });

  it(
    'should access GenAI Studio when enabled',
    { tags: ['@GenAI', '@Sanity', '@SanitySet1'] },
    function accessGenAiStudio() {
      cy.step('Login to the application with GenAI dev feature flag');
      cy.visitWithLogin('/?devFeatureFlags=genAiStudio=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify GenAI Studio navigation is visible');
      genAIStudioPage.verifyNavLinkVisible();

      cy.step('Click on GenAI Studio navigation');
      genAIStudioPage.navigateViaNav();

      cy.step('Verify navigation to GenAI Studio playground');
      genAIStudioPage.verifyOnGenAIStudioPage();

      cy.step('Test completed - GenAI Studio is accessible');
    },
  );

  it(
    'should display MCP servers panel in playground',
    { tags: ['@GenAI', '@MCPServers'] },
    function verifyMCPServersPanel() {
      cy.step('Navigate to GenAI Studio playground with dev feature flag');
      cy.visit('/gen-ai-studio/playground?devFeatureFlags=genAiStudio=true');

      cy.step('Wait for page to load');
      genAIStudioPage.findPageTitle({ timeout: 30000 }).should('be.visible');

      cy.step('Verify MCP servers panel exists');
      genAIStudioPage.verifyMCPServersPanelVisible();

      cy.step('Test completed - MCP servers panel is visible');
    },
  );
});

