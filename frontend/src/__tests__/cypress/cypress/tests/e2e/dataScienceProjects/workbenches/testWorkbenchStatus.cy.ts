import type { WBStatusTestData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBStatusFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';

describe('Workbenches - status tests', () => {
  let projectName: string;
  let projectDescription: string;

  // Setup: Load test data and ensure clean state
  before(() => {
    return loadWBStatusFixture('e2e/dataScienceProjects/testWorkbenchStatus.yaml')
      .then((fixtureData: WBStatusTestData) => {
        projectName = fixtureData.wbStatusTestNamespace;
        projectDescription = fixtureData.wbStatusTestDescription;

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
    // Delete provisioned Project
    if (projectName) {
      cy.log(`Deleting Project ${projectName} after the test has finished.`);
      deleteOpenShiftProject(projectName);
    }
  });

  it(
    'Verify user can access progress and event log - validate status and successful workbench creation',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1970', '@Dashboard'] },
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
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.findNotebookDescription(projectDescription);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

      // Click on 'Running' status and validate the Progress steps
      cy.step(
        'Click on Running status, validate the Running status and navigate to the Progress tab',
      );
      notebookRow.findHaveNotebookStatusText().click();
      workbenchStatusModal.getNotebookStatus('Running');

      cy.step('Verify that each Progress Step in the list displays with a Success icon');
      workbenchStatusModal.findProgressTab().click();
      workbenchStatusModal.findProgressSteps().each(($step) => {
        workbenchStatusModal.assertStepSuccess($step).then(() => {
          workbenchStatusModal.getStepTitle($step).then((stepTitle) => {
            cy.log(`✅ Step "${stepTitle}" is successful`);
          });
        });
      });

      // Click on the Events log and validate that successful list messages display
      cy.step('Verify that each Events log in the list displays with a Successful Message');
      workbenchStatusModal.findEventlogTab().click();
      workbenchStatusModal.findLogEntry('Created container oauth-proxy');
      workbenchStatusModal.findLogEntry('Started container oauth-proxy');
      workbenchStatusModal.findLogEntry('Successfully pulled image');
    },
  );
});
