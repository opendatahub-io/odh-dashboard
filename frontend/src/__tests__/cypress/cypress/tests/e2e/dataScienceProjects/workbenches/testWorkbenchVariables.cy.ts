import type { WBVariablesTestData } from '#~/__tests__/cypress/cypress/types';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { workbenchPage, createSpawnerPage } from '#~/__tests__/cypress/cypress/pages/workbench';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { loadWBVariablesFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { validateWorkbenchEnvironmentVariables } from '#~/__tests__/cypress/cypress/utils/oc_commands/workbench';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

describe('Workbenches - variable tests', () => {
  let projectName: string;
  let projectDescription: string;
  let testData: WBVariablesTestData;
  const uuid = generateTestUUID();

  // Setup: Load test data and ensure clean state
  retryableBeforeEach(() => {
    return loadWBVariablesFixture('e2e/dataScienceProjects/testWorkbenchVariables.yaml')
      .then((fixtureData: WBVariablesTestData) => {
        testData = fixtureData;
        projectName = `${fixtureData.wbVariablesTestNamespace}-${uuid}`;
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
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });
  it(
    'Verify user can set environment variables in their workbenches by uploading a yaml Secret and Config Map file.',
    {
      tags: ['@Sanity', '@SanitySet3', '@ODS-1883', '@ODS-1864', '@Dashboard', '@Workbenches'],
    },
    () => {
      const workbenchName = projectName;
      const workbenchName2 = projectName.replace('dsp-', 'secondwb-');
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench with Secret variables by uploading a yaml file
      cy.step(`Create workbench ${workbenchName} using secret variables`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findAddVariableButton().click();
      const secretEnvVarField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      secretEnvVarField.selectEnvironmentVariableType('Secret');
      secretEnvVarField.selectEnvDataType('Upload');
      secretEnvVarField.uploadConfigYaml(testData.secretYamlPath);
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.findNotebookDescription(testData.wbVariablesTestDescription);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

      // Validate that the variables are present in the Workbench container
      cy.step(`Validate that the variables are present in the Workbench container `);
      const secretVariables = {
        FAKE_ID: testData.FAKE_ID,
        FAKE_VALUE: testData.FAKE_VALUE,
      };
      validateWorkbenchEnvironmentVariables(projectName, workbenchName, secretVariables);

      // Create a second workbench with Config Map variables by uploading a yaml file
      cy.step(`Create a second workbench ${workbenchName2} using config map variables`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName2);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findAddVariableButton().click();
      const secretEnvVarField2 = createSpawnerPage.getEnvironmentVariableTypeField(0);
      secretEnvVarField2.selectEnvironmentVariableType('Config Map');
      secretEnvVarField2.selectEnvDataType('Upload');
      secretEnvVarField2.uploadConfigYaml(testData.configMapYamlPath);
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${workbenchName2} to display a "Running" status`);
      const notebookRow2 = workbenchPage.getNotebookRow(workbenchName2);
      notebookRow2.findNotebookDescription(testData.wbVariablesTestDescription);
      notebookRow2.expectStatusLabelToBe('Running', 120000);
      notebookRow2.shouldHaveNotebookImageName('code-server');
      notebookRow2.shouldHaveContainerSize('Small');

      // Validate that the variables are present in the Workbench container
      cy.step(`Validate that the variables are present in the Workbench container `);
      const configMapVariables = {
        MY_VAR2: testData.MY_VAR2,
        MY_VAR1: testData.MY_VAR1,
      };
      validateWorkbenchEnvironmentVariables(projectName, workbenchName2, configMapVariables);
    },
  );
  it(
    'Verify that the user can inject environment variables manually into a workbench using Key / Value',
    {
      tags: ['@Sanity', '@SanitySet3', '@ODS-1883', '@ODS-1864', '@Dashboard', '@Workbenches'],
    },
    () => {
      const workbenchName = projectName;
      const workbenchName2 = projectName.replace('dsp-', 'secondwb-');
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation and select workbences
      cy.step(`Navigate to workbenches tab of Project ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('workbenches').click();

      // Create workbench with Secret variables via Key / Value
      cy.step(`Create workbench ${workbenchName} using secret variables`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findAddVariableButton().click();
      const secretEnvVarField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      secretEnvVarField.selectEnvironmentVariableType('Secret');
      secretEnvVarField.selectEnvDataType('Key / value');
      secretEnvVarField.findKeyInput().fill(testData.FAKE_SECRET_KEY);
      secretEnvVarField.findKeyValue().fill(testData.FAKE_SECRET_VALUE);
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${workbenchName} to display a "Running" status`);
      const notebookRow = workbenchPage.getNotebookRow(workbenchName);
      notebookRow.findNotebookDescription(testData.wbVariablesTestDescription);
      notebookRow.expectStatusLabelToBe('Running', 120000);
      notebookRow.shouldHaveNotebookImageName('code-server');
      notebookRow.shouldHaveContainerSize('Small');

      // Validate that the variables are present in the Workbench container
      cy.step(`Validate that the variables are present in the Workbench container`);
      const secretVariables = {
        [testData.FAKE_SECRET_KEY]: testData.FAKE_SECRET_VALUE,
      };
      validateWorkbenchEnvironmentVariables(projectName, workbenchName, secretVariables);

      // Create a second workbench with Config Map variables via Key / Value
      cy.step(`Create a second workbench ${workbenchName2} using config map variables`);
      workbenchPage.findCreateButton().click();
      createSpawnerPage.getNameInput().fill(workbenchName2);
      createSpawnerPage.getDescriptionInput().type(projectDescription);
      createSpawnerPage.findNotebookImage('code-server-notebook').click();
      createSpawnerPage.findAddVariableButton().click();
      const secretEnvVarField2 = createSpawnerPage.getEnvironmentVariableTypeField(0);
      secretEnvVarField2.selectEnvironmentVariableType('Config Map');
      secretEnvVarField2.selectEnvDataType('Key / value');
      secretEnvVarField2.findKeyInput().fill(testData.FAKE_CM_KEY);
      secretEnvVarField2.findKeyValue().fill(testData.FAKE_CM_VALUE);
      createSpawnerPage.findSubmitButton().click();

      // Wait for workbench to run
      cy.step(`Wait for workbench ${workbenchName2} to display a "Running" status`);
      const notebookRow2 = workbenchPage.getNotebookRow(workbenchName2);
      notebookRow2.findNotebookDescription(testData.wbVariablesTestDescription);
      notebookRow2.expectStatusLabelToBe('Running', 120000);
      notebookRow2.shouldHaveNotebookImageName('code-server');
      notebookRow2.shouldHaveContainerSize('Small');

      // Validate that the variables are present in the Workbench container
      cy.step(`Validate that the variables are present in the Workbench container `);
      const configMapVariables = {
        [testData.FAKE_CM_KEY]: testData.FAKE_CM_VALUE,
      };
      validateWorkbenchEnvironmentVariables(projectName, workbenchName2, configMapVariables);
    },
  );
});
