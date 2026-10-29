import { projectListPage, projectDetails } from '../../../../pages/projects';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import {
  modelServingGlobal,
  inferenceServiceActions,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
} from '../../../../pages/modelServing';
import type { DataScienceProjectData } from '../../../../types';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import {
  checkInferenceServiceState,
  patchInferenceServiceStoragePath,
  provisionProjectForModelServing,
  verifyModelExternalToken,
} from '../../../../utils/oc_commands/modelServing';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { cleanupTemplates } from '../../../../utils/oc_commands/templates';
import { createCustomResource } from '../../../../utils/oc_commands/customResources';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';

let testData: DataScienceProjectData;
let projectName: string;
let resourceName: string;
let modelName: string;
let modelFilePath: string;
let modelFormat: string;
let servingRuntime: string;
let isS390x: boolean;
let awsBucket: 'BUCKET_1' | 'BUCKET_3';
const uuid = generateTestUUID();

describe('A model can be deployed with token auth', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testModelTokenAuth.yaml').then((fixtureData) => {
      testData = fixtureData;
      projectName = `${testData.projectResourceName}-${uuid}`;
      modelName = testData.singleModelName;
      modelFilePath = testData.modelOpenVinoExamplePath;
      modelFormat = testData.modelFormat;
      servingRuntime = testData.servingRuntime;
      isS390x = !!testData.isS390x;
      awsBucket = testData.awsBucket ?? 'BUCKET_1';

      if (!projectName) {
        throw new Error('Project name is undefined or empty in the loaded fixture');
      }
      cy.log(`Loaded project name: ${projectName}`);

      if (isS390x && testData.servingRuntimeName && testData.servingRuntimeYamlPath) {
        const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE') as string | undefined;
        const runtimeYamlPath = testData.servingRuntimeYamlPath;
        cy.log(`Creating ServingRuntime for s390x: ${testData.servingRuntimeName}`);
        cleanupTemplates(testData.servingRuntimeName).then(() => {
          if (!applicationNamespace) {
            throw new Error('APPLICATIONS_NAMESPACE is not configured.');
          }
          createCustomResource(applicationNamespace, runtimeYamlPath).then((result) => {
            expect(result.exitCode).to.equal(0);
          });
        });
      }

      // Create a Project
      provisionProjectForModelServing(
        projectName,
        awsBucket,
        'resources/yaml/data_connection_model_serving.yaml',
      );
    });
  });
  after(() => {
    if (isS390x && testData.servingRuntimeName) {
      cy.log(`Cleaning up ServingRuntime: ${testData.servingRuntimeName}`);
      cleanupTemplates(testData.servingRuntimeName);
    }
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that a model can be deployed with token auth',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing', '@ModelServingCI', '@KServeCI'],
    },
    () => {
      cy.log('Model Name:', modelName);
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to Model Serving tab and Deploy a model
      cy.step('Navigate to Model Serving and click to Deploy a model');
      projectDetails.findSectionTab('model-server').click();
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Step 1: Model details');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.EXISTING).click();
      modelServingWizard.findLocationPathInput().clear().type(modelFilePath);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.PREDICTIVE).click();
      modelServingWizard.findLocationPathInput().should('have.value', modelFilePath);
      modelServingWizard.findNextButton().click();

      cy.step('Step 2: Model deployment');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .then((val) => {
          resourceName = val as string;
        });
      if (isS390x) {
        modelServingWizard.selectServingRuntimeOption(servingRuntime);
        modelServingWizard.findModelFormatSelectOption(modelFormat).click({ force: true });
      } else {
        modelServingWizard.findModelFormatSelectOption(modelFormat).click();
        modelServingWizard.selectServingRuntimeOption(servingRuntime);
      }
      modelServingWizard.findNextButton().click();

      cy.step('Step 3: Advanced settings');
      // Enable Model access through an external route
      cy.step('Enable Model access through an external route');
      modelServingWizard.findExternalRouteCheckbox().click();
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findServiceAccountByIndex(0).clear().type(testData.serviceAccountName1);
      modelServingWizard.findAddServiceAccountButton().click();
      modelServingWizard.findServiceAccountByIndex(1).clear().type(testData.serviceAccountName2);
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review');
      modelServingWizard.findSubmitButton().click();
      if (isS390x) {
        // Patch storage.path onto the IS immediately after submit.
        // The dashboard image on this cluster pre-dates the storage.path fix — the wizard
        // creates the IS with only storage.key set; without storage.path the KServe storage
        // initializer cannot locate the model and Triton crashes with "failed to stat /mnt/models".
        // Use testData.singleModelResourceName (from fixture) — a deterministic value known
        // before the Cypress queue runs, avoiding the async resourceName variable timing issue.
        patchInferenceServiceStoragePath(
          testData.singleModelResourceName ?? resourceName,
          projectName,
          modelFilePath,
        );
        modelServingSection
          .findModelServerDeployedName(testData.singleModelName, { timeout: 120000 })
          .should('be.visible');
      } else {
        modelServingSection.findModelServerDeployedName(testData.singleModelName);
      }

      // Verify the model created
      cy.step('Verify that the Model is running');
      // Verify model deployment is ready
      cy.then(() => {
        checkInferenceServiceState(resourceName, projectName, { checkReady: true });
      });

      // Verify the model is not accessible without a token
      cy.step('Verify the model is not accessible without a token');
      verifyModelExternalToken(modelName, projectName).then(({ response }) => {
        expect(response.status).to.equal(401);
      });

      // Get the tokens from the UI
      cy.step('Get the tokens from the UI');
      const kserveRow = modelServingSection.getKServeRow(testData.singleModelName);
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
      cy.get<string[]>('@copiedTokens')
        .should('have.length.at.least', 2)
        .then((tokens) => {
          const [token1, token2] = tokens;
          verifyModelExternalToken(modelName, projectName, token1).then(({ response }) =>
            expect(response.status).to.equal(200),
          );
          verifyModelExternalToken(modelName, projectName, token2).then(({ response }) =>
            expect(response.status).to.equal(200),
          );
        });

      // Remove the token
      cy.step('Remove the token');
      modelServingSection.getKServeRow(testData.singleModelName).findKebab().click();
      inferenceServiceActions.findEditInferenceServiceAction().click();
      // Check the service accounts are showing up in the UI
      // Go to the next step
      modelServingWizardEdit.findNextButton().click();
      // Go to the next step
      modelServingWizardEdit.findNextButton().click();
      //Step 3: Advanced Options
      modelServingWizardEdit
        .findServiceAccountByIndex(0)
        .should('have.value', testData.serviceAccountName1);
      modelServingWizardEdit
        .findServiceAccountByIndex(1)
        .should('have.value', testData.serviceAccountName2);
      modelServingWizardEdit.findTokenAuthenticationCheckbox().click();
      modelServingWizardEdit.findTokenAuthenticationCheckbox().should('not.be.checked');
      modelServingWizardEdit.findNextButton().click();
      // Submit
      modelServingWizardEdit.findSubmitButton().click();
      if (isS390x) {
        modelServingSection
          .findModelServerDeployedName(testData.singleModelName, { timeout: 120000 })
          .should('be.visible');
      } else {
        modelServingSection.findModelServerDeployedName(testData.singleModelName);
      }

      cy.step('Verify that the Model is running');
      cy.then(() => {
        checkInferenceServiceState(resourceName, projectName, { checkReady: true });
      });

      // Verify the model is accessible without a token
      cy.step('Verify the model is accessible without a token.');
      verifyModelExternalToken(modelName, projectName).then(({ response }) => {
        expect(response.status).to.equal(200);
      });
    },
  );
});
