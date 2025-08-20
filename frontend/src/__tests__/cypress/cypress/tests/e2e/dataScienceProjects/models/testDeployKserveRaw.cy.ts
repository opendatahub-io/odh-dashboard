import {
  inferenceServiceModal,
  modelServingGlobal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('Verify a user can deploy KServe Raw Deployment Model', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testDeployKserveRaw.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelFilePath = testData.modelOpenVinoPath;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);

        // Provision project with data connection for model serving
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });

  after(() => {
    cy.log(`Cleaning up project: ${projectName}`);
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify model deployment with Standard deployment mode (KServe Raw)',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@Modelserving', '@NonConcurrent', '@Maintain'],
    },
    () => {
      cy.step(`Log into the application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      // Navigate to Model Serving section and Deploy a Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();
      inferenceServiceModal.shouldBeOpen();
      cy.step('Launch a Single Serving Model and configure deployment mode');
      inferenceServiceModal.findModelNameInput().type(modelName);
      inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
      inferenceServiceModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
      inferenceServiceModal.findModelFrameworkSelect().click();
      inferenceServiceModal.findOpenVinoIROpSet13().click();
      // Select Standard Deployment mode (KServe Raw)
      cy.step(
        'Verify deployment mode dropdown exists and Select Standard Deployment mode (KServe Raw)',
      );
      inferenceServiceModal.findDeploymentModeSelect().click();
      inferenceServiceModal.findStandardDeploymentModeSelect().click();
      inferenceServiceModal.findDeploymentModeSelect().click();
      inferenceServiceModal
        .findStandardDeploymentModeSelect()
        .find('button')
        .should('have.attr', 'aria-selected', 'true');

      inferenceServiceModal
        .findAdvancedDeploymentModeSelect()
        .find('button')
        .should('have.attr', 'aria-selected', 'false');
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      cy.step('Deploy the model');
      inferenceServiceModal.findSubmitButton().click();
      inferenceServiceModal.shouldBeOpen(false);
      modelServingSection.findModelServerDeployedName(modelName);

      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      // For KServe Raw deployments, we only need to check Ready condition
      // LatestDeploymentReady is specific to Serverless deployments
      // Validate DeploymentMode parameter in inferenceService is RawDeployment
      checkInferenceServiceState(
        modelName,
        projectName,
        {
          checkReady: true,
        },
        'RawDeployment',
      );
    },
  );
});
