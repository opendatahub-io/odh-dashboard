import type { WBStatusTestData } from '#~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBStatusFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  selectNotebookImageWithBackendFallback,
  getImageStreamDisplayName,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';

describe('Workbenches - status tests', () => {
  let projectName: string;
  let projectDescription: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() => {
    return loadWBStatusFixture('e2e/dataScienceProjects/testWorkbenchStatus.yaml')
      .then((fixtureData: WBStatusTestData) => {
        projectName = `${fixtureData.wbStatusTestNamespace}-${uuid}`;
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
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Verify user can access progress and event log - validate status and successful workbench creation',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1970', '@Dashboard', '@Workbenches'] },
    () => {
      const workbenchName = projectName.replace('dsp-', '');
      let selectedImageStream: string;

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

      // Select notebook image with fallback
      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(
        (imageStreamName) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);

          createSpawnerPage.findSubmitButton().click();

          // Wait for workbench to run
          cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);
          notebookRow.findNotebookDescription(projectDescription);
          notebookRow.expectStatusLabelToBe('Running', 120000);

          // Use dynamic image name verification based on what was actually selected
          getImageStreamDisplayName(selectedImageStream).then((displayName) => {
            notebookRow.shouldHaveNotebookImageName(displayName);
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
            cy.step('Navigate to Events Tab and verify successful event messages are displayed');
            workbenchStatusModal.findEventlogTab().click();
            workbenchStatusModal.findLogEntry('Created container');
            workbenchStatusModal.findLogEntry('Started container');
            workbenchStatusModal.findLogEntry('Successfully pulled image');
          });
        },
      );
    },
  );
});
