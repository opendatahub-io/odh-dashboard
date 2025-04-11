import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage } from '~/__tests__/cypress/cypress/pages/projects';
import {
  retryableBefore,
  wasSetupPerformed,
} from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';
import { addConnectionModal, connectionsPage } from '~/__tests__/cypress/cypress/pages/connections';
import {
  inferenceServiceModal,
  modelServingGlobal,
  modelServingSection,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import { checkInferenceServiceState } from '~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import type { DeployOCIModelData } from '~/__tests__/cypress/cypress/types';
import { loadDeployOCIModelFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';

let projectName: string;
let connectionName: string;
let secretDetailsFile: string;
let ociRegistryHost: string;
let modelDeploymentURI: string;
let modelDeploymentName: string;

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
          projectName = testData.projectName;
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
      //Check if the Before Method was executed to perform the setup
      if (!wasSetupPerformed()) return;

      // Delete provisioned Project - 5 min timeout to accomadate increased time to delete a project with a model
      deleteOpenShiftProject(projectName, { timeout: 300000 });
    });

    it(
      'Verify User Can Create an OCI Connection in DS Connections Page And Deploy the Model',
      { tags: ['@Smoke', '@Dashboard', '@Modelserving'] },
      () => {
        cy.step(`Navigate to DS Project ${projectName}`);
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
        projectListPage.navigate();
        projectListPage.filterProjectByName(projectName);
        projectListPage.findProjectLink(projectName).click();

        cy.step('Create an OCI Connection');
        // TODO: Revert the cy.visit(...) method once RHOAIENG-21039 is resolved
        // Reapply projectDetails.findSectionTab('connections').click();
        cy.visit(`projects/${projectName}?section=connections`);
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
        // TODO: Revert the cy.visit(...) method once RHOAIENG-21039 is resolved
        // Reapply projectDetails.findSectionTab('model-server').click();
        cy.visit(`projects/${projectName}?section=model-server`);
        modelServingGlobal.findSingleServingModelButton().click();
        modelServingGlobal.findDeployModelButton().click();
        inferenceServiceModal.findModelNameInput().type(modelDeploymentName);
        inferenceServiceModal.findServingRuntimeTemplate().click();
        inferenceServiceModal.findOpenVinoServingRuntime().click();
        inferenceServiceModal.findModelFrameworkSelect().click();
        inferenceServiceModal.findOpenVinoOnnx().click();
        inferenceServiceModal.findOCIModelURI().type(modelDeploymentURI);
        inferenceServiceModal.findSubmitButton().focus().click();
        checkInferenceServiceState(modelDeploymentName);
        modelServingSection.findModelServerName(modelDeploymentName);
        // Note reload is required as status tooltip was not found due to a stale element
        cy.reload();
        modelServingSection.findStatusTooltip().click({ force: true });
        cy.contains('Loaded', { timeout: 120000 }).should('be.visible');
      },
    );
  },
);
