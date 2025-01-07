import type { WBEditTestData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadPVCEditFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';

describe('Verify Workbenches - Editing Workbench Name and Description', () => {
  let editTestNamespace: string;
  let editedTestNamespace: string;
  let editedTestDescription: string;
  let pvcEditName: string;
  let pvcEditDisplayName: string;
  let pvcEditSize: string;

  before(() => {
    return loadPVCEditFixture('e2e/dataScienceProjects/testWorkbenchEditing.yaml')
      .then((fixtureData: WBEditTestData) => {
        editTestNamespace = fixtureData.editTestNamespace;
        editedTestNamespace = fixtureData.editedTestNamespace;
        editedTestDescription = fixtureData.editedTestDescription;
        pvcEditName = fixtureData.pvcEditName;
        pvcEditDisplayName = fixtureData.pvcEditDisplayName;
        pvcEditSize = fixtureData.pvcEditSize;

        if (!editTestNamespace) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${editTestNamespace}`);
        return createCleanProject(editTestNamespace);
      })
  });

  // after(() => {
  //   // Delete provisioned Project
  //   if (editTestNamespace) {
  //     cy.log(`Deleting Project ${editTestNamespace} after the test has finished.`);
  //     deleteOpenShiftProject(editTestNamespace);
  //   }
  // });

  it(
    'Edit and Update a Workbench in RHOAI',
    { tags: ['@Sanity', '@SanitySet1', '@ODS-1931', '@Dashboard', '@Tier1'] },
    () => {
      const workbenchName = editTestNamespace.replace('dsp-', '');

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to workbenches tab of Project ${editTestNamespace}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(editTestNamespace);
      projectListPage.findProjectLink(editTestNamespace).click();
      projectDetails.findSectionTab('workbenches').click();

      cy.step(`Create workbench ${editTestNamespace} using storage ${pvcEditDisplayName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findSubmitButton().click();

      cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

      cy.step('Editing the workbench - both the Name and Description');
      notebookRow.findKebab().click();
      notebookRow.findKebabAction('Edit workbench').click();
    },
  );
});
