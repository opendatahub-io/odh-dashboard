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
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
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

const updateSecretDetailsFile = (
  secretValue: string,
  fixtureRelativePath: string,
  fixtureFullPath: string,
) => {
  return cy.fixture(fixtureRelativePath).then((templateContent) => {
    const updatedContent = {
      ...templateContent,
      auths: {
        'quay.io': {
          auth: secretValue,
        },
      },
    };
    return cy.writeFile(fixtureFullPath, updatedContent);
  });
};

describe(
  'A user can create an OCI connection and deploy a model with it',
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
          // Load fixture file and update with actual secret value
          const secretValue = Cypress.env('OCI_SECRET_VALUE');
          const secretDetailsFixture = 'resources/json/oci-data-connection-secret.json';
          secretDetailsFile = `cypress/fixtures/${secretDetailsFixture}`;
          updateSecretDetailsFile(secretValue, secretDetailsFixture, secretDetailsFile);
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
        tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing', '@NonConcurrent'],
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
        addConnectionModal.findConnectionNameInput().clear().type(connectionName);
        addConnectionModal.findConnectionDescriptionInput().clear().type('OCI Connection');
        addConnectionModal.findOciAccessType().click();
        addConnectionModal.findOciPullSecretOption().click();
        addConnectionModal.findOciAccessType().click();
        addConnectionModal.uploadSecretDetails(secretDetailsFile);
        addConnectionModal.findOciRegistryHost().clear().type(ociRegistryHost);
        addConnectionModal.findCreateButton().click();

        cy.step('Deploy OCI Connection with KServe');
        projectDetails.findSectionTab('model-server').click();
        // If we have only one serving model platform, then it is selected by default.
        // So we don't need to click the button.
        modelServingGlobal.selectSingleServingModelButtonIfExists();
        modelServingGlobal.findDeployModelButton().click();
        // Step 1: Model Source
        modelServingWizard.findModelLocationSelectOption('Existing connection').click();
        modelServingWizard.findOCIModelURI().clear().type(modelDeploymentURI);
        modelServingWizard.findModelTypeSelectOption('Predictive model').click();
        modelServingWizard.findNextButton().click();
        // Step 2: Model Deployment
        modelServingWizard.findModelDeploymentNameInput().clear().type(modelDeploymentName);
        modelServingWizard.findModelFormatSelectOption('openvino_ir - opset13').click();
        // Only interact with serving runtime template selector if it's not disabled
        // (it may be disabled when only one option is available)
        modelServingWizard.findServingRuntimeTemplateSearchSelector().then(($selector) => {
          if (!$selector.is(':disabled')) {
            cy.wrap($selector).click();
            modelServingWizard
              .findGlobalScopedTemplateOption('OpenVINO Model Server')
              .should('exist')
              .click();
          }
        });
        modelServingWizard.findNextButton().click();
        // Step 3: Advanced Options
        modelServingWizard.findNextButton().click();
        // Step 4: Review
        modelServingWizard.findSubmitButton().click();
        modelServingSection.findModelServerDeployedName(modelDeploymentName);
        //Verify the model created and is running
        cy.step('Verify that the Model is running');
        // Verify model deployment is ready
        checkInferenceServiceState(modelDeploymentName, projectName, { checkReady: true });
        modelServingSection.findModelMetricsLink(modelDeploymentName);
      },
    );
  },
);
