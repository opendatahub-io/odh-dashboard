import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { clusterSettings, telemetrySettings } from '../../../../pages/clusterSettings';
import { isRHOAI } from '../../../../utils/oc_commands/applications';
import { retryableBefore } from '../../../../utils/retryableHooks';

describe('Verify That Usage Data Collection Can Be Set In Cluster Settings', () => {
  let skipTest = false;

  retryableBefore(() => {
    cy.step('Check if the operator is RHOAI');
    isRHOAI().then((rhoai) => {
      if (!rhoai) {
        cy.log('ODH detected, skipping RHOAI-specific test.');
        skipTest = true;
      }
    });
  });

  beforeEach(function skipIfNotRHOAI() {
    if (skipTest) {
      this.skip();
    }
  });

  it(
    'Verify Usage Data Collection can be Enabled/Disabled',
    {
      tags: ['@Sanity', '@SanitySet1', '@ODS-1218', '@Dashboard', '@NonConcurrent', '@SettingsCI'],
    },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      clusterSettings.navigate();

      // Check that usage data collection is enabled by default
      cy.step('Data collection is enabled');
      telemetrySettings.findEnabledCheckbox().should('be.checked');

      // Disable data usage collection
      cy.step('Disable usage data collection');
      telemetrySettings.findEnabledCheckbox().click();

      // Save changes in cluster settings
      cy.step('Save changes and wait for changes to be applied');
      clusterSettings.findSubmitButton().click();

      // Refresh and verify data collection is still disabled
      cy.step('Refresh settings view');
      cy.reload();
      telemetrySettings.findEnabledCheckbox().should('not.be.checked');

      // Re-enable data usage collection
      cy.step('re-enable usage data collection');
      telemetrySettings.findEnabledCheckbox().click();

      // Save changes in cluster settings
      cy.step('Save changes and wait for changes to be applied');
      clusterSettings.findSubmitButton().click();

      // Refresh and verify data collection is re-enabled
      cy.step('Refresh settings view');
      cy.reload();
      telemetrySettings.findEnabledCheckbox().should('be.checked');
    },
  );
});
