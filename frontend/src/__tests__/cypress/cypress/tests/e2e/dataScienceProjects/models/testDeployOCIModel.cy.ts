import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import {
  addConnectionModal,
  connectionsPage,
} from '#~/__tests__/cypress/cypress/pages/connections';
import {
  inferenceServiceModal,
  modelServingGlobal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { checkInferenceServiceState } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import type { DeployOCIModelData } from '#~/__tests__/cypress/cypress/types';
import { loadDeployOCIModelFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

let projectName: string;
let connectionName: string;
let secretDetailsFile: string;
let ociRegistryHost: string;
let modelDeploymentURI: string;
let modelDeploymentName: string;
const uuid = generateTestUUID();

describe(
  '[Product Bug: RHOAIENG-32763] A user can create an OCI connection and deploy a model with it',
  { testIsolation: false },
  () => {
    let testData: DeployOCIModelData;

    retryableBefore(() => {
      cy.log('Loading test data');
      return loadDeployOCIModelFixture('e2e/dataScienceProjects/testDeployOCIModel.yaml').then(
        (fixtureData: DeployOCIModelData) => {
          testData = fixtureData;
          projectName = `${testData.projectName}-${uuid}`;
          connectionName = testData.connectionName;
          secretDetailsFile = Cypress.env('OCI_SECRET_DETAILS_FILE');
          ociRegistryHost = testData.ociRegistryHost;
          modelDeploymentURI = Cypress.env('OCI_MODEL_URI');
          modelDeploymentName = testData.modelDeploymentName;

          cy.log(`Loaded project name: ${projectName}`);
          createCleanProject(projectName);
        },
      );
    });

    after(() => {
      // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
      // TODO: Review this timeout once RHOAIENG-19969 is resolved
      deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
    });

    it(
      'Verify User Can Create an OCI Connection in DS Connections Page And Deploy the Model',
      {
        tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@Modelserving', '@NonConcurrent', '@Bug'],
      },
      () => {
        cy.step(`Navigate to DS Project ${projectName}`);
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        projectListPage.navigate();
        projectListPage.filterProjectByName(projectName);
        projectListPage.findProjectLink(projectName).click();

        cy.step('Create an OCI Connection');
        projectDetails.findSectionTab('connections').click();
        connectionsPage.findCreateConnectionButton().click();
        addConnectionModal.findConnectionTypeDropdown().click();
        addConnectionModal.findOciConnectionType().click();
        addConnectionModal.findConnectionNameInput().type(connectionName);
        addConnectionModal.findConnectionDescriptionInput().type('OCI Connection');
        addConnectionModal.findOciAccessType().click();
        addConnectionModal.findOciPullSecretOption().click();
        addConnectionModal.findOciAccessType().click();
        addConnectionModal.uploadSecretDetails(secretDetailsFile);
        addConnectionModal.findOciRegistryHost().type(ociRegistryHost);
        addConnectionModal.findCreateButton().click();

        cy.step('Deploy OCI Connection with KServe');
        projectDetails.findSectionTab('model-server').click();
        modelServingGlobal.findSingleServingModelButton().click();
        modelServingGlobal.findDeployModelButton().click();
        inferenceServiceModal.findModelNameInput().type(modelDeploymentName);
        inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
        inferenceServiceModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
        inferenceServiceModal.findModelFrameworkSelect().click();
        inferenceServiceModal.findOpenVinoOnnx().click();
        inferenceServiceModal.findOCIModelURI().type(modelDeploymentURI);
        inferenceServiceModal.findSubmitButton().focus().click();
        checkInferenceServiceState(modelDeploymentName, projectName);
        // Note reload is required as status tooltip was not found due to a stale element
        cy.reload();
        modelServingSection.findModelMetricsLink(modelDeploymentName);
        modelServingSection.findStatusTooltip().click({ force: true });
        cy.contains('Model deployment is active.', { timeout: 120000 }).should('be.visible');
      },
    );
  },
);
