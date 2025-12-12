import yaml from 'js-yaml';
import { hardwareProfile, createHardwareProfile } from '../../../../pages/hardwareProfile';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import type { HardwareProfilesData } from '../../../../types';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { cleanupHardwareProfiles } from '../../../../utils/oc_commands/hardwareProfiles';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

describe('Verify Hardware Profiles - Creating, Editing and Deleting', () => {
  let testData: HardwareProfilesData;
  let hardwareProfileResourceName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

        // Load Hardware Profile
        hardwareProfileResourceName = `${testData.hardwareProfileName}-${uuid}`;
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileResourceName}`);

        // Call cleanupHardwareProfiles here, after hardwareProfileResourceName is set
        return cleanupHardwareProfiles(hardwareProfileResourceName);
      }),
  );

  it(
    'Create, Edit and Delete a Hardware Profile',
    { tags: ['@Dashboard', '@HardwareProfiles', '@Smoke', '@SmokeSet1'] },
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
        .fill(hardwareProfileResourceName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      let toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(hardwareProfileResourceName);
      const row = hardwareProfile.getUniqueRow(hardwareProfileResourceName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      // Edit a Harware Profile
      cy.step('Edit the created hardware profile and confirm updates have been saved successfully');
      hardwareProfile
        .getUniqueRow(hardwareProfileResourceName)
        .findKebabAction('Edit')
        .click({ force: true });
      createHardwareProfile
        .findDescriptionTextBox()
        .clear()
        .fill(testData.hardwareProfileEditedDescription);
      createHardwareProfile.findSubmitButton().click();
      toolbar.findSearchInput().type(hardwareProfileResourceName);
      row.findDescription().should('contain', testData.hardwareProfileEditedDescription);

      cy.step('Delete the hardware profile and confirm deletion');
      // Delete a Hardware Profile
      hardwareProfile
        .getRow(hardwareProfileResourceName)
        .findKebabAction('Delete')
        .click({ force: true });
      deleteModal.findInput().fill(hardwareProfileResourceName);
      deleteModal.findSubmitButton().should('be.enabled').click({ force: true });
      toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(hardwareProfileResourceName);
      hardwareProfile.findHardwareProfilesEmptyState().should('exist');
    },
  );
});

describe('Verify Hardware Profiles - Creating with various complexity in name', () => {
  let testData: HardwareProfilesData;
  const hardwareProfileNames: string[] = [];
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

        testData.exhaustiveHWPNames.forEach((complexHWPName) => {
          // Load Hardware Profile
          const hardwareProfileName = `${complexHWPName}-${uuid}`;
          hardwareProfileNames.push(hardwareProfileName);
          cy.log(`Loaded Hardware Profile Name: ${hardwareProfileName}`);
        });

        // Cleanup Hardware Profiles if they already exist
        return cy.wrap(hardwareProfileNames).each((profileName: string) => {
          return cleanupHardwareProfiles(profileName);
        });
      }),
  );

  it(
    'Creates Hardware Profiles with complex names',
    { tags: ['@Dashboard', '@HardwareProfiles', '@Smoke', '@SmokeSet1'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to Hardware Profiles
      cy.step('Navigate to Hardware Profiles');
      hardwareProfile.navigate();

      hardwareProfileNames.forEach((complexHWPName) => {
        // Create a Hardware Profile
        cy.step('Create a Hardware Profile and confirm creation was successful');
        hardwareProfile.findCreateButton().click();
        createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill(complexHWPName);
        createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
        createHardwareProfile.findSubmitButton().click();
        const toolbar = hardwareProfile.getUniqueTableToolbar();
        toolbar.findSearchInput().type(complexHWPName);
        const row = hardwareProfile.getUniqueRow(complexHWPName);
        row.findDescription().should('contain', testData.hardwareProfileDescription);
      });
    },
  );

  after(() => {
    // Cleanup all hardware profiles
    return cy.wrap(hardwareProfileNames).each((profileName: string) => {
      cy.log(`Cleaning up Hardware Profile: ${profileName}`);
      return cleanupHardwareProfiles(profileName);
    });
  });
});
