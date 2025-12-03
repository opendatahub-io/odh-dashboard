import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectListPage } from '../../../pages/projects';
import { notebookServer } from '../../../pages/notebookServer';
import { waitForPodReady, deleteNotebook } from '../../../utils/oc_commands/baseCommands';
import { retryableBefore } from '../../../utils/retryableHooks';

describe('Verify a Jupyter Notebook can be launched directly from the Project List View', () => {
  retryableBefore(() => {
    deleteNotebook('jupyter-nb');
  });

  it(
    'Verify User Can Access Jupyter Launcher From Project Page',
    { tags: ['@Smoke', '@SmokeSet1', '@ODS-1877', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      projectListPage.navigate();

      // Verify Launch standalone server is available
      cy.step('Launch Standalone notebook server');
      projectListPage.findLaunchStandaloneWorkbenchButton().click();

      // Select a notebook image
      cy.step('Choose Code Server Image');
      notebookServer.findNotebookImage('code-server-notebook').click();

      // Verify that 'Start Server button' is enabled
      cy.step('Check Start server button is enabled');
      notebookServer.findStartServerButton().should('not.be.disabled');

      // Start a server
      cy.step('Launch a notebook server');
      notebookServer.findStartServerButton().click();

      // Verify that the server is running
      cy.step('Verify the Jupyter Notebook pod is ready');
      waitForPodReady('jupyter-nb', '300s');

      // Expand  the log
      cy.step('Expand the Event log');
      notebookServer.findEventlog().should('be.visible').click();

      // Wait for the success alert
      cy.step('Waits for the Success alert');
      notebookServer.findSuccessAlert().should('exist');

      // Open the server in a new tab
      cy.step('Opens the server in a new tab');
      notebookServer.findOpenInNewTabButton().click();

      // Stop the server
      cy.step('Stop the server');
      notebookServer.findStopServerButton().click();

      // Stop the server confirmation
      cy.step('Confirm stopping the server');
      notebookServer.findStopNotebookServerButton().click();
    },
  );
});
