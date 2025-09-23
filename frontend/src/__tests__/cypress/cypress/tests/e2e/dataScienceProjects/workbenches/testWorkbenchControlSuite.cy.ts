import type { WBControlSuiteTestData } from '#~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  notebookConfirmModal,
  notebookDeleteModal,
  workbenchStatusModal,
} from '#~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBControlSuiteFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  selectNotebookImageWithBackendFallback,
  getImageStreamDisplayName,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/imageStreams';

describe('[Product Bug: RHAIENG-1158] Start, Stop, Launch and Delete a Workbench in RHOAI', () => {
  let controlSuiteTestNamespace: string;
  let controlSuiteTestDescription: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBefore(() =>
    loadWBControlSuiteFixture('e2e/dataScienceProjects/testWorkbenchControlSuite.yaml')
      .then((fixtureData: WBControlSuiteTestData) => {
        controlSuiteTestNamespace = `${fixtureData.controlSuiteTestNamespace}-${uuid}`;
        controlSuiteTestDescription = fixtureData.controlSuiteTestDescription;

        if (!controlSuiteTestNamespace) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${controlSuiteTestNamespace}`);
        return createCleanProject(controlSuiteTestNamespace);
      })
      .then(() => {
        cy.log(
          `Project ${controlSuiteTestNamespace} confirmed to be created and verified successfully`,
        );
      }),
  );

  after(() => {
    // Delete provisioned Project
    if (controlSuiteTestNamespace) {
      cy.log(`Deleting Project ${controlSuiteTestNamespace} after the test has finished.`);
      deleteOpenShiftProject(controlSuiteTestNamespace, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Starting, Stopping, Launching and Deleting a Workbench',
    {
      tags: [
        '@Sanity',
        '@SanitySet2',
        '@ODS-1818',
        '@ODS-1823',
        '@ODS-1975',
        '@Dashboard',
        '@Workbenches',
        '@Bug',
      ],
    },
    () => {
      const workbenchName = controlSuiteTestNamespace.replace('dsp-', '');
      let selectedImageStream: string;

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${controlSuiteTestNamespace}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(controlSuiteTestNamespace);
      projectListPage.findProjectLink(controlSuiteTestNamespace).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench
      cy.step(`Create workbench ${controlSuiteTestNamespace}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.getDescriptionInput().type(controlSuiteTestDescription);

      // Select notebook image with fallback
      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(
        (imageStreamName) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);

          createSpawnerPage.findSubmitButton().click();

          // Wait for workbench to run
          cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);
          notebookRow.findNotebookDescription(controlSuiteTestDescription);
          notebookRow.expectStatusLabelToBe('Running', 120000);

          // Use the dynamic image name verification based on what was actually selected
          getImageStreamDisplayName(selectedImageStream).then((displayName) => {
            notebookRow.shouldHaveNotebookImageName(displayName);
            notebookRow.shouldHaveContainerSize('Small');

            // Stop workbench
            cy.step('Stop workbench and validate it has been stopped');
            notebookRow.findNotebookStopToggle().click();
            notebookConfirmModal.findStopWorkbenchButton().click();
            notebookRow.expectStatusLabelToBe('Stopped', 120000);

            // Restart workbench and confirm initiation
            cy.step('Restart workbench and validate it starts successfully');
            notebookRow.findNotebookStopToggle().click();
            notebookRow.expectStatusLabelToBe('Running', 120000);

            // Delete workbench
            cy.step('Delete workbench and confirm deleteion');
            notebookRow.findKebab().click();
            notebookRow.findKebabAction('Delete workbench').click();
            notebookDeleteModal.findDeleteModal().click();
            notebookDeleteModal.findDeleteModal().type(workbenchName);
            notebookDeleteModal.findDeleteWorkbenchButton().click();
            workbenchPage.findEmptyState().should('exist');
          });
        },
      );
    },
  );

  it(
    'Verify that a Workbench can be started and stopped using the Event log controls',
    {
      tags: [
        '@Sanity',
        '@SanitySet2',
        '@ODS-1818',
        '@ODS-1823',
        '@ODS-1975',
        '@Dashboard',
        '@Workbenches',
        '@Bug',
      ],
    },
    () => {
      const workbenchName = controlSuiteTestNamespace.replace('dsp-', 'secondwb-');
      let selectedImageStream: string;

      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${controlSuiteTestNamespace}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(controlSuiteTestNamespace);
      projectListPage.findProjectLink(controlSuiteTestNamespace).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench
      cy.step(`Create workbench ${controlSuiteTestNamespace}`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.getDescriptionInput().type(controlSuiteTestDescription);

      // Select notebook image with fallback
      selectNotebookImageWithBackendFallback('code-server-notebook', createSpawnerPage).then(
        (imageStreamName) => {
          selectedImageStream = imageStreamName;
          cy.log(`Selected imagestream: ${selectedImageStream}`);

          createSpawnerPage.findSubmitButton().click();

          // Stop the Workbench and validate it has stopped successfully
          cy.step('Click on Running status and stop the workbench');
          const notebookRow = workbenchPage.getNotebookRow(workbenchName);
          notebookRow.findHaveNotebookStatusText().click();
          workbenchStatusModal.getNotebookStatus('Starting', 120000);
          workbenchStatusModal.findStopWorkbenchFooterButton().click();
          workbenchStatusModal.findStopWorkbenchButton().click();
          workbenchStatusModal.getNotebookStatus('Stopped', 120000);

          // Start the Workbench and validate it has started successfully
          cy.step('Restart the workbench and confirm the workbench has started successfully');
          workbenchStatusModal.findStartWorkbenchFooterButton().click();
          workbenchStatusModal.getNotebookStatus('Running', 120000);
          workbenchStatusModal.findProgressTab().click();
          workbenchStatusModal.findProgressSteps().each(($step) => {
            workbenchStatusModal.assertStepSuccess($step).then(() => {
              workbenchStatusModal.getStepTitle($step).then((stepTitle) => {
                cy.log(`✅ Step "${stepTitle}" is successful`);
              });
            });
          });
        },
      );
    },
  );
});
