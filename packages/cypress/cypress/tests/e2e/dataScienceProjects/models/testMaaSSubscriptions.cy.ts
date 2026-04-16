import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/model-serving/types/form-data';
import {
  cleanupAuthPolicy,
  cleanupSubscription,
  verifyMaaSModelInferencing,
} from '../../../../utils/oc_commands/maas';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../../pages/modelServing';
import {
  addModelsToSubscriptionModal,
  createApiKeyModal,
  apiKeysPage,
  createSubscriptionPage,
  editRateLimitsModal,
  maasWizardField,
  copyApiKeyModal,
  subscriptionsPage,
  editSubscriptionPage,
  deleteSubscriptionModal,
  revokeAPIKeyModal,
} from '../../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import type { DataScienceProjectData } from '../../../../types';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import {
  createCleanLLMInferenceServiceConfig,
  cleanupLLMInferenceServiceConfig,
  checkLLMInferenceServiceConfigState,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { checkLLMInferenceServiceState } from '../../../../utils/oc_commands/modelServing';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let subscriptionDescription: string;
let subscriptionPriority: number;
let subscriptionGroups: string;
let subscriptionName: string;
let subscriptionDisplayName: string;
let tokenRateLimit: { limit: number; window: string };
const uuid = generateTestUUID();
let hardwareProfileResourceName: string;
let modelURI: string;
const llmInferenceServiceConfigName = 'kserve-config-llm-template-cpu-cypress';
const llmInferenceServiceConfigDisplayName = 'vLLM CPU LLMInferenceServiceConfig-Cypress';
const llmInferenceServiceConfigYamlPath =
  'resources/modelServing/llmd-inference-service-config.yaml';

describe('A model can be deployed and accessed with a MaaS subscription and API key', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testMaaSSubscriptions.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelName}-maasSubs`;
        modelURI = testData.modelLocationURI;
        hardwareProfileResourceName = `${testData.hardwareProfileName}`;
        // TODO remove the -a from the subscription name once RHOAIENG-58437 is resolved
        subscriptionDisplayName = 'A Test MaaS Subscription';
        subscriptionName = 'a-test-maas-subscription';
        subscriptionDescription = 'This is a test MaaS subscription';
        subscriptionPriority = 256;
        subscriptionGroups = 'system:authenticated';
        tokenRateLimit = {
          limit: 1000,
          window: '1000',
        };
        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Load Hardware Profile Name: ${hardwareProfileResourceName}`);
        createCleanHardwareProfile('resources/yaml/llmd-hardware-profile.yaml');
      })
      .then(() => {
        cy.log(`Load LLMInferenceServiceConfig: ${llmInferenceServiceConfigName}`);
        createCleanLLMInferenceServiceConfig(
          llmInferenceServiceConfigName,
          llmInferenceServiceConfigYamlPath,
        );
      });
  });

  after(() => {
    cy.log(`Cleaning up Hardware Profile: ${hardwareProfileResourceName}`);
    cleanupHardwareProfiles(hardwareProfileResourceName);
    cy.log(`Cleaning up LLMInferenceServiceConfig: ${llmInferenceServiceConfigName}`);
    cleanupLLMInferenceServiceConfig(llmInferenceServiceConfigName);
    cy.log(`Cleaning up Subscription: ${subscriptionDisplayName}`);
    cleanupSubscription(subscriptionName, 'models-as-a-service');
    cy.log(`Just in case, cleaning up second subscription: ${subscriptionDisplayName}2`);
    cleanupSubscription(`${subscriptionName}2`, 'models-as-a-service');

    cy.log(`Cleaning up Auth Policy: ${subscriptionName}-policy`);
    cleanupAuthPolicy(`${subscriptionName}-policy`, 'models-as-a-service');
    cy.log(`Just in case, cleaning up second auth policy: ${subscriptionDisplayName}2-policy`);
    cleanupAuthPolicy(`${subscriptionName}2-policy`, 'models-as-a-service');
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify User can deploy a model by selecting a MaaS subscription and API key',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/?devFeatureFlags=vLLMDeploymentOnMaaS=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Open the deploy model wizard');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Step 1: Model details - select Generative type');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard
        .findSaveConnectionInput()
        .clear()
        .type(`${modelName}${testData.connectionNameSuffix}`);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 2: Model deployment - select vLLM CPU LLMInferenceServiceConfig');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .as('resourceName');
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);
      modelServingWizard.findModelServerManualSelectRadio().click();
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption(llmInferenceServiceConfigDisplayName)
        .should('exist')
        .click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 3: Advanced settings');
      // Verify MaaS checkbox is unchecked by default
      maasWizardField.findSaveAsMaaSCheckbox().should('exist').should('not.be.checked');

      // Check the MaaS checkbox — the gateway field should become disabled and show the MaaS gateway
      maasWizardField.findSaveAsMaaSCheckbox().click();
      maasWizardField.findSaveAsMaaSCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review and submit');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify the model is available in UI');
      modelServingSection.findModelServerDeployedName(modelName);

      cy.step('Verify LLMInferenceService exists in the project namespace');
      cy.get<string>('@resourceName').then((resourceName) => {
        checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true });
      });

      cy.step('Verify LLMInferenceServiceConfig was copied to the project namespace');
      cy.get<string>('@resourceName').then((resourceName) => {
        checkLLMInferenceServiceConfigState(resourceName, projectName, {
          containerImage: 'quay.io/pierdipi/vllm-cpu:latest',
        });
      });

      cy.step('Create a new MaaS subscription');
      subscriptionsPage.visit();
      subscriptionsPage.findCreateSubscriptionButton().click();
      createSubscriptionPage.findDisplayNameInput().clear().type(subscriptionDisplayName);
      createSubscriptionPage.findDescriptionInput().clear().type(subscriptionDescription);
      createSubscriptionPage.findPriorityInput().clear().type(subscriptionPriority.toString());
      // Select groups and add a custom one
      createSubscriptionPage.typeCustomGroup(subscriptionGroups);

      // Add a model to the subscription
      createSubscriptionPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton('gpt2-maassubs').click();
      addModelsToSubscriptionModal.findConfirmButton().click();

      // Verify the model appears in the subscription models table
      createSubscriptionPage.findModelsTable().should('exist');
      createSubscriptionPage.findModelsTable().should('contain.text', modelName);

      // Edit token rate limits for the added model
      createSubscriptionPage.findModelsTable().findByTestId('add-token-limit-0').click();
      editRateLimitsModal.shouldBeOpen();
      editRateLimitsModal.findCountInput(0).clear();
      editRateLimitsModal.findCountInput(0).type(tokenRateLimit.limit.toString());
      editRateLimitsModal.findTimeInput(0).clear();
      editRateLimitsModal.findTimeInput(0).type(tokenRateLimit.window);
      editRateLimitsModal.findSaveButton().click();

      // Verify the auth policy checkbox is checked by default
      createSubscriptionPage.findAuthPolicyCheckbox().should('be.checked');

      // Submit the form
      createSubscriptionPage.findCreateButton().should('be.enabled');
      createSubscriptionPage.findCreateButton().click();

      cy.step('Verify the subscription is created');
      subscriptionsPage.visit();
      // Change to display name once RHOAIENG-58289 is resolved
      subscriptionsPage.findFilterInput().type(subscriptionName);
      subscriptionsPage.findRows().should('have.length', 1);
      subscriptionsPage.findRows().should('contain.text', subscriptionDisplayName);

      cy.step('Create another subscription to test edit and delete');
      subscriptionsPage.findCreateSubscriptionButton().click();
      createSubscriptionPage.findDisplayNameInput().clear().type(`${subscriptionDisplayName}2`);
      createSubscriptionPage.findDescriptionInput().clear().type(`${subscriptionDescription}2`);
      createSubscriptionPage
        .findPriorityInput()
        .clear()
        .type((subscriptionPriority + 1).toString());
      // Select groups and add a custom one
      createSubscriptionPage.typeCustomGroup(subscriptionGroups);

      // Add a model to the subscription
      createSubscriptionPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton('gpt2-maassubs').click();
      addModelsToSubscriptionModal.findConfirmButton().click();

      // Verify the model appears in the subscription models table
      createSubscriptionPage.findModelsTable().should('exist');
      createSubscriptionPage.findModelsTable().should('contain.text', modelName);

      // Edit token rate limits for the added model
      createSubscriptionPage.findModelsTable().findByTestId('add-token-limit-0').click();
      editRateLimitsModal.shouldBeOpen();
      editRateLimitsModal.findCountInput(0).clear();
      editRateLimitsModal.findCountInput(0).type(tokenRateLimit.limit.toString());
      editRateLimitsModal.findTimeInput(0).clear();
      editRateLimitsModal.findTimeInput(0).type(tokenRateLimit.window);
      editRateLimitsModal.findSaveButton().click();

      // Verify the auth policy checkbox is checked by default
      createSubscriptionPage.findAuthPolicyCheckbox().should('be.checked');

      // Submit the form
      createSubscriptionPage.findCreateButton().should('be.enabled');
      createSubscriptionPage.findCreateButton().click();

      cy.step('Verify the second subscription is created');
      subscriptionsPage.visit();
      // Change to display name once RHOAIENG-58289 is resolved
      subscriptionsPage.findFilterInput().type(`${subscriptionName}2`);
      subscriptionsPage.findRows().should('have.length', 1);
      subscriptionsPage.findRows().should('contain.text', `${subscriptionDisplayName}2`);

      cy.step('Edit the second subscription');
      editSubscriptionPage.visit(`${subscriptionName}2`);
      editSubscriptionPage.findNameInput().should('have.value', `${subscriptionDisplayName}2`);
      editSubscriptionPage
        .findPriorityInput()
        .should('have.value', (subscriptionPriority + 1).toString());
      editSubscriptionPage.typeCustomGroup('premium-users');
      editSubscriptionPage.findPolicyChangeWarning().should('exist');
      editSubscriptionPage
        .findPolicyChangeWarning()
        .should('contain.text', 'Authorization policy may need updating');
      editSubscriptionPage.findModelsTable().should('contain.text', modelName);

      editSubscriptionPage.findDescriptionInput().clear().type('Updated description');
      editSubscriptionPage.findSaveButton().click();

      cy.step('Verify the second subscription is updated');
      subscriptionsPage.visit();
      subscriptionsPage.findFilterInput().type(`${subscriptionName}2`);
      subscriptionsPage.findRows().should('have.length', 1);
      subscriptionsPage.findRows().should('contain.text', `${subscriptionDisplayName}2`);
      subscriptionsPage.findRows().should('contain.text', 'Updated description');

      cy.step('Delete the second subscription');
      subscriptionsPage
        .getRow(`${subscriptionDisplayName}2`)
        .findKebabAction('Delete subscription')
        .click();
      deleteSubscriptionModal.findInput().type(`${subscriptionName}2`);
      deleteSubscriptionModal.findSubmitButton().click();
      subscriptionsPage.findFilterInput().type(`${subscriptionName}2`);
      subscriptionsPage.findRows().should('have.length', 0);
      subscriptionsPage.findTable().should('not.contain', `${subscriptionDisplayName}2`);

      cy.step('Create an API key for the subscription');
      apiKeysPage.visit();
      apiKeysPage.findCreateApiKeyButton().click();
      createApiKeyModal.shouldBeOpen();
      createApiKeyModal.findNameInput().type(`maas-api-key-${uuid}`);
      createApiKeyModal
        .findDescriptionInput()
        .type(`Cypress test: API key for ${subscriptionDisplayName}`);
      createApiKeyModal.findSubscriptionToggle().click();
      createApiKeyModal.findSubscriptionOption('a-test-maas-subscription').click();
      createApiKeyModal.findExpirationToggle().click();
      createApiKeyModal.findExpirationOption('custom').click();
      createApiKeyModal.findCustomDaysInput().should('exist');
      createApiKeyModal.findCustomDaysInput().type('1');
      createApiKeyModal.findSubmitButton().should('be.enabled');
      createApiKeyModal.findSubmitButton().click();

      cy.step('Read the API key from the success dialog');
      copyApiKeyModal.shouldBeOpen();
      // ClipboardCopy expansion: collapsed row input is often empty in Cypress; full key is in the panel after "Show content".
      copyApiKeyModal
        .findApiKeyTokenExpandToggle()
        .should('be.visible')
        .click({ waitForAnimations: false });
      copyApiKeyModal
        .findApiKeyTokenExpandedContent()
        .should('be.visible')
        .and('not.be.empty')
        .invoke('text')
        .then((raw) => {
          const token = raw.trim();
          if (token.length === 0) {
            throw new Error('Expected a non-empty API key from expanded ClipboardCopy content');
          }
          cy.wrap(token).as('maasApiKeyToken');
          cy.step('Inference with the model using the API key');
          return cy.get<string>('@resourceName').then((resourceName) =>
            verifyMaaSModelInferencing(resourceName, projectName, token).then(({ response }) => {
              cy.log(`Response status: ${response.status}`);
              expect(response.status).to.equal(200);
              cy.log(`✅ Inference with the model using the API key successful`);
              cy.log(`✅ Response body: ${JSON.stringify(response.body)}`);
            }),
          );
        });

      cy.step('Revoke the API key');
      copyApiKeyModal.findCloseButton().click();
      apiKeysPage.findColumnSortButton('Name').click();

      // Filter by the admin username to find the API key, there could be a lot of keys
      apiKeysPage.findFilterInput().find('input').type(HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
      apiKeysPage.findFilterSearchButton().click();
      apiKeysPage.getRow(`maas-api-key-${uuid}`).findKebabAction('Revoke API key').click();

      revokeAPIKeyModal.shouldBeOpen();
      revokeAPIKeyModal.findRevokeButton().should('be.disabled');
      revokeAPIKeyModal.findRevokeConfirmationInput().clear().type(`maas-api-key-${uuid}`);
      revokeAPIKeyModal.findRevokeButton().should('be.enabled');
      revokeAPIKeyModal.findRevokeButton().click();

      cy.step('Try and inference with the model using the revoked API key');
      cy.get<string>('@maasApiKeyToken').then((revokedToken) =>
        cy.get<string>('@resourceName').then((resourceName) =>
          verifyMaaSModelInferencing(resourceName, projectName, revokedToken).then(
            ({ response }) => {
              expect(response.status).to.equal(403);
              cy.log(`❌ Inference with the model using the revoked API key failed`);
              cy.log(`Response status: ${response.status}`);
              cy.log(`Response body: ${JSON.stringify(response.body)}`);
            },
          ),
        ),
      );
    },
  );
});
