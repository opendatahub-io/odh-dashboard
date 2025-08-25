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
  verifyDefaultTimeRange,
  verifyDefaultRefreshInterval,
  verifyAllChartsAvailable,
} from '#~/__tests__/cypress/cypress/utils/modelMetricsUtil';
import { checkMetricsDashboardConfigMap } from '#~/__tests__/cypress/cypress/utils/oc_commands/configmap';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  modelMetricsPerformance,
  modelMetricsGlobal,
} from '#~/__tests__/cypress/cypress/pages/modelMetrics';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe(
  'Verify user can deploy a model and access model metrics from UI',
  { testIsolation: false },
  () => {
    retryableBefore(() => {
      cy.log('Loading test data');
      return loadDSPFixture('e2e/dataScienceProjects/testModelMetricsAccess.yaml').then(
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
      'Verify user can deploy a model and access model metrics from backend and through UI',
      {
        tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelMetrics', '@NonConcurrent'],
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
        inferenceServiceModal.findModelNameInput().type(modelName);
        inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
        inferenceServiceModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
        inferenceServiceModal.findModelFrameworkSelect().click();
        inferenceServiceModal.findOpenVinoIROpSet13().click();
        inferenceServiceModal.findLocationPathInput().type(modelFilePath);
        cy.step('Deploy the model');
        inferenceServiceModal.findSubmitButton().click();
        inferenceServiceModal.shouldBeOpen(false);
        modelServingSection.findModelServerDeployedName(modelName);

        cy.step('Verify that the Model is running');
        checkInferenceServiceState(modelName, projectName);

        cy.step('Wait for metrics dashboard ConfigMap to be created (backend validation)');
        checkMetricsDashboardConfigMap(modelName, projectName);

        cy.step('Verify the model metrics default Home page contents exists ');
        // Note reload is required as status tooltip was not found due to a stale element
        cy.reload();
        modelServingSection.findModelMetricsLink(modelName).should('exist');
        modelServingSection.findModelMetricsLink(modelName).click();
        cy.contains(`${modelName} metrics`).should('be.visible');
        modelMetricsPerformance.findTab().should('be.visible');
        verifyDefaultTimeRange(testData.modelMetricsConfig.defaultTimeRange);
        verifyDefaultRefreshInterval(testData.modelMetricsConfig.defaultRefreshInterval);
      },
    );

    it(
      'Verify Model Metrics Endpoint Performance Tab Contents and Chart Sections',
      {
        tags: ['@Sanity', '@SanitySet3', '@Dashboard', '@ModelMetrics', '@NonConcurrent'],
      },
      () => {
        cy.step('Login to the Application');
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step(`Navigate to Endpoint Performance Tab for ${modelName}`);
        modelMetricsPerformance.visit(projectName, modelName);
        cy.step(`Verify all charts are available for ${modelName}`);
        verifyAllChartsAvailable();
        modelMetricsGlobal
          .getMetricsChart('Requests per 5 minutes')
          .find()
          .should('contain.text', 'Requests per 5 minutes');

        modelMetricsGlobal
          .getMetricsChart('Average response time (ms)')
          .find()
          .should('contain.text', 'Average response time (ms)');

        modelMetricsGlobal
          .getMetricsChart('CPU utilization %')
          .find()
          .should('contain.text', 'CPU utilization %');

        modelMetricsGlobal
          .getMetricsChart('Memory utilization %')
          .find()
          .should('contain.text', 'Memory utilization %');
      },
    );
  },
);
