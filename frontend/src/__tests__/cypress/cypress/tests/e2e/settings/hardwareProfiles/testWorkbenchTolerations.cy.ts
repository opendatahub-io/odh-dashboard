import type { WBTolerationsTestData } from '~/__tests__/cypress/cypress/types';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  notebookConfirmModal,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBTolerationsFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { validateWorkbenchTolerations } from '~/__tests__/cypress/cypress/utils/oc_commands/workbench';
import {
  retryableBefore,
  wasSetupPerformed,
} from '~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';
import { hardwareProfileSection } from '~/__tests__/cypress/cypress/pages/components/HardwareProfileSection';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Workbenches - tolerations tests', () => {
  let testData: WBTolerationsTestData;
  let projectName: string;
  let projectDescription: string;
  let hardwareProfileResourceName: string;
  const projectUuid = generateTestUUID();
  const hardwareProfileUuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadWBTolerationsFixture('e2e/hardwareProfiles/testWorkbenchTolerations.yaml')
      .then((fixtureData: WBTolerationsTestData) => {
        projectName = `${fixtureData.wbTolerationsTestNamespace}-${projectUuid}`;
        projectDescription = fixtureData.wbTolerationsTestDescription;
        hardwareProfileResourceName = `${fixtureData.hardwareProfileName}-${hardwareProfileUuid}`;
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
        cy.log(`Loaded Hardware Profile Name: ${hardwareProfileResourceName}`);
        // Cleanup Hardware Profile if it already exists
        createCleanHardwareProfile(testData.resourceYamlPath);
      });
  });

  // Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    // Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) return;

    // Load Hardware Profile
    cy.log(`Loaded Hardware Profile Name: ${hardwareProfileResourceName}`);

    // Call cleanupHardwareProfiles here, after hardwareProfileResourceName is set
    return cleanupHardwareProfiles(hardwareProfileResourceName).then(() => {
      // Delete provisioned Project
      if (projectName) {
        cy.log(`Deleting Project ${projectName} after the test has finished.`);
        deleteOpenShiftProject(projectName, { wait: false });
      }
    });
  });

  it(
    'Verify Workbench Creation using Hardware Profiles and applying Tolerations',
    // TODO: Add the below tags once this feature is enabled in 2.20+
    //  { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
    { tags: ['@Featureflagged', '@HardwareProfilesWB', '@HardwareProfiles'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

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
        testData.hardwareProfileDeploymentSize,
        hardwareProfileResourceName,
      );
      createSpawnerPage.findSubmitButton().click();

      cy.step(`Wait for workbench ${testData.workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');

      // Validate that the toleration applied earlier displays in the newly created pod
      cy.step('Validate the Tolerations for the pod include the newly added toleration');
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
    },
  );

  it(
    'Validate pod tolerations for a stopped workbench',
    // TODO: Add the below tags once this feature is enabled in 2.20+
    //  { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
    { tags: ['@Featureflagged', '@HardwareProfilesWB', '@HardwareProfiles'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Stop workbench and verify it stops running
      cy.step(`Stop workbench ${testData.workbenchName}`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookStop().click();
      notebookConfirmModal.findStopWorkbenchButton().click();
      notebookRow.expectStatusLabelToBe('Stopped', 120000);
      cy.reload();

      // Validate that the pod stops running
      cy.step('Validate that the pod stops running');
      validateWorkbenchTolerations(projectName, testData.workbenchName, null, false).then(
        (resolvedPodName) => {
          cy.log(`Pod should not be running - name: ${resolvedPodName}`);
        },
      );
    },
  );

  it(
    'Validate pod tolerations when a workbench is restarted with tolerations and tolerations are disabled',
    // TODO: Add the below tags once this feature is enabled in 2.20+
    //  { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
    { tags: ['@Featureflagged', '@HardwareProfilesWB', '@HardwareProfiles'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Set Pod Tolerations
      cy.step('Navigate to Cluster Settings and disable Pod Tolerations');
      // Delete Hardware Profile
      cleanupHardwareProfiles(hardwareProfileResourceName);

      // Project navigation
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Stop workbench and verify it stops running
      cy.step(`Restart workbench ${testData.workbenchName} and validate it has been started`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookStart().click();
      notebookRow.expectStatusLabelToBe('Running', 120000);
      cy.reload();

      // Validate that the toleration applied earlier still displays in the pod
      cy.step('Validate the Tolerations for the pod still include the tolerations applied earlier');
      validateWorkbenchTolerations(
        projectName,
        testData.workbenchName,
        testData.tolerationValue,
        true,
      ).then((resolvedPodName) => {
        cy.log(
          `✅ Resolved Pod Name: ${resolvedPodName} and ${testData.tolerationValue} displays in the pod as expected`,
        );
      });
    },
  );
});
