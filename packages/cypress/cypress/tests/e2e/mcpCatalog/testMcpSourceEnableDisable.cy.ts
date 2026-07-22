import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import {
  ensureAllMcpCatalogSourcesEnabled,
  getMcpCatalogSourceIds,
  verifyMcpCatalogSourceEnabled,
  waitForMcpCatalogCards,
  waitForMcpCatalogAfterDisable,
} from '../../../utils/oc_commands/mcpCatalogSettings';
import { mcpCatalogSettings } from '../../../pages/mcpCatalogSettings';
import { mcpCatalogPage } from '../../../pages/mcpCatalog';

describe('MCP Catalog Source Enable/Disable', () => {
  let mcpSourceIds: string[] = [];
  let targetSourceId: string;

  retryableBefore(() =>
    getMcpCatalogSourceIds()
      .then((ids) => {
        mcpSourceIds = ids;
        if (mcpSourceIds.length === 0) {
          throw new Error('No MCP catalog sources found in default ConfigMap');
        }
        [targetSourceId] = mcpSourceIds;
        cy.log(`MCP catalog sources found: ${mcpSourceIds.join(', ')}`);
        cy.log(`Target source for toggle test: ${targetSourceId}`);
      })
      .then(() => ensureAllMcpCatalogSourcesEnabled())
      .then(() => {
        mcpSourceIds.forEach((sourceId) => {
          verifyMcpCatalogSourceEnabled(sourceId, true);
        });
      }),
  );

  after(() => {
    if (!wasSetupPerformed()) {
      cy.log('Skipping cleanup: Setup was not performed');
      return;
    }
    ensureAllMcpCatalogSourcesEnabled();
  });

  it(
    'Admin can enable and disable MCP catalog sources',
    { tags: ['@Dashboard', '@McpCatalog', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as admin user with mcpCatalog feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=mcpCatalog=true', LDAP_ADMIN_USER);

      cy.step('Navigate to MCP catalog settings');
      mcpCatalogSettings.navigate();

      cy.step('Verify source table is visible with sources');
      mcpCatalogSettings.findSourceTable().should('exist');

      cy.step(`Verify ConfigMap shows source '${targetSourceId}' as enabled`);
      verifyMcpCatalogSourceEnabled(targetSourceId, true);

      cy.step('Verify enable toggle is checked for the target source');
      mcpCatalogSettings.findEnableSwitchValue(targetSourceId).should('be.checked');

      cy.step('Navigate to MCP catalog');
      mcpCatalogPage.navigate();

      cy.step('Wait for MCP catalog cards to appear');
      waitForMcpCatalogCards();

      cy.step('Verify MCP catalog cards are visible and capture count');
      mcpCatalogPage
        .findMcpCatalogCards()
        .should('have.length.at.least', 1)
        .its('length')
        .then((cardCount) => {
          cy.log(`Found ${cardCount} MCP catalog cards before disabling`);

          cy.step('Navigate back to MCP catalog settings');
          mcpCatalogSettings.navigate();

          cy.step(`Disable the MCP source '${targetSourceId}' via enable toggle`);
          mcpCatalogSettings.findEnableSwitch(targetSourceId).click();

          cy.step('Verify enable toggle is now unchecked');
          mcpCatalogSettings.findEnableSwitchValue(targetSourceId).should('not.be.checked');

          cy.step(`Verify source '${targetSourceId}' is disabled in ConfigMap`);
          verifyMcpCatalogSourceEnabled(targetSourceId, false);

          cy.step('Navigate to MCP catalog');
          mcpCatalogPage.navigate();

          cy.step('Wait for catalog to reflect disabled source');
          waitForMcpCatalogAfterDisable(cardCount);
        });
    },
  );
});
