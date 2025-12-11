import yaml from 'js-yaml';
import { hardwareProfile, createHardwareProfile } from '../../../../pages/hardwareProfile';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import type { HardwareProfilesData } from '../../../../types';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { cleanupHardwareProfiles } from '../../../../utils/oc_commands/hardwareProfiles';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { workbenchPage, createSpawnerPage } from '../../../../pages/workbench';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import { createCleanProject } from '../../../../utils/projectChecker';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection';

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

        // Cleanup Hardware Profile if it already exists - chain properly
        return cleanupHardwareProfiles(hardwareProfileName).then(() => {
          return cleanupHardwareProfiles(updatedHardwareProfileName);
        });
      }),
  );

  // Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    // Cleanup both hardware profiles with UUIDs
    cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
    return cleanupHardwareProfiles(hardwareProfileName)
      .then(() => {
        cy.log(`Cleaning up Hardware Profile: ${updatedHardwareProfileName}`);
        return cleanupHardwareProfiles(updatedHardwareProfileName);
      })
      .then(() => {
        // Delete provisioned Project (this will also clean up workbenches)
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
