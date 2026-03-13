import { NotebookStatusLabel, type WBTolerationsTestData } from '../../../../types';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import { workbenchPage, createSpawnerPage } from '../../../../pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { loadWBTolerationsFixture } from '../../../../utils/dataLoader';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { validateWorkbenchTolerations } from '../../../../utils/oc_commands/workbench';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanHardwareProfile } from '../../../../utils/oc_commands/hardwareProfiles';
import { hardwareProfileSection } from '../../../../pages/components/HardwareProfileSection';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { hardwareProfile } from '../../../../pages/hardwareProfile';
import { deleteModal } from '../../../../pages/components/DeleteModal';

describe('Delete Hardware Profile applied to a resource', () => {
  let testData: WBTolerationsTestData;
  let projectName: string;
  let projectDescription: string;
  const projectUuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    loadWBTolerationsFixture('e2e/hardwareProfiles/testDeleteAppliedHardwareProfile.yaml')
      .then((fixtureData: WBTolerationsTestData) => {
        projectName = `${fixtureData.wbTolerationsTestNamespace}-${projectUuid}`;
        projectDescription = fixtureData.wbTolerationsTestDescription;
        testData = fixtureData;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        return createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Project ${projectName} confirmed to be created and verified successfully`);

        // Load Hardware Profile
        cy.log(`Loaded Hardware Profile Name: ${testData.hardwareProfileName}`);
        // Create Hardware Profile
        createCleanHardwareProfile(testData.resourceYamlPath);
      }),
  );

  // Cleanup: Delete the associated Project (Hardware Profile will be deleted during the test)
  after(() => {
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      return deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
    return cy.wrap(null);
  });

  it(
    'Verify Hardware Profile can be deleted while applied to a workbench without affecting the workbench',
    {
      tags: [
        '@Dashboard',
        '@HardwareProfiles',
        '@Smoke',
        '@SmokeSet1',
        '@Tier1',
        '@HardwareProfilesCI',
      ],
    },
    () => {
      // Get hardware profile display name for use throughout test
      const hardwareProfileDisplayName =
        testData.hardwareProfileDisplayName || 'Delete Applied HP Test';

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Create workbench with hardware profile
      cy.step(`Create workbench ${testData.workbenchName} with hardware profile`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().type(testData.workbenchName);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage(testData.notebookImageName).click();

      // Select the hardware profile - use display name which appears in the dropdown
      hardwareProfileSection.findSelect().click();
      hardwareProfileSection.selectProfileContaining(hardwareProfileDisplayName);

      createSpawnerPage.findSubmitButton().click();

      cy.step(`Wait for workbench ${testData.workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      notebookRow.expectStatusLabelToBe(NotebookStatusLabel.Running, 120000);

      // Validate that the toleration applied earlier displays in the newly created pod
      cy.step('Validate the Tolerations for the pod include the applied toleration');
      validateWorkbenchTolerations(
        projectName,
        testData.workbenchName,
        testData.tolerationValue,
        true,
      ).then((resolvedPodName) => {
        cy.log(
          `Resolved Pod Name: ${resolvedPodName} and ${testData.tolerationValue} displays in the pod as expected`,
        );
      });

      // Navigate to Hardware Profiles page
      cy.step('Navigate to Hardware Profiles page');
      hardwareProfile.navigate();

      // Search for the hardware profile to ensure it's visible
      const toolbar = hardwareProfile.getUniqueTableToolbar();
      toolbar.findSearchInput().clear().type(hardwareProfileDisplayName);

      // Delete the hardware profile using kebab action
      cy.step('Delete the hardware profile while it is applied to a workbench');
      cy.log(`Looking for hardware profile with display name: ${hardwareProfileDisplayName}`);
      const row = hardwareProfile.getUniqueRow(hardwareProfileDisplayName);
      row.findDescription().should('contain', testData.hardwareProfileDescription);
      row.findKebab().click();
      hardwareProfile.findDeleteAction().click();

      // Confirm deletion in modal
      cy.step('Confirm deletion in modal');
      deleteModal.findInput().fill(hardwareProfileDisplayName);
      deleteModal.findSubmitButton().should('be.enabled').click({ force: true });

      // Verify hardware profile is deleted
      cy.step('Verify hardware profile has been deleted');
      hardwareProfile.findTable().should('not.contain', hardwareProfileDisplayName);

      // Navigate back to the project and verify workbench is still running
      cy.step('Navigate to workbenches tab and verify workbench is still running');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Verify workbench is still running
      cy.step('Verify workbench is still running after hardware profile deletion');
      const workbenchRow = workbenchPage.getNotebookRow(testData.workbenchName);
      workbenchRow.findNotebookDescription(projectDescription);
      workbenchRow.expectStatusLabelToBe(NotebookStatusLabel.Running, 30000);

      // Verify the Hardware profile column shows "Deleted" badge
      cy.step(`Verify Hardware profile column shows "${testData.deletedStatusBadge}" badge`);
      workbenchRow.find().contains(testData.deletedStatusBadge).should('be.visible');

      // Validate that the tolerations are still present in the pod
      cy.step('Validate the Tolerations for the pod are still present');
      validateWorkbenchTolerations(
        projectName,
        testData.workbenchName,
        testData.tolerationValue,
        true,
      ).then((resolvedPodName) => {
        cy.log(
          `✅ Resolved Pod Name: ${resolvedPodName} and ${testData.tolerationValue} still displays in the pod as expected`,
        );
      });
    },
  );
});
