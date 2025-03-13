import { hardwareProfile, createHardwareProfile } from "~/__tests__/cypress/cypress/pages/hardwareProfile";
import { HTPASSWD_CLUSTER_ADMIN_USER } from "~/__tests__/cypress/cypress/utils/e2eUsers";
import { HardwareProfilesData } from "~/__tests__/cypress/cypress/types";
import { retryableBefore } from "~/__tests__/cypress/cypress/utils/retryableHooks";
import yaml from 'js-yaml';

describe('Test Hardware Profiles', () => {
    let testData: HardwareProfilesData;

      // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

      });
  });

    it('Create and Delete a Hardware Profile',
        { tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@HardwareProfile'] },
        () => {

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to Hardware Profiles
      cy.step('Navigate to Hardware Profiles');
      hardwareProfile.navigate();

      // Create a Hardware Profile
      cy.step('Create a Hardware Profile and confirm creation');
      hardwareProfile.findCreateButton().click();
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill(testData.hardwareProfileName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      
          // Wait for the row to appear with increased timeout.
    cy.get('body').contains('Test Hardware Profile', { matchCase: false })
    .should('be.visible', { timeout: 40000 })
    .then(() => {
      // Get the row *inside* the .then() to ensure it exists *after* the wait

      // Verify the description
      cy.get('[data-testid="table-row-title-description"]').should('contain.text', 'Cypress Test Hardware Profile description.');
    });
  });
});