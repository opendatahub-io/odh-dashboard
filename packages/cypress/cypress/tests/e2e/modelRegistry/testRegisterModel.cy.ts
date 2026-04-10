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
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { toastNotifications } from '../../../pages/components/ToastNotifications';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { getApplicationsNamespace, getBooleanEnv } from '../../../utils/cypressEnvHelpers';
import type { ModelRegistryTestData } from '../../../types';

describe('Verify models can be registered in a model registry', () => {
  const chooseNamespaceForRegisterAndStore = (name: string): void => {
    cy.findByTestId('namespace-form-group', { timeout: 30000 }).then(($formGroup) => {
      if ($formGroup.find('[data-testid="form-namespace-selector"]').length > 0) {
        registerModelPage.findNamespaceSelectorTrigger().scrollIntoView().click();
        registerModelPage.findNamespaceOption(name).click();
      } else if ($formGroup.find('[data-testid="form-namespace-text-input"]').length > 0) {
        registerModelPage.findNamespaceTextInput(30000).scrollIntoView().clear().type(name);
      } else {
        cy.findByTestId('project-selector-toggle').click();
        cy.findByTestId('project-selector-search').clear();
        cy.findByTestId('project-selector-search').type(name);
        cy.get('[data-testid="project-selector-menuList"]').contains(name).click();
      }
    });
  };

  let namespaceName: string;
  let testData: ModelRegistryTestData;
  let registryName: string;
  let objectStorageModelName: string;
  let ociModelName: string;
  let ociUriModelName: string;
  let deploymentName: string;
  let setupComplete = false;
  const uuid = generateTestUUID();
  const databaseName = `model-registry-db-${uuid}`;

  before(() => {
    namespaceName = getApplicationsNamespace();
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
      setupComplete = true;
    });
  });

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    if (!setupComplete) {
      cy.step('Skip cleanup because suite setup did not complete');
      return;
    }

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    const modelsToClean = [
      objectStorageModelName,
      testData.uriModelName,
      ociModelName,
      ociUriModelName,
    ].filter((modelName): modelName is string => Boolean(modelName));

    if (modelsToClean.length > 0) {
      cy.step('Clean up registered models from database');
      cleanupRegisteredModelsFromDatabase(modelsToClean, databaseName);
    }

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase(databaseName).should('be.true');
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
      modelRegistry.visitWithRegistry(registryName);

      cy.step('Register a model using object storage');
      clickRegisterModelButton(30000);

      cy.step('Fill in object storage model details');
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

      cy.step('Configure object storage location');
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

      registerModelPage.findSubmitButton(30000).should('be.enabled').click();

      cy.step('Verify the object storage model was registered');
      cy.url({ timeout: 30000 })
        .should('include', '/registered-models/')
        .and('include', '/versions/');
      modelRegistry.findVersionDetailsBreadcrumbModel().should('contain', objectStorageModelName);

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

      cy.step('Configure URI location');
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
      registerModelPage.findFormField(FormFieldSelector.LOCATION_URI).type(testData.uriPrimary);

      registerModelPage.findSubmitButton(30000).should('be.enabled').click();

      cy.step('Verify the URI model was registered');
      cy.url({ timeout: 30000 })
        .should('include', '/registered-models/')
        .and('include', '/versions/');
      modelRegistry.findVersionDetailsBreadcrumbModel().should('contain', testData.uriModelName);

      cy.step('Verify the URI model exists in the database');
      checkModelExistsInDatabase(testData.uriModelName, databaseName).should('be.true');

      cy.step('Navigate back to model registry to verify both models');
      cy.visitWithLogin(`/ai-hub/models/registry/${registryName}`, HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify both models are visible in the registry');
      // Scoped to the registry table model-name cells (10s), not document-wide cy.contains.
      modelRegistry.findModelByName(objectStorageModelName).should('be.visible');
      modelRegistry.findModelByName(testData.uriModelName).should('be.visible');
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
      modelRegistry.visitWithRegistry(registryName);

      cy.step('Navigate to the first registered model');
      modelRegistry.findModelNameLinkButton(objectStorageModelName).should('be.visible').click();
      cy.url({ timeout: 30000 }).should('include', '/registered-models/');

      cy.step('Navigate to versions tab');
      modelRegistry.findModelVersionsTab().should('be.visible').click();

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
      cy.url({ timeout: 30000 })
        .should('include', '/registered-models/')
        .and('include', '/versions/');
      modelRegistry.findVersionDetailsBreadcrumbVersion().should('contain', testData.version2Name);

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
      const expectOciTransferFailure = getBooleanEnv('EXPECT_OCI_TRANSFER_FAILURE', true);

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit();

      cy.step('Select the created model registry');
      modelRegistry.findSelectModelRegistry(registryName);

      cy.step('Click Register Model button');
      clickRegisterModelButton(30000);

      cy.step('Verify registration mode toggle is present');
      registerModelPage.findRegistrationModeToggleGroup().should('exist');

      cy.step('Toggle to Register and store mode');
      registerModelPage
        .findRegisterAndStoreToggleButton()
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true })
        .should('have.attr', 'aria-pressed', 'true');

      cy.step('Verify namespace input appears');
      cy.findByTestId('namespace-form-group', { timeout: 30000 }).should('exist');

      cy.step('Select or type namespace');
      chooseNamespaceForRegisterAndStore(namespaceName);

      cy.step('Verify origin and destination location sections appear');
      registerModelPage.findOriginLocationSection(10000).should('be.visible');
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

      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_S3_ACCESS_KEY_ID)
        .type(Cypress.env('OCI_SOURCE_ACCESS_KEY_ID'), { log: false });
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_S3_SECRET_ACCESS_KEY)
        .type(Cypress.env('OCI_SOURCE_SECRET_ACCESS_KEY'), { log: false });

      cy.step('Fill in OCI destination fields');
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_REGISTRY)
        .type(testData.ociDestinationRegistry);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_URI)
        .type(testData.ociDestinationUri);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_USERNAME)
        .type(Cypress.env('OCI_DESTINATION_USERNAME'), { log: false });
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_PASSWORD)
        .type(Cypress.env('OCI_DESTINATION_PASSWORD'), { log: false });

      cy.step('Verify submit button is enabled');
      registerModelPage.findSubmitButton().should('be.enabled');

      cy.step('Submit the register and store form');
      registerModelPage.findSubmitButton().click();

      cy.step('Verify transfer job started notification appears');
      toastNotifications
        .findToastNotificationList()
        .should('contain.text', testData.ociTransferJobStartedNotification);

      cy.step('Verify transfer job and pod started in the backend');
      checkModelTransferJobPodStarted(testData.ociJobName, namespaceName).should('be.true');

      cy.step('Verify navigation away from the registration form');
      cy.url().should('not.include', '/register');

      if (expectOciTransferFailure) {
        // PSI cluster environments do not support TLS for OCI registries,
        // so the transfer job is expected to fail. We verify the failure
        // notification appears as confirmation that the job was created and ran.
        cy.step('Verify transfer job failure notification (expected — no TLS on PSI)');
        toastNotifications
          .findToastNotificationList()
          .should('contain.text', testData.ociTransferJobFailedNotification);
      } else {
        cy.step('Skip transfer failure notification assertion for non-PSI cluster');
      }
    },
  );

  it(
    'Registers and stores a model to an OCI destination using URI origin',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Smoke', '@SmokeSet4'],
    },
    () => {
      const expectOciTransferFailure = getBooleanEnv('EXPECT_OCI_TRANSFER_FAILURE', true);

      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit();

      cy.step('Select the created model registry');
      modelRegistry.findSelectModelRegistry(registryName);

      cy.step('Click Register Model button');
      clickRegisterModelButton(30000);

      cy.step('Verify registration mode toggle is present');
      registerModelPage.findRegistrationModeToggleGroup().should('exist');

      cy.step('Toggle to Register and store mode');
      registerModelPage
        .findRegisterAndStoreToggleButton()
        .scrollIntoView()
        .should('be.visible')
        .click({ force: true })
        .should('have.attr', 'aria-pressed', 'true');

      cy.step('Verify namespace input appears');
      cy.findByTestId('namespace-form-group', { timeout: 30000 }).should('exist');

      cy.step('Select or type namespace');
      chooseNamespaceForRegisterAndStore(namespaceName);

      cy.step('Verify origin and destination location sections appear');
      registerModelPage.findOriginLocationSection(10000).should('be.visible');
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
        .type(testData.ociDestinationRegistry);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_URI)
        .type(testData.ociDestinationUri);
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_USERNAME)
        .type(Cypress.env('OCI_DESTINATION_USERNAME'), { log: false });
      registerModelPage
        .findFormField(FormFieldSelector.DESTINATION_OCI_PASSWORD)
        .type(Cypress.env('OCI_DESTINATION_PASSWORD'), { log: false });

      cy.step('Verify submit button is enabled');
      registerModelPage.findSubmitButton().should('be.enabled');

      cy.step('Submit the register and store form');
      registerModelPage.findSubmitButton().click();

      cy.step('Verify transfer job started notification appears');
      toastNotifications
        .findToastNotificationList()
        .should('contain.text', testData.ociTransferJobStartedNotification);

      cy.step('Verify transfer job and pod started in the backend');
      checkModelTransferJobPodStarted(testData.ociUriJobName, namespaceName).should('be.true');

      cy.step('Verify navigation away from the registration form');
      cy.url().should('not.include', '/register');

      if (expectOciTransferFailure) {
        // PSI cluster environments do not support TLS for OCI registries,
        // so the transfer job is expected to fail. We verify the failure
        // notification appears as confirmation that the job was created and ran.
        cy.step('Verify transfer job failure notification (expected — no TLS on PSI)');
        toastNotifications
          .findToastNotificationList()
          .should('contain.text', testData.ociTransferJobFailedNotification);
      } else {
        cy.step('Skip transfer failure notification assertion for non-PSI cluster');
      }
    },
  );
});
