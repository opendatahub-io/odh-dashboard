import type { WBEditTestData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  notebookConfirmModal,
  workbenchStatusModal,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadPVCEditFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';

describe('Edit and Update a Workbench in RHOAI', () => {
  let editTestNamespace: string;
  let editedTestNamespace: string;
  let editedTestDescription: string;
  let pvcEditDisplayName: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    return loadPVCEditFixture('e2e/dataScienceProjects/testWorkbenchEditing.yaml')
      .then((fixtureData: WBEditTestData) => {
        editTestNamespace = fixtureData.editTestNamespace;
        editedTestNamespace = fixtureData.editedTestNamespace;
        editedTestDescription = fixtureData.editedTestDescription;
        pvcEditDisplayName = fixtureData.pvcEditDisplayName;

        if (!editTestNamespace) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${editTestNamespace}`);
        return createCleanProject(editTestNamespace);
      })
      .then(() => {
        cy.log(`Project ${editTestNamespace} confirmed to be created and verified successfully`);
      });
  });
  after(() => {
    // Delete provisioned Project
    if (editTestNamespace) {
      cy.log(`Deleting Project ${editTestNamespace} after the test has finished.`);
      deleteOpenShiftProject(editTestNamespace);
    }
  });

  it(
    'Editing Workbench Name and Description',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-1931', '@Dashboard'] },
    () => {
      const workbenchName = editTestNamespace.replace('dsp-', '');

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${editTestNamespace}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(editTestNamespace);
      projectListPage.findProjectLink(editTestNamespace).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench
      cy.step(`Create workbench ${editTestNamespace} using storage ${pvcEditDisplayName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

      // Stop workbench
      cy.step('Stop workbench and validate it has been stopped');
      notebookRow.findNotebookStop().click();
      notebookConfirmModal.findStopWorkbenchButton().click();
      notebookRow.expectStatusLabelToBe('Stopped', 120000);
      cy.reload();

      notebookRow.findHaveNotebookStatusText().click();
      workbenchStatusModal.getNotebookStatus('Stopped');
      workbenchStatusModal.getModalCloseButton().click();

      // Edit the workbench and update
      cy.step('Editing the workbench - both the Name and Description');
      notebookRow.findKebab().click();
      notebookRow.findKebabAction('Edit workbench').click();
      createSpawnerPage.getNameInput().clear().type(editedTestNamespace);
      createSpawnerPage.getDescriptionInput().type(editedTestDescription);
      createSpawnerPage.findSubmitButton().click();

      // Verify that the workbench has been updated
      cy.step('Verifying the Edited details display after updating');
      const notebookEditedRow = workbenchPage.getNotebookRow(editedTestNamespace);
      notebookEditedRow.findNotebookDescription(editedTestDescription);
      notebookEditedRow.shouldHaveNotebookImageName('code-server');
      notebookEditedRow.shouldHaveContainerSize('Small');
    },
  );
});
