import yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { notebookServer } from '#~/__tests__/cypress/cypress/pages/notebookServer';
import type { NotebookTolerationsTestData } from '#~/__tests__/cypress/cypress/types';
import {
  waitForPodReady,
  deleteNotebook,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import {
  retryableBefore,
  wasSetupPerformed,
} from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';
import { checkNotebookTolerations } from '#~/__tests__/cypress/cypress/utils/oc_commands/notebooks';

describe('Notebooks - tolerations tests', () => {
  let testData: NotebookTolerationsTestData;

  retryableBefore(() => {
    return cy
      .fixture('e2e/hardwareProfiles/testNotebookTolerations.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as NotebookTolerationsTestData;

        // Load Hardware Profile
        cy.log(`Loaded Hardware Profile Name: ${testData.hardwareProfileName}`);
        // Cleanup Hardware Profile if it already exists
        createCleanHardwareProfile(testData.resourceYamlPath);
      });
  });

  // Cleanup: Delete Hardware Profile and the associated Project
  after(() => {
    // Check if the Before Method was executed to perform the setup
    if (!wasSetupPerformed()) return;

    // Check if a notebook is running and delete if it is
    deleteNotebook('jupyter-nb');

    // Call cleanupHardwareProfiles here, after hardwareProfileResourceName is set
    cleanupHardwareProfiles(testData.hardwareProfileName);
  });

  it(
    'Verify Juypter Notebook Creation using Hardware Profiles and applying Tolerations',
    // TODO: Add the below tags once this feature is enabled in 2.20+
    //  { tags: ['@Sanity', '@SanitySet2', '@Dashboard'] },
    {
      tags: ['@Featureflagged', '@HardwareProfileNotebook', '@HardwareProfiles', '@NonConcurrent'],
    },
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

      // Select the versions dropdown
      cy.step('Select the code server versions dropdown');
      notebookServer.findVersionsDropdown(testData.codeserverImageName).click();

      // Select an image version
      cy.step('Select the codeserver image version');
      notebookServer.findNotebookVersion(testData.codeserverImageName).click();

      // Select an Hardware Profile
      cy.step('Select the hardware profile');
      notebookServer.selectPotentiallyDisabledProfile(
        testData.hardwareProfileDeploymentSize,
        testData.hardwareProfileName,
      );

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

      // Validate that the toleration applied earlier displays in the newly created pod
      cy.step('Validate the Tolerations for the pod include the newly added toleration');
      checkNotebookTolerations('jupyter-nb', {
        key: 'test-taint',
        operator: 'Equal',
        effect: testData.tolerationValue,
      });

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
