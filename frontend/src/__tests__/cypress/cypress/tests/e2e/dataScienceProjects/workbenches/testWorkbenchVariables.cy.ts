import type { WBVariablesTestData } from '~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import { workbenchPage, createSpawnerPage } from '~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBVariablesFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { validateWorkbenchEnvironmentVariables } from '~/__tests__/cypress/cypress/utils/oc_commands/workbench';

describe('Workbenches - variable tests', () => {
  let projectName: string;
  let projectDescription: string;
  let testData: WBVariablesTestData;

  // Setup: Load test data and ensure clean state
  before(() => {
    return loadWBVariablesFixture('e2e/dataScienceProjects/testWorkbenchVariables.yaml')
      .then((fixtureData: WBVariablesTestData) => {
        testData = fixtureData;
        projectName = fixtureData.wbVariablesTestNamespace;
        projectDescription = fixtureData.wbVariablesTestDescription;

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
    'Verify user can set environment varibles in their workbenches by uploading a yaml Secret and Config Map file.',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-1883', '@Dashboard'] },
    () => {
      const workbenchName = projectName.replace('dsp-', '');
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbences
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

      // Add Secret environment variable
      createSpawnerPage.findAddVariableButton().click();
      const secretEnvVarField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      secretEnvVarField.selectEnvironmentVariableType('Secret');
      secretEnvVarField.selectEnvDataType('Upload');
      secretEnvVarField.uploadConfigYaml(testData.secretYamlPath);

      // Submit the workbench creation
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(
        `Wait for workbench ${workbenchName} to display a "Running" status`,
      );
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.findNotebookDescription(testData.wbVariablesTestDescription);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

      const variablesToCheck = {
        FAKE_ID: testData.FAKE_ID,
        FAKE_VALUE: testData.FAKE_VALUE,
      };
      validateWorkbenchEnvironmentVariables(projectName, workbenchName, variablesToCheck);
    },
  );
});
