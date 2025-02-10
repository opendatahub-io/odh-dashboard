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
} from '~/__tests__/cypress/cypress/utils/clusterSettingsUtils';

describe('Workbenches - tolerations tests', () => {
    let testData: WBTolerationsTestData;
    let projectName: string;
    let projectDescription: string;
    let initialState: { isChecked: boolean; tolerationValue: string };
    let workbenchName: string;
    let tolerationValue: string;

  // Setup: Load test data and ensure clean state
  before(() => {
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

  it('Validate pod tolerations for a running workbench', () => {
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step('Navigate to Cluster Settings, save and set pod tolerations');
    clusterSettings.visit();

    saveTolerationSettings().then((state) => {
      initialState = state;
      cy.log('Initial toleration settings saved:', JSON.stringify(initialState));
    });

    handleTolerationSettings(testData.tolerationValue);
    clusterSettings.visit();
    notebookTolerationSettings.findKeyInput().should('have.value', testData.tolerationValue);

    cy.step(`Navigate to workbenches tab of Project ${projectName}`);
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();
    projectDetails.findSectionTab('workbenches').click();

    cy.step(`Create workbench ${testData.workbenchName}`);
    workbenchPage.findCreateButton().click();
    createSpawnerPage.getNameInput().fill(testData.workbenchName);
    createSpawnerPage.getDescriptionInput().type(projectDescription);
    createSpawnerPage.findNotebookImage('code-server-notebook').click();
    createSpawnerPage.findSubmitButton().click();

    cy.step(`Wait for workbench ${testData.workbenchName} to display a "Running" status`);
    const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
    notebookRow.findNotebookDescription(projectDescription);
    notebookRow.expectStatusLabelToBe('Running', 120000);
    notebookRow.shouldHaveNotebookImageName('code-server');
    notebookRow.shouldHaveContainerSize('Small');

    validateWorkbenchTolerations(projectName, testData.workbenchName, testData.tolerationValue, true).then(
      (resolvedPodName) => {
        cy.log(`Resolved Pod Name: ${resolvedPodName}`);
      },
    );
  });

  it('Validate pod tolerations for a stopped workbench', () => {
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    cy.step('Stop workbench and validate it has been stopped');
    cy.step(`Navigate to workbenches tab of Project ${projectName}`);
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();
    projectDetails.findSectionTab('workbenches').click();
    const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
    notebookRow.findNotebookStop().click();
    notebookConfirmModal.findStopWorkbenchButton().click();
    notebookRow.expectStatusLabelToBe('Stopped', 120000);
    cy.reload();
    
    validateWorkbenchTolerations(projectName, testData.workbenchName, null, false).then((resolvedPodName) => {
      cy.log(`Pod should not be running - name: ${resolvedPodName}`);
    });
  });

  it('Validate pod tolerations when a workbench is restarted with tolerations and tolerations are disabled', () => {
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    cy.step('Navigate to Cluster Settings and disable Pod Tolerations');
    clusterSettings.visit();
    notebookTolerationSettings.findEnabledCheckbox().click().should('not.be.checked');
    clusterSettings.findSubmitButton().click();

    cy.step(`Navigate to workbenches tab of Project ${projectName}`);
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();
    projectDetails.findSectionTab('workbenches').click();

    cy.step('Restart workbench and validate it has been started');
    const notebookRow = workbenchPage.getNotebookRow(testData.workbenchName);
    notebookRow.findNotebookStart().click();
    notebookRow.expectStatusLabelToBe('Running', 120000);
    cy.reload();
    cy.step('Validate that the toleration is not present in the pod');
    validateWorkbenchTolerations(projectName, testData.workbenchName, null, true).then((resolvedPodName) => {
      cy.log(`Pod should be running without tolerations - name: ${resolvedPodName}`);
    });
  });
});