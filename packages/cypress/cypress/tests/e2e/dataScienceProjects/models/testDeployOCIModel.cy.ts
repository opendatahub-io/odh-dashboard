import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/model-serving/types/form-data';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanProject } from '../../../../utils/projectChecker';
import { addConnectionModal, connectionsPage } from '../../../../pages/connections';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
} from '../../../../pages/modelServing';
import {
  checkInferenceServiceState,
  modelExternalTester,
  verifyModelExternalToken,
} from '../../../../utils/oc_commands/modelServing';
import type { DeployOCIModelData } from '../../../../types';
import { loadDeployOCIModelFixture } from '../../../../utils/dataLoader';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

let projectName: string;
let resourceName: string;
let connectionName: string;
let secretDetailsFile: string;
let ociRegistryHost: string;
let modelDeploymentURI: string;
let modelDeploymentName: string;
let modelFormat: string;
let servingRuntime: string;
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
          modelFormat = testData.modelFormat;
          servingRuntime = testData.servingRuntime;
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
      'Verify User Can Create an OCI Connection, Deploy Model with Token Auth, and Verify Token Access',
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

        cy.step('Step 1: Model details');
        modelServingWizard
          .findModelLocationSelectOption(ModelLocationSelectOption.EXISTING)
          .click();
        modelServingWizard.findOCIModelURI().clear().type(modelDeploymentURI);
        modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.PREDICTIVE).click();
        modelServingWizard.findNextButton().click();

        cy.step('Step 2: Model deployment');
        modelServingWizard.findModelDeploymentNameInput().clear().type(modelDeploymentName);
        modelServingWizard.findResourceNameButton().click();
        modelServingWizard
          .findResourceNameInput()
          .should('be.visible')
          .invoke('val')
          .then((val) => {
            resourceName = val as string;
          });
        modelServingWizard.findModelFormatSelectOption(modelFormat).click();
        modelServingWizard.selectServingRuntimeOption(servingRuntime);
        modelServingWizard.findNextButton().click();

        cy.step('Step 3: Advanced settings');
        // Enable Model access through an external route with token authentication
        modelServingWizard.findExternalRouteCheckbox().click();
        modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
        modelServingWizard.findServiceAccountByIndex(0).clear().type('oci-token-1');
        modelServingWizard.findAddServiceAccountButton().click();
        modelServingWizard.findServiceAccountByIndex(1).clear().type('oci-token-2');
        modelServingWizard.findNextButton().click();

        cy.step('Step 4: Review');
        modelServingWizard.findSubmitButton().click();
        modelServingSection.findModelServerDeployedName(modelDeploymentName);

        cy.step('Verify that the Model is running');
        checkInferenceServiceState(resourceName, projectName, { checkReady: true });
        modelServingSection.findModelMetricsLink(modelDeploymentName);

        // Token Authentication Verification
        cy.step('Verify the model is not accessible without a token');
        modelExternalTester(modelDeploymentName, projectName).then(({ response }) => {
          expect(response.status).to.equal(401);
        });

        cy.step('Get the tokens from the UI');
        const kserveRow = modelServingSection.getKServeRow(modelDeploymentName);
        kserveRow.findToggleButton().click();

        cy.window().then((win) => {
          const copied: string[] = [];
          cy.wrap(copied).as('copiedTokens');

          cy.stub(win.navigator.clipboard, 'writeText').callsFake((text: string) => {
            copied.push(text);
            return Promise.resolve();
          });
        });

        // Click the two copy buttons
        modelServingGlobal.findTokenCopyButton(0).click();
        modelServingGlobal.findTokenCopyButton(1).click();

        // Use the copied tokens
        cy.step('Verify the model is accessible with valid tokens');
        cy.get<string[]>('@copiedTokens')
          .should('have.length.at.least', 2)
          .then((tokens) => {
            const [token1, token2] = tokens;
            verifyModelExternalToken(modelDeploymentName, projectName, token1).then(
              ({ response }) => expect(response.status).to.equal(200),
            );
            verifyModelExternalToken(modelDeploymentName, projectName, token2).then(
              ({ response }) => expect(response.status).to.equal(200),
            );
          });

        // Remove the token authentication
        cy.step('Disable token authentication');
        modelServingSection
          .getKServeRow(modelDeploymentName)
          .find()
          .findKebabAction('Edit')
          .click();
        // Navigate through wizard steps
        modelServingWizardEdit.findNextButton().click(); // Step 1: Model details
        modelServingWizardEdit.findNextButton().click(); // Step 2: Model deployment

        // Step 3: Advanced Options - verify service accounts and disable token auth
        modelServingWizardEdit.findServiceAccountByIndex(0).should('have.value', 'oci-token-1');
        modelServingWizardEdit.findServiceAccountByIndex(1).should('have.value', 'oci-token-2');
        modelServingWizardEdit.findTokenAuthenticationCheckbox().click();
        modelServingWizardEdit.findTokenAuthenticationCheckbox().should('not.be.checked');
        modelServingWizardEdit.findNextButton().click();

        // Submit the changes
        modelServingWizardEdit.findSubmitButton().click();
        modelServingSection.findModelServerDeployedName(modelDeploymentName);

        cy.step('Verify that the Model is running');
        checkInferenceServiceState(resourceName, projectName, { checkReady: true });

        // Verify the model is accessible without a token after disabling auth
        cy.step('Verify the model is accessible without a token after disabling auth');
        verifyModelExternalToken(modelDeploymentName, projectName).then(({ response }) => {
          expect(response.status).to.equal(200);
        });
      },
    );
  },
);
