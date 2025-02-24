import type { WBNegativeTestsData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBNegativeTestsFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import {
  retryableBefore,
  wasSetupPerformed,
} from '~/__tests__/cypress/cypress/utils/retryableHooks';

describe('Workbenches - negative tests', () => {
  let projectName: string;

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadWBNegativeTestsFixture('e2e/dataScienceProjects/testWorkbenchNegativeTests.yaml')
      .then((fixtureData: WBNegativeTestsData) => {
        projectName = fixtureData.wbNegativeTestNamespace;

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

  after(() => {
    //Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) return;

    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it(
    'Verify UI informs users about workbenches failed to start',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1973', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = projectName.replace('dsp-', '');

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbenches
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench
      cy.step(`Create workbench ${workbenchName}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findContainerSizeInput('Small').click();
      cy.contains('X Large').click();

      createSpawnerPage.findSubmitButton().click();

      // Confirm that the Workbench does not start
      cy.step(`Wait for workbench ${workbenchName} to display a "Failed" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe('Failed', 120000);

      notebookRow.findHaveNotebookStatusText().click();
      workbenchStatusModal.getNotebookStatus('Failed');
    },
  );
});
