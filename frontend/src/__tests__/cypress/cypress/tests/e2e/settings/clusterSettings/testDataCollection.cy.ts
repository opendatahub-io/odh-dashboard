import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  clusterSettings,
  telemetrySettings,
} from '#~/__tests__/cypress/cypress/pages/clusterSettings';
import { getCustomResource } from '#~/__tests__/cypress/cypress/utils/oc_commands/customResources';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

describe('Verify That Usage Data Collection Can Be Set In Cluster Settings', () => {
  let skipTest = false;

  retryableBefore(() => {
    // Check if the operator is RHOAI, if its not, skip the test
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator').then((result) => {
      if (!result.stdout.includes('rhods-operator')) {
        cy.log('RHOAI operator not found, skipping the test.');
        skipTest = true;
      } else {
        cy.log('RHOAI operator confirmed:', result.stdout);
      }
    });
  });

  it(
    'Verify Usage Data Collection can be Enabled/Disabled',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-1218', '@Dashboard', '@NonConcurrent'] },
    () => {
      if (skipTest) {
        cy.log('Skipping test confirmed');
        return;
      }

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
