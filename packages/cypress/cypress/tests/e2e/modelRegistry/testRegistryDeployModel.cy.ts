import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  ModelLocationSelectOption,
  ModelStateLabel,
  ModelTypeLabel,
} from '../../../utils/modelServingConstants';
import {
  FormFieldSelector,
  registerModelPage,
} from '../../../pages/modelRegistry/registerModelPage';
import { modelRegistry } from '../../../pages/modelRegistry';
import { retryableBefore } from '../../../utils/retryableHooks';
import { isBYOIDCCluster, skipSuiteIfBYOIDC } from '../../../utils/skipUtils';
import {
  checkModelExistsInDatabase,
  cleanupModelRegistryComponents,
  cleanupRegisteredModelsFromDatabase,
  createAndVerifyDatabase,
  createAndVerifyModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelRegistryTestData } from '../../../types';
import { modelVersionDeployModal } from '../../../pages/modelRegistry/modelVersionDeployModal';
import { clickRegisterModelButton } from '../../../utils/modelRegistryUtils';
import { modelServingWizard } from '../../../pages/modelServing';
import { checkInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  deleteOpenShiftProject,
  deleteInferenceService,
  patchInferenceServiceFinalizers,
} from '../../../utils/oc_commands/project';
import { AWS_BUCKETS } from '../../../utils/s3Buckets';
import {
  cleanupHardwareProfiles,
  createCleanHardwareProfile,
} from '../../../utils/oc_commands/hardwareProfiles';

describe('Verify models can be deployed from model registry', () => {
  // Skip entire suite on BYOIDC clusters
  skipSuiteIfBYOIDC('Multiple permissions management tests are not supported on BYOIDC clusters');

  let testData: ModelRegistryTestData;
  let registryName: string;
  let modelName: string;
  let projectName: string;
  let resourceName: string;
  let deploymentName: string;
  let servingRuntime: string;
  let hardwareProfileName: string;
  let hardwareProfileYamlPath: string;
  let servingRuntimeArgs: string;
  let deploymentType: string;
  let envVars: Array<{ name: string; value: string }>;
  const uuid = generateTestUUID();
  const databaseName = `model-registry-db-${uuid}`;

  retryableBefore(() => {
    cy.step('Load test data from fixture');
    loadModelRegistryFixture('e2e/modelRegistry/testModelRegistry.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = `${testData.registryNamePrefix}-${uuid}`;
      modelName = `${testData.objectStorageModelName}-${uuid}`;
      projectName = `${testData.deployProjectNamePrefix}-${uuid}`;

      deploymentName = testData.operatorDeploymentName;
      servingRuntime = testData.servingRuntime;
      hardwareProfileName = testData.hardwareProfileName;
      hardwareProfileYamlPath = testData.hardwareProfileYamlPath;
      servingRuntimeArgs = testData.servingRuntimeArgs;
      deploymentType = testData.deploymentType;
      envVars = testData.envVars;

      // ensure operator has optimal memory
      cy.step('Ensure operator has optimal memory for testing');
      ensureOperatorMemoryLimit(deploymentName).should('be.true');

      //Create and verify SQL database
      cy.step('Create and verify SQL database for model registry');
      createAndVerifyDatabase(databaseName).should('be.true');

      cy.step('Create a model registry and verify it is ready');
      createAndVerifyModelRegistry(registryName, databaseName);

      cy.step('Create a project for model deployment');
      createCleanProject(projectName);

      cy.step('Create hardware profile for model deployment');
      createCleanHardwareProfile(hardwareProfileYamlPath);
    });
  });

  after(() => {
    if (isBYOIDCCluster()) {
      cy.log('Skipping cleanup - tests were skipped on BYOIDC cluster');
      return;
    }

    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Delete deployed model');

    return deleteInferenceService(projectName)
      .then(() => {
        cy.step('Waiting 20 seconds for InferenceService deletion');
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        return cy.wait(20000).then(() =>
          cy.exec(`oc get isvc -n ${projectName} -o name`, {
            failOnNonZeroExit: false,
          }),
        );
      })

      .then(() => {
        cy.step('InferenceService is stuck. Removing Model Registry finalizer');

        return patchInferenceServiceFinalizers(projectName)
          .then(() => {
            // eslint-disable-next-line cypress/no-unnecessary-waiting
            return cy.wait(10000);
          })
          .then(() =>
            cy.exec(`oc get isvc -n ${projectName} -o name`, {
              failOnNonZeroExit: false,
            }),
          )
          .then((execResult) => {
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            if (execResult == null) {
              return execResult;
            }

            const stdout = execResult.stdout.trim();
            if (stdout !== '') {
              throw new Error(`InferenceService still exists:\n${stdout}`);
            }
          });
      })

      .then(() => {
        cy.step('Clean up model registry components');

        return cleanupModelRegistryComponents([modelName], registryName, databaseName);
      })

      .then(() => {
        cy.step('Delete the SQL database');

        return deleteModelRegistryDatabase(databaseName);
      })

      .then(() => {
        cy.step('Delete the test project');

        return deleteOpenShiftProject(projectName, {
          wait: true,
          ignoreNotFound: true,
          timeout: 300000,
        });
      })

      .then(() => {
        cy.step('Clean up hardware profile');

        return cleanupHardwareProfiles(hardwareProfileName);
      });
  });

  it(
    'Registers a model and deploys it via model registry',
    {
      tags: [
        '@Dashboard',
        '@ModelRegistry',
        '@ModelRegistryCI',
        '@TestRegistryDeployModel',
        '@Sanity',
        '@SanitySet4',
      ],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Clean up model from any previous retry attempts');
      cleanupRegisteredModelsFromDatabase([modelName], databaseName);

      cy.step('Visit Model Registry Page');
      modelRegistry.visitWithRegistry(registryName);

      cy.step('Register a model using object storage');
      clickRegisterModelButton(30000);

      //Fill in model details for object storage
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(modelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.objectStorageModelDescription);
      registerModelPage.selectModelType('Generative AI model (Example, LLM)', 30000);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.version1Name);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.version1Description);

      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion1_0);

      // Configure object storage location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
        .type(AWS_BUCKETS.BUCKET_3.ENDPOINT);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_BUCKET)
        .type(AWS_BUCKETS.BUCKET_3.NAME);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_REGION)
        .type(AWS_BUCKETS.BUCKET_3.REGION);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_PATH)
        .type(testData.modelOpenVinoPath);

      registerModelPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the model was registered');
      cy.url({ timeout: 30000 }).should('include', '/registered-models/');
      cy.contains(modelName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the model exists in the database');
      checkModelExistsInDatabase(modelName, databaseName).should('be.true');

      cy.step('Navigate to model versions to deploy the model');
      cy.contains(modelName).click();
      cy.url({ timeout: 30000 }).should('include', '/registered-models/');
      modelRegistry.findModelVersionsTab().should('be.visible').click();

      cy.step('Deploy the model from the versions table');
      const modelVersionRow = modelRegistry.getModelVersionRow(testData.version1Name);
      modelVersionRow.findKebab().click();
      modelRegistry.findDeployAction().click();

      cy.step('Select the project for deployment');
      modelVersionDeployModal.selectProjectByName(projectName);
      modelVersionDeployModal.findDeployButton().click();

      cy.step('Configure the deployment');
      cy.step('Model details');
      // connection data should be prefilled
      modelServingWizard
        .findModelLocationSelect()
        .should('contain.text', ModelLocationSelectOption.S3);
      modelServingWizard.findLocationAccessKeyInput().clear().type(AWS_BUCKETS.AWS_ACCESS_KEY_ID);
      modelServingWizard
        .findLocationSecretKeyInput()
        .clear()
        .type(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY);
      modelServingWizard
        .findLocationEndpointInput()
        .should('have.value', AWS_BUCKETS.BUCKET_3.ENDPOINT);
      modelServingWizard.findLocationBucketInput().should('have.value', AWS_BUCKETS.BUCKET_3.NAME);
      modelServingWizard
        .findLocationRegionInput()
        .should('have.value', AWS_BUCKETS.BUCKET_3.REGION);

      modelServingWizard.findLocationPathInput().should('have.value', testData.modelOpenVinoPath);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard.findSaveConnectionInput().clear().type(`${projectName}-connection`);
      modelServingWizard
        .findModelTypeSelectOption(ModelTypeLabel.GENERATIVE)
        .click({ force: true });
      modelServingWizard.findNextButton().click();

      cy.step('Model deployment');
      //model name should be prefilled
      modelServingWizard
        .findModelDeploymentNameInput()
        .should('have.value', `${modelName} - ${testData.version1Name}`);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .then((val) => {
          resourceName = val as string;
        });
      modelServingWizard.selectDeploymentType(deploymentType);
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileName);
      modelServingWizard.selectServingRuntimeOption(servingRuntime);
      modelServingWizard.findNextButton().click();

      cy.step('Advanced settings');
      // Enable and fill serving runtime arguments
      modelServingWizard.findRuntimeArgsCheckbox().click();
      modelServingWizard.findRuntimeArgsTextBox().type(servingRuntimeArgs);

      // Enable and fill environment variables (one row per entry)
      modelServingWizard.findEnvVariablesCheckbox().click();
      cy.findByText('Add variable').click();
      envVars.forEach((envVar, index) => {
        if (index > 0) {
          modelServingWizard.findAddVariableButton().click();
        }
        //cy.get('[data-testid="add-environment-variable"] > .pf-v6-c-button__text').click()
        modelServingWizard.findEnvVariableName(String(index)).clear().type(envVar.name);
        modelServingWizard.findEnvVariableValue(String(index)).clear().type(envVar.value);
      });

      modelServingWizard.findNextButton().click();

      cy.step('Review');
      modelServingWizard.findSubmitButton().click();
      modelRegistry
        .getDeploymentRow(`${modelName} - ${testData.version1Name}`)
        .should('be.visible');

      // Verify model deployment is ready
      cy.step('Verify the model is deployed and started in backend');
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(20000);
      cy.then(() => {
        checkInferenceServiceState(resourceName, projectName, { checkReady: true });
      });
      // Check deployment link and verify status in deployments view
      modelRegistry.visitWithRegistry(registryName);
      cy.contains('1 deployment', { timeout: 30000 }).should('be.visible').click();
      cy.contains(modelName).should('be.visible');
      cy.contains(ModelStateLabel.READY).should('be.visible');
    },
  );
});
