import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '../../../pages/modelRegistry/registerModelPage';
import {
  FormFieldSelector as VersionFormFieldSelector,
  registerVersionPage,
} from '../../../pages/modelRegistry/registerVersionPage';
import { modelRegistry } from '../../../pages/modelRegistry';
import { registerAndStorePage } from '../../../pages/modelRegistry/registerAndStorePage';
import { clickRegisterModelButton } from '../../../utils/modelRegistryUtils';
import { retryableBeforeEach } from '../../../utils/retryableHooks';
import {
  checkModelExistsInDatabase,
  checkModelRegistry,
  checkModelRegistryAvailable,
  checkModelTransferJobPodStarted,
  checkModelVersionExistsInDatabase,
  cleanupRegisteredModelsFromDatabase,
  createAndVerifyDatabase,
  createModelRegistryViaYAML,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
  grantProjectAccessToModelRegistry,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { toastNotifications } from '../../../pages/components/ToastNotifications';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelRegistryTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { AWS_BUCKETS } from '../../../utils/s3Buckets';

describe('Verify models can be registered in a model registry', () => {
  let testData: ModelRegistryTestData;
  let registryName: string;
  let objectStorageModelName: string;
  let ociModelName: string;
  let ociUriModelName: string;
  let deploymentName: string;
  let projectName: string;
  const uuid = generateTestUUID();
  const databaseName = `model-registry-db-${uuid}`;

  before(() => {
    cy.step('Load test data from fixture');
    loadModelRegistryFixture('e2e/modelRegistry/testModelRegistry.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = `${testData.registryNamePrefix}-${uuid}`;
      objectStorageModelName = `${testData.objectStorageModelName}-${uuid}`;
      ociModelName = `${testData.ociModelName}-${uuid}`;
      ociUriModelName = `${testData.ociUriModelName}-${uuid}`;
      deploymentName = testData.operatorDeploymentName;

      // ensure operator has optimal memory
      cy.step('Ensure operator has optimal memory for testing');
      ensureOperatorMemoryLimit(deploymentName).should('be.true');

      // create and verify SQL database for the model registry
      cy.step('Create and verify SQL database for model registry');
      createAndVerifyDatabase(databaseName).should('be.true');

      // creates a model registry
      cy.step('Create a model registry using YAML');
      createModelRegistryViaYAML(registryName, databaseName);

      cy.step('Verify model registry is created');
      checkModelRegistry(registryName).should('be.true');

      cy.step('Wait for model registry to be in Available state');
      checkModelRegistryAvailable(registryName).should('be.true');

      cy.step('Create a project for register and store test');
      projectName = `test-register-store-${uuid}`;
      createCleanProject(projectName);

      cy.step('Grant project access to the model registry');
      grantProjectAccessToModelRegistry(projectName, registryName);
    });
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Registers models via model registry using object storage and URI',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@ModelRegistryCI', '@Smoke', '@SmokeSet4'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit(registryName);

      cy.step('Register a model using object storage');
      clickRegisterModelButton(30000);

      // Fill in model details for object storage
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(objectStorageModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.objectStorageModelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.version1Name);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.version1Description);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatOnnx);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion1_0);

      // Configure object storage location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
        .type(testData.objectStorageEndpoint);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_BUCKET)
        .type(testData.objectStorageBucket);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_REGION)
        .type(testData.objectStorageRegion);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_PATH)
        .type(testData.objectStoragePath);

      registerModelPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the object storage model was registered');
      cy.url().should('include', '/details');
      cy.contains(objectStorageModelName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the object storage model exists in the database');
      checkModelExistsInDatabase(objectStorageModelName, databaseName).should('be.true');

      cy.step('Navigate back to register another model using direct URL');
      registerModelPage.visitWithRegistry(registryName);

      cy.step('Register a model using URI');
      // Fill in model details for URI
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(testData.uriModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.uriModelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.version1Name);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.uriVersion1Description);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatPytorch);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion2_0);

      // Configure URI location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
      registerModelPage.findFormField(FormFieldSelector.LOCATION_URI).type(testData.uriPrimary);

      registerModelPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the URI model was registered');
      cy.url().should('include', '/details');
      cy.contains(testData.uriModelName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the URI model exists in the database');
      checkModelExistsInDatabase(testData.uriModelName, databaseName).should('be.true');

      cy.step('Navigate back to model registry to verify both models');
      cy.visitWithLogin(`/ai-hub/registry/${registryName}`, HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify both models are visible in the registry');
      cy.contains(objectStorageModelName, { timeout: 10000 }).should('be.visible');
      cy.contains(testData.uriModelName, { timeout: 10000 }).should('be.visible');
    },
  );

  it(
    'Registers a new version via versions view',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Smoke', '@SmokeSet4'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit(registryName);

      cy.step('Navigate to the first registered model');
      cy.contains(objectStorageModelName).click();

      cy.step('Navigate to versions tab');
      modelRegistry.findModelVersionsTab().click();

      cy.step('Click Register new version button');
      modelRegistry.findRegisterNewVersionButton().click();

      cy.step('Fill in version details');
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_NAME)
        .type(testData.version2Name);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.version2Description);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatTensorflow);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion3_0);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_PATH)
        .type(testData.objectStoragePath);

      cy.step('Configure URI location for the new version');
      registerVersionPage.findFormField(VersionFormFieldSelector.LOCATION_TYPE_URI).click();
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_URI)
        .type(testData.uriVersion2);

      cy.step('Submit the new version');
      registerVersionPage.findSubmitButton().click();

      cy.step('Verify the new version was registered');
      cy.url().should('include', '/details');
      cy.contains(testData.version2Name, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the new version exists in the database');
      checkModelVersionExistsInDatabase(testData.version2Name, databaseName).should('be.true');
    },
  );

  it(
    'Registers and stores a model to an OCI destination',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Smoke', '@SmokeSet4'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit(registryName);

      cy.step('Click Register Model button');
      clickRegisterModelButton(30000);

      cy.step('Verify registration mode toggle is visible');
      registerModelPage.findRegistrationModeToggleGroup(30000).scrollIntoView();
      registerModelPage.findRegistrationModeToggleGroup().should('be.visible');

      cy.step('Toggle to Register and store mode');
      registerModelPage.findRegisterAndStoreToggle().click();

      cy.step('Verify namespace selector appears');
      registerAndStorePage.findProjectSelectorToggle(30000).scrollIntoView();
      registerAndStorePage.findProjectSelectorToggle().should('be.visible');

      cy.step('Select a namespace from the dropdown');
      registerAndStorePage.findProjectSelectorToggle().click();
      registerAndStorePage.findProjectSelectorSearch().fill(projectName);
      registerAndStorePage
        .findProjectSelectorMenuList()
        .contains('button', projectName)
        .should('be.visible')
        .click();
      cy.step(`Selected namespace: ${projectName}`);

      cy.step('Verify origin and destination location sections appear');
      registerModelPage.findOriginLocationSection(30000).scrollIntoView();
      registerModelPage.findOriginLocationSection().should('be.visible');
      registerModelPage.findDestinationLocationSection().should('be.visible');

      cy.step('Fill in model details');
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(ociModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.ociModelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.ociVersionName);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.ociVersionDescription);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.ociModelFormat);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.ociModelFormatVersion);

      cy.step('Fill in transfer job name');
      registerModelPage.findFormField(FormFieldSelector.JOB_NAME).type(testData.ociJobName);

      cy.step('Fill in origin S3 location and credentials');
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
        .type(testData.ociSourceEndpoint);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_BUCKET)
        .type(testData.ociSourceBucket);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_REGION)
        .type(testData.ociSourceRegion);
      registerModelPage.findFormField(FormFieldSelector.LOCATION_PATH).type(testData.ociSourcePath);

      const sourceAccessKeyId = AWS_BUCKETS.AWS_ACCESS_KEY_ID;
      const sourceSecretAccessKey = AWS_BUCKETS.AWS_SECRET_ACCESS_KEY;
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_S3_ACCESS_KEY_ID)
        .scrollIntoView()
        .type(sourceAccessKeyId, { log: false });
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_S3_SECRET_ACCESS_KEY)
        .type(sourceSecretAccessKey, { log: false });

      cy.step('Fill in OCI destination fields');
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_REGISTRY)
        .type(testData.ociDestinationRegistry);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_URI)
        .type(testData.ociDestinationUri);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_USERNAME)
        .type(testData.ociDestinationUsername, { log: false });
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_PASSWORD)
        .type(testData.ociDestinationPassword, { log: false });

      cy.step('Verify submit button is enabled');
      registerModelPage.findSubmitButton().should('be.enabled');

      cy.step('Submit the register and store form');
      registerModelPage.findSubmitButton().click();

      cy.step('Verify transfer job started notification appears');
      cy.contains(testData.ociTransferJobStartedNotification, { timeout: 15000 }).should(
        'be.visible',
      );

      cy.step('Verify navigation away from the registration form');
      cy.url().should('not.include', '/register');

      // Terminal state of the transfer job (success/failure) is environment-dependent
      // and not validated here. A dedicated test with a controlled backend is more appropriate.
    },
  );

  it(
    'Registers and stores a model to an OCI destination using URI origin',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Smoke', '@SmokeSet4'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit(registryName);

      cy.step('Click Register Model button');
      clickRegisterModelButton(30000);

      cy.step('Verify registration mode toggle is visible');
      registerModelPage.findRegistrationModeToggleGroup(30000).scrollIntoView();
      registerModelPage.findRegistrationModeToggleGroup().should('be.visible');

      cy.step('Toggle to Register and store mode');
      registerModelPage.findRegisterAndStoreToggle().click();

      cy.step('Verify namespace selector appears');
      registerAndStorePage.findProjectSelectorToggle(30000).scrollIntoView();
      registerAndStorePage.findProjectSelectorToggle().should('be.visible');

      cy.step('Select a namespace from the dropdown');
      registerAndStorePage.findProjectSelectorToggle().click();
      registerAndStorePage.findProjectSelectorSearch().fill(projectName);
      registerAndStorePage
        .findProjectSelectorMenuList()
        .contains('button', projectName)
        .should('be.visible')
        .click();

      cy.step('Verify origin and destination location sections appear');
      registerModelPage.findOriginLocationSection(30000).scrollIntoView();
      registerModelPage.findOriginLocationSection().should('be.visible');
      registerModelPage.findDestinationLocationSection().should('be.visible');

      cy.step('Fill in model details');
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(ociUriModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.ociModelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.ociVersionName);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.ociVersionDescription);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.ociModelFormat);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.ociModelFormatVersion);

      cy.step('Fill in transfer job name');
      registerModelPage.findFormField(FormFieldSelector.JOB_NAME).type(testData.ociUriJobName);

      cy.step('Select URI as origin location type and fill in URI');
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_URI)
        .type(testData.ociUriOriginUri);

      cy.step('Fill in OCI destination fields');
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_REGISTRY)
        .scrollIntoView()
        .type(testData.ociDestinationRegistry);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_URI)
        .type(testData.ociDestinationUri);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_USERNAME)
        .type(testData.ociDestinationUsername, { log: false });
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_PASSWORD)
        .type(testData.ociDestinationPassword, { log: false });

      cy.step('Verify submit button is enabled');
      registerModelPage.findSubmitButton().should('be.enabled');

      cy.step('Submit the register and store form');
      registerModelPage.findSubmitButton().click();

      cy.step('Verify transfer job started notification appears');
      toastNotifications
        .findToastNotificationList()
        .should('contain.text', testData.ociTransferJobStartedNotification);

      cy.step('Verify transfer job and pod started in the backend');
      checkModelTransferJobPodStarted(testData.ociUriJobName, projectName).should('be.true');

      cy.step('Verify navigation away from the registration form');
      cy.url().should('not.include', '/register');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Clean up registered models from database');
    cleanupRegisteredModelsFromDatabase(
      [objectStorageModelName, testData.uriModelName, ociModelName, ociUriModelName],
      databaseName,
    );

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase(databaseName).should('be.true');

    cy.step('Delete the test project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });
});
