import yaml from 'js-yaml';
import type { WBNegativeTestsData } from '~/__tests__/cypress/cypress/types';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import {
  workbenchPage,
  createSpawnerPage,
  workbenchStatusModal,
} from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBeforeEach } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Workbenches - negative tests', () => {
  let testData: WBNegativeTestsData;
  let projectName: string;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBeforeEach(() => {
    return cy
      .fixture('e2e/dataScienceProjects/testWorkbenchNegativeTests.yaml', 'utf8')
      .then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as WBNegativeTestsData;
        projectName = `${testData.wbNegativeTestNamespace}-${uuid}`;

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

      // Confirm that the Workbench does not start and is at Failed status
      cy.step(`Wait for workbench ${workbenchName} to display a "Failed" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.expectStatusLabelToBe('Failed', 120000);
      cy.step(`Open the Modal and confirm the status is Failed`);
      notebookRow.findHaveNotebookStatusText().click();
      workbenchStatusModal.getNotebookStatus('Failed');
    },
  );
  it(
    'Verify User cannot create a workbench using special characters or long names in the Resource name field',
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
      createSpawnerPage.getEditResourceLink().click();

      // Test each invalid resource name
      cy.step('Test invalid resource name and verify that project creation is prevented');

      testData.invalidResourceNames.forEach((invalidResourceName) => {
        cy.log(`Testing invalid resource name: ${invalidResourceName}`);

        // Clear input, type invalid resource name, and validate behavior
        createSpawnerPage.getResourceInput().clear().type(invalidResourceName);
        createSpawnerPage.getResourceInput().should('have.attr', 'aria-invalid', 'true');
        createSpawnerPage.findSubmitButton().should('be.disabled');
        // Log success message for invalid resources names being rejected
        cy.log(`✅ ${invalidResourceName}: not authorised as a Resource Name`);
      });
    },
  );
});
