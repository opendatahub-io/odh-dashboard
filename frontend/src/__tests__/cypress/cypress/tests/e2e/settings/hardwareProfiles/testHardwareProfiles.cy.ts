import yaml from 'js-yaml';
import {
  hardwareProfile,
  createHardwareProfile,
} from '#~/__tests__/cypress/cypress/pages/hardwareProfile';
import { workbenchPage, createSpawnerPage } from '#~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import type { HardwareProfilesData } from '#~/__tests__/cypress/cypress/types';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { deleteModal } from '#~/__tests__/cypress/cypress/pages/components/DeleteModal';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { cleanupHardwareProfiles } from '#~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import { hardwareProfileSection } from '#~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';

describe('Verify Hardware Profiles - Creating, Editing and Deleting', () => {
  let testData: HardwareProfilesData;
  let hardwareProfileName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

        // Load Hardware Profile
        hardwareProfileName = `${testData.hardwareProfileName}-${uuid}`;
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileName}`);

        // Call cleanupHardwareProfiles here, after hardwareProfileName is set
        return cleanupHardwareProfiles(hardwareProfileName);
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
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill(hardwareProfileName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      const toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(hardwareProfileName);
      const row = hardwareProfile.getUniqueRow(hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      // Edit a Harware Profile
      cy.step('Edit the created hardware profile and confirm updates have been saved successfully');
      hardwareProfile
        .getUniqueRow(hardwareProfileName)
        .findKebabAction('Edit')
        .click({ force: true });
      createHardwareProfile
        .findDescriptionTextBox()
        .clear()
        .fill(testData.hardwareProfileEditedDescription);
      createHardwareProfile.findSubmitButton().click();
      toolbar.findSearchInput().type(hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileEditedDescription);

      cy.step('Delete the hardware profile and confirm deletion');
      // Delete a Hardware Profile
      hardwareProfile.getRow(hardwareProfileName).findKebabAction('Delete').click({ force: true });
      deleteModal.findInput().fill(hardwareProfileName);
      deleteModal.findSubmitButton().should('be.enabled').click({ force: true });
      row.findDescription().should('not.contain', hardwareProfileName);
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

          // Call cleanupHardwareProfiles here, after hardwareProfileName is set
          cleanupHardwareProfiles(hardwareProfileName);
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
    hardwareProfileNames.forEach((complexHWPName) => {
      cy.log(`Cleaning up Hardware Profile: ${complexHWPName}`);
      return cleanupHardwareProfiles(complexHWPName);
    });
  });
});

describe('Verify Hardware Profiles Deletion/Change when applied to a resource', () => {
  let testData: HardwareProfilesData;
  let projectName: string;
  let projectDescription: string;
  let hardwareProfileName: string;
  let updatedHardwareProfileName: string;
  const projectUuid = generateTestUUID();
  const hardwareProfileUuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

        projectName = `${testData.projectNamespace}-${projectUuid}`;
        projectDescription = testData.projectDescription;
        hardwareProfileName = `${testData.hardwareProfileName}-${hardwareProfileUuid}`;
        updatedHardwareProfileName = `${testData.updatedHardwareProfileName}-${hardwareProfileUuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);

        // Load Hardware Profile
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileName}`);
        cy.log(`Loaded Hardware Profile Name: ${updatedHardwareProfileName}`);

        // Cleanup Hardware Profile if it already exists
        cleanupHardwareProfiles(hardwareProfileName);
        cleanupHardwareProfiles(updatedHardwareProfileName);
      }),
  );

  // Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    // Use the actual hardware profile name from the YAML, not the variable with UUID
    cy.log(`Cleaning up updated Hardware Profile: ${testData.hardwareProfileName}`);

    // Call cleanupHardwareProfiles with the actual name from the YAML file
    return cleanupHardwareProfiles(testData.hardwareProfileName).then(() => {
      // Delete provisioned Project
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        return deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
      return cy.wrap(null);
    });
  });

  it(
    'Deletes Hardware Profiles applied to a resource',
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
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill(hardwareProfileName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      let toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(hardwareProfileName);
      let row = hardwareProfile.getUniqueRow(hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      // Project navigation
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench and verify it starts running
      cy.step(`Create workbench ${testData.workbenchName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().type(testData.workbenchName);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      hardwareProfileSection.selectPotentiallyDisabledProfile(
        `${hardwareProfileName} ${testData.hardwareProfileDescription} ${testData.hardwareProfileDeploymentSize}`,
        hardwareProfileName,
      );
      createSpawnerPage.findSubmitButton().click();

      // confirm wb creation
      cy.step(`Wait for workbench ${testData.workbenchName} to display a status`);
      let notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      notebookRow.expectStatusLabelToBe('Starting', 2000);

      // Navigate to Hardware Profiles
      cy.step('Navigate to Hardware Profiles');
      hardwareProfile.navigate();

      toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(hardwareProfileName);
      row = hardwareProfile.getUniqueRow(hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      cy.step('Delete the hardware profile and confirm deletion');
      // Delete a Hardware Profile
      hardwareProfile.getRow(hardwareProfileName).findKebabAction('Delete').click({ force: true });
      deleteModal.findInput().fill(hardwareProfileName);
      deleteModal.findSubmitButton().should('be.enabled').click({ force: true });
      row.findDescription().should('not.contain', hardwareProfileName);

      // Project navigation
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // confirm hardware profile deletion
      cy.step(`Verify the deletion of hardware profile ${hardwareProfileName}`);
      notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findHardwareProfileColumn().should('contain', 'Deleted');
    },
  );
});

describe('Verify Hardware Profiles Deletion/Change when applied to a resource', () => {
  let testData: HardwareProfilesData;
  let projectName: string;
  let projectDescription: string;
  let hardwareProfileName: string;
  let updatedHardwareProfileName: string;
  const projectUuid = generateTestUUID();
  const hardwareProfileUuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    cy
      .fixture('e2e/hardwareProfiles/testHardwareProfiles.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as HardwareProfilesData;

        projectName = `${testData.projectNamespace}-${projectUuid}`;
        projectDescription = testData.projectDescription;
        hardwareProfileName = `${testData.hardwareProfileName}-${hardwareProfileUuid}`;
        updatedHardwareProfileName = `${testData.updatedHardwareProfileName}-${hardwareProfileUuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);

        // Load Hardware Profile
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileName}`);
        cy.log(`Loaded Hardware Profile Name: ${updatedHardwareProfileName}`);

        // Cleanup Hardware Profile if it already exists
        cleanupHardwareProfiles(hardwareProfileName);
        cleanupHardwareProfiles(updatedHardwareProfileName);
      }),
  );

  // Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    // Use the actual hardware profile name from the YAML, not the variable with UUID
    cy.log(`Cleaning up updated Hardware Profile: ${testData.updatedHardwareProfileName}`);

    // TODO clean up other HWP as well
    // Call cleanupHardwareProfiles with the actual name from the YAML file
    return cleanupHardwareProfiles(testData.updatedHardwareProfileName).then(() => {
      // Delete provisioned Project
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        return deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
      }
      return cy.wrap(null);
    });
  });

  it(
    'Changes Hardware Profiles applied to a resource',
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
      createHardwareProfile.k8sNameDescription.findDisplayNameInput().fill(hardwareProfileName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      let toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(hardwareProfileName);
      let row = hardwareProfile.getUniqueRow(hardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      // Create another Hardware Profile
      cy.step('Create another Hardware Profile and confirm creation was successful');
      hardwareProfile.findCreateButton().click();
      createHardwareProfile.k8sNameDescription
        .findDisplayNameInput()
        .fill(updatedHardwareProfileName);
      createHardwareProfile.findDescriptionTextBox().fill(testData.hardwareProfileDescription);
      createHardwareProfile.findSubmitButton().click();
      toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().type(updatedHardwareProfileName);
      row = hardwareProfile.getUniqueRow(updatedHardwareProfileName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);

      // Project navigation
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench and verify it starts running
      cy.step(`Create workbench ${testData.workbenchName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().type(testData.workbenchName);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      hardwareProfileSection.selectPotentiallyDisabledProfile(
        `${hardwareProfileName} ${testData.hardwareProfileDescription} ${testData.hardwareProfileDeploymentSize}`,
        hardwareProfileName,
      );
      createSpawnerPage.findSubmitButton().click();

      // confirm wb creation
      cy.step(`Wait for workbench ${testData.workbenchName} to display a status`);
      let notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      // TODO: Make this more flexible, or at least ensure it is good enough
      notebookRow.expectStatusLabelToNotBe('Starting', 120000);

      // Edit the workbench and update
      cy.step("Editing the workbench's applied Hardware Profile");
      notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findKebab().click();
      notebookRow.findKebabAction('Edit workbench').click();

      cy.step('Select a different Hardware Profile');
      // update hardware profile selection
      hardwareProfileSection.selectPotentiallyDisabledProfile(
        `${updatedHardwareProfileName} ${testData.hardwareProfileDescription} ${testData.hardwareProfileDeploymentSize}`,
        updatedHardwareProfileName,
      );
      hardwareProfileSection.findSelect().should('contain', updatedHardwareProfileName);
      createSpawnerPage.findSubmitButton().click();

      // Verify that the workbench has been updated
      cy.step('Verifying the edited details display after updating');
      const notebookEditedRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookEditedRow.findHardwareProfileColumn().should('contain', updatedHardwareProfileName);
    },
  );
});
