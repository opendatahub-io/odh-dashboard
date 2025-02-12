import type { WBTolerationsTestData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
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
  clusterSettings,
  notebookTolerationSettings,
} from '~/__tests__/cypress/cypress/pages/clusterSettings';
import {
  handleTolerationSettings,
  saveTolerationSettings,
  restoreTolerationSettings,
  disableTolerationsWithRetry,
} from '~/__tests__/cypress/cypress/utils/clusterSettingsUtils';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';

describe('Workbenches - tolerations tests', () => {
  let testData: WBTolerationsTestData;
  let projectName: string;
  let projectDescription: string;
  let initialState: { isChecked: boolean; tolerationValue: string };

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadWBTolerationsFixture('e2e/dataScienceProjects/testWorkbenchTolerations.yaml')
      .then((fixtureData: WBTolerationsTestData) => {
        projectName = fixtureData.wbTolerationsTestNamespace;
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
      });
  });

  // Cleanup: Restore original toleration settings and delete the created project
  after(() => {
    // Restore original toleration settings
    clusterSettings.visit();
    cy.log('Restoring Original toleration settings restored');
    restoreTolerationSettings(initialState);
    cy.log('Original toleration settings restored');

    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it(
    'Validate pod tolerations are applied to a Workbench',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to cluster settings and save the original pod toleration
      // Note - the stored toleration will be restored in the After Method
      cy.step('Navigate to Cluster Settings, save and set pod tolerations');
      clusterSettings.visit();
      saveTolerationSettings().then((state) => {
        initialState = state;
        cy.log('Initial toleration settings saved:', JSON.stringify(initialState));
      });

      //Set Pod Tolerations
      cy.step(`Set pod tolerations to ${testData.tolerationValue}`);
      handleTolerationSettings(testData.tolerationValue);
      clusterSettings.visit();
      notebookTolerationSettings.findKeyInput().should('have.value', testData.tolerationValue);

      // Project navigation
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
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
      createSpawnerPage.findSubmitButton().click();

      cy.step(`Wait for workbench ${testData.workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

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
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
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
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Set Pod Tolerations
      cy.step('Navigate to Cluster Settings and disable Pod Tolerations');
      clusterSettings.visit();
      // Use the util to disable tolerations with retry
      disableTolerationsWithRetry();

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

      // Validate that the toleration is not present in the pod
      cy.step('Validate that the toleration is not present in the pod');
      validateWorkbenchTolerations(projectName, testData.workbenchName, null, true).then(
        (resolvedPodName) => {
          cy.log(`Pod should be running without tolerations - name: ${resolvedPodName}`);
        },
      );
    },
  );

  it(
    'Verifies that a new toleration is added to a new workbench but not to an already running workbench',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1969', '@ODS-2057', '@Dashboard'] },
    () => {
      // Set Pod Tolerations
      cy.step('Navigate to Cluster Settings, save and set pod tolerations');
      clusterSettings.visit();
      handleTolerationSettings(testData.tolerationValueUpdate);
      clusterSettings.visit();
      notebookTolerationSettings
        .findKeyInput()
        .should('have.value', testData.tolerationValueUpdate);

      // Project navigation
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create a second workbench with Config Map variables by uploading a yaml file
      cy.step(`Create a second workbench ${testData.workbenchName2} using config map variables`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().type(testData.workbenchName2);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${testData.workbenchName2} to display a "Running" status`);
      const notebookRow2 = workbenchPage.getNotebookRow(testData.workbenchName2);
      notebookRow2.expectStatusLabelToBe('Running', 120000);
      notebookRow2.shouldHaveNotebookImageName('code-server');
      notebookRow2.shouldHaveContainerSize('Small');

      // Validate that the pod stops running
      cy.step('Validate the Tolerations for the second pod');
      validateWorkbenchTolerations(
        projectName,
        testData.workbenchName2,
        testData.tolerationValueUpdate,
        true,
      ).then((resolvedPodName) => {
        cy.log(
          `Resolved Pod Name: ${resolvedPodName} and ${testData.tolerationValueUpdate} displays in the pod as expected`,
        );
      });
      // Validate that the toleration is not present in the already running pod
      cy.step('Validate that the toleration is not present in the already running pod');
      validateWorkbenchTolerations(projectName, testData.workbenchName, null, true).then(
        (resolvedPodName) => {
          cy.log(`Pod should be running without tolerations - name: ${resolvedPodName}`);
        },
      );
    },
  );
});
