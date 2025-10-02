import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
  kserveModalEdit,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import {
  checkInferenceServiceState,
  modelExternalTester,
  provisionProjectForModelServing,
  verifyModelExternalToken,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('A model can be deployed with token auth', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testModelTokenAuth.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelFilePath = testData.modelOpenVinoExamplePath;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        // Create a Project
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });
  after(() => {
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that a model can be deployed with token auth',
    { tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing'] },
    () => {
      cy.log('Model Name:', modelName);
      cy.step(`Log into the application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to Model Serving tab and Deploy a model
      cy.step('Navigate to Model Serving and click to Deploy a model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a model
      cy.step('Launch a Single Serving Model using Openvino');
      inferenceServiceModal.findModelNameInput().type(testData.singleModelName);
      inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
      inferenceServiceModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
      inferenceServiceModal.findModelFrameworkSelect().click();
      inferenceServiceModal.findOpenVinoIROpSet13().click();

      // Enable Model access through an external route
      cy.step('Enable Model access through an external route');
      inferenceServiceModal.findDeployedModelRouteCheckbox().click();
      inferenceServiceModal.findDeployedModelRouteCheckbox().should('be.checked');
      inferenceServiceModal.findServiceAccountIndex(0).clear();
      inferenceServiceModal.findServiceAccountIndex(0).type('secret');
      inferenceServiceModal.findAddServiceAccountButton().click();
      inferenceServiceModal.findServiceAccountIndex(1).clear();
      inferenceServiceModal.findServiceAccountIndex(1).type('secret2');
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();
      inferenceServiceModal.shouldBeOpen(false);

      // Verify the model created
      cy.step('Verify that the Model is running');
      checkInferenceServiceState(testData.singleModelName, projectName, {
        checkReady: true,
        checkLatestDeploymentReady: true,
      });

      // Verify the model is not accessible without a token
      cy.step('Verify the model is not accessible without a token');
      modelExternalTester(modelName, projectName).then(({ response }) => {
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
          verifyModelExternalToken(modelName, projectName, token1).then((r) =>
            expect(r.status).to.equal(200),
          );
          verifyModelExternalToken(modelName, projectName, token2).then((r) =>
            expect(r.status).to.equal(200),
          );
        });

      // Remove the token
      cy.step('Remove the token');
      modelServingSection
        .getKServeRow(testData.singleModelName)
        .find()
        .findKebabAction('Edit')
        .click();
      // Check the service accounts are showing up in the UI
      kserveModalEdit.findServiceAccountIndex(0).should('have.value', 'secret');
      kserveModalEdit.findServiceAccountIndex(1).should('have.value', 'secret2');
      kserveModalEdit.findTokenAuthenticationCheckbox().click();
      kserveModalEdit.findTokenAuthenticationCheckbox().should('not.be.checked');
      kserveModalEdit.findSubmitButton().click();
      kserveModalEdit.shouldBeOpen(false);

      // Verify the model is accessible without a token
      cy.step('Verify the model is accessible without a token');
      verifyModelExternalToken(modelName, projectName).then((response) => {
        expect(response.status).to.equal(200);
      });
    },
  );
});
