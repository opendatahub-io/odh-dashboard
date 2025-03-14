import yaml from 'js-yaml';
import {
  hardwareProfile,
  createHardwareProfile,
} from '~/__tests__/cypress/cypress/pages/hardwareProfile';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import type { HardwareProfilesData } from '~/__tests__/cypress/cypress/types';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { deleteModal } from '~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { cleanupHardwareProfiles } from '~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';

describe('[Feature behing a Dev Feature Flag] Verify Hardware Profiles - Creating, Editing and Deleting', () => {
  // This feature is under active development (see RHOAIENG-9399) and requires a developer flag to be enabled.
  // Append `?devFeatureFlags=true` to the ODH Dashboard URL to enable it for testing and development.

  let testData: HardwareProfilesData;
  let hardwareProfileResourceName: string;

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

        // Load Hardware Profile
        hardwareProfileResourceName = testData.hardwareProfileName;
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileResourceName}`);

        // Call cleanupHardwareProfiles here, after hardwareProfileResourceName is set
        return cleanupHardwareProfiles(hardwareProfileResourceName);
      });
  });

  it(
    'Create, Edit and Delete a Hardware Profile',
    { tags: ['@Featureflagged', '@HardwareProfiles'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to Hardware Profiles
      cy.step('Navigate to Hardware Profiles');
      hardwareProfile.navigate();

      // Create a Hardware Profile
      cy.step('Create a Hardware Profile and confirm creation was successful');
      hardwareProfile.findCreateButton().click();
      createHardwareProfile.k8sNameDescription
        .findDisplayNameInput()
        .fill(testData.hardwareProfileName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      const toolbar = hardwareProfile.getTableToolbar();
      toolbar.findSearchInput().type(testData.hardwareProfileName);
      const row = hardwareProfile.getRow(testData.hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      // Edit a Harware Profile
      cy.step('Edit the created hardware profile and confirm updates have been saved successfully');
      hardwareProfile.getRow(testData.hardwareProfileName).findKebabAction('Edit').click();
      createHardwareProfile
        .findDescriptionTextBox()
        .clear()
        .fill(testData.hardwareProfileEditedDescription);
      createHardwareProfile.findSubmitButton().click();
      toolbar.findSearchInput().type(testData.hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileEditedDescription);

      cy.step('Delete the hardware profile and confirm deletion');
      // Delete a Hardware Profile
      hardwareProfile.getRow(testData.hardwareProfileName).findKebabAction('Delete').click();
      deleteModal.findInput().fill(testData.hardwareProfileName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      hardwareProfile.findHardwareProfilesEmptyState().should('be.visible');
    },
  );
});
