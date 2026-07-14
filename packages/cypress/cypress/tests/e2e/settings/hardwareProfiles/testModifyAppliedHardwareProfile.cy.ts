import yaml from 'js-yaml';
import {
  hardwareProfile,
  createHardwareProfile,
  editHardwareProfile,
} from '../../../../pages/hardwareProfile';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import type { HardwareProfilesData } from '../../../../types';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { cleanupHardwareProfiles } from '../../../../utils/oc_commands/hardwareProfiles';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { workbenchPage, createSpawnerPage } from '../../../../pages/workbench';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import { createCleanProject } from '../../../../utils/projectChecker';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection';
import { NotebookStatusLabel } from '../../../../types';

describe('Modify Hardware Profile applied to a running Workbench', () => {
  let testData: HardwareProfilesData;
  let projectName: string;
  let projectDescription: string;
  let hardwareProfileName: string;
  let updatedHardwareProfileName: string;
  let modifiedHardwareProfileName: string;
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
        modifiedHardwareProfileName = `${testData.updatedHardwareProfileName}-modified-${hardwareProfileUuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);

        // Load Hardware Profile names
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileName}`);
        cy.log(`Loaded Updated Hardware Profile Name: ${updatedHardwareProfileName}`);
        cy.log(`Loaded Modified Hardware Profile Name: ${modifiedHardwareProfileName}`);

        // Cleanup Hardware Profiles if they already exist
        return cleanupHardwareProfiles(hardwareProfileName)
          .then(() => cleanupHardwareProfiles(updatedHardwareProfileName))
          .then(() => cleanupHardwareProfiles(modifiedHardwareProfileName));
      }),
  );

  // Cleanup: Delete Hardware Profiles and the associated Project
  after(() => {
    // Cleanup all hardware profiles with UUIDs
    cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
    return cleanupHardwareProfiles(hardwareProfileName)
      .then(() => {
        cy.log(`Cleaning up Hardware Profile: ${updatedHardwareProfileName}`);
        return cleanupHardwareProfiles(updatedHardwareProfileName);
      })
      .then(() => {
        cy.log(`Cleaning up Hardware Profile: ${modifiedHardwareProfileName}`);
        return cleanupHardwareProfiles(modifiedHardwareProfileName);
      })
      .then(() => {
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
    {
      tags: ['@Dashboard', '@HardwareProfiles', '@Smoke', '@SmokeSet1', '@HardwareProfilesCI'],
    },
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
      createSpawnerPage.findNotebookImage(testData.notebookImageName).click();
      hardwareProfileSection.selectPotentiallyDisabledProfile(
        `${hardwareProfileName} ${testData.hardwareProfileDescription} ${testData.hardwareProfileDeploymentSize}`,
        hardwareProfileName,
      );
      createSpawnerPage.findSubmitButton().click();

      // confirm wb creation
      cy.step(`Wait for workbench ${testData.workbenchName} to display a status`);
      let notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 120000);

      // Edit the workbench and update
      cy.step("Editing the workbench's applied Hardware Profile");
      notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findKebab().click();
      notebookRow.findKebabAction(testData.editWorkbenchAction).click();

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
      // Wait for navigation back to the workbenches page
      cy.url().should('include', `/projects/${projectName}`);
      projectDetails.findSectionTab('workbenches').should('be.visible');
      const notebookEditedRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookEditedRow.findHardwareProfileColumn().should('contain', updatedHardwareProfileName);

      // Verify workbench is running before modifying the hardware profile
      cy.step('Verify workbench is running with the updated hardware profile');
      notebookEditedRow.expectStatusLabelToBe(NotebookStatusLabel.Ready, 120000);

      // Modify the hardware profile while the workbench is running
      cy.step('Navigate to Hardware Profiles to modify the applied profile');
      hardwareProfile.navigate();

      cy.step(`Edit the hardware profile "${updatedHardwareProfileName}" name`);
      toolbar.findSearchInput().clear().type(updatedHardwareProfileName);
      row = hardwareProfile.getUniqueRow(updatedHardwareProfileName);
      row.findKebab().click();
      hardwareProfile.findEditAction().click();

      // Change the name of the hardware profile
      editHardwareProfile.k8sNameDescription
        .findDisplayNameInput()
        .clear()
        .fill(modifiedHardwareProfileName);
      editHardwareProfile.findSubmitButton().click();

      // Navigate back to the project workbenches
      cy.step('Navigate back to project workbenches');
      // Wait for the hardware profile edit to complete
      cy.url().should('include', testData.settingsHardwareProfilesUrl);
      // Navigate to the project workbenches using page object
      workbenchPage.visit(projectName);

      // Verify the workbench is still running (hasn't stopped)
      cy.step('Verify workbench is still running and has not stopped');
      const notebookAfterModification = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookAfterModification.expectStatusLabelToBe(NotebookStatusLabel.Ready, 30000);

      // Verify the "Updated" tag is present in the hardware profile column
      cy.step('Verify the "Updated" tag is displayed in the hardware profile column');
      notebookAfterModification.findHardwareProfileUpdatedLabel().should('be.visible');
      notebookAfterModification
        .findHardwareProfileColumn()
        .should('contain', modifiedHardwareProfileName);
    },
  );
});
