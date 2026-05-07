import {
  ModelLocationSelectOption,
  ModelTypeLabel,
} from '@odh-dashboard/model-serving/types/form-data';
import {
  checkMaaSSubscriptionState,
  cleanupAuthPolicy,
  cleanupSubscription,
} from '../../../utils/oc_commands/maas';
import {
  stubClipboardWriteTextForApiKeyModal,
  verifyMaaSModelInferenceUsingCopiedApiKeyFromModal,
  verifyMaaSModelInferenceUsingRevokedApiKey,
} from '../../../utils/maasApiKeyClipboardInference';
import {
  addUserToProject,
  deleteOpenShiftProject,
  verifyOpenShiftProjectExists,
} from '../../../utils/oc_commands/project';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectDetails, projectListPage } from '../../../pages/projects';
import { retryableBefore } from '../../../utils/retryableHooks';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../pages/modelServing';
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
  viewSubscriptionPage,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { DataScienceProjectData } from '../../../types';
import { loadDSPFixture } from '../../../utils/dataLoader';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../utils/oc_commands/hardwareProfiles';
import {
  createCleanLLMInferenceServiceConfig,
  cleanupLLMInferenceServiceConfig,
  checkLLMInferenceServiceConfigState,
} from '../../../utils/oc_commands/llmInferenceServiceConfig';
import { checkLLMInferenceServiceState } from '../../../utils/oc_commands/modelServing';

let testData: DataScienceProjectData;
let projectName: string;
let resourceName: string;
let modelName: string;
let subscriptionDescription: string;
let subscriptionPriority: number;
let secondSubscriptionPriority: number;
let subscriptionGroups: string[];
let subscriptionName: string;
let tokenRateLimit: { limit: number; window: string };
const uuid = generateTestUUID();
let apiKeyName: string;
let hardwareProfileResourceName: string;
let modelURI: string;
let llmInferenceServiceConfigName: string;
let llmInferenceServiceConfigDisplayName: string;
const llmInferenceServiceConfigYamlPath =
  'resources/modelServing/llmd-inference-service-config.yaml';
let llmInferenceServiceConfigContainerImage: string;

describe('A model can be deployed and accessed with a MaaS subscription and API key', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testMaaSSubscriptions.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelName}-maassubs-${uuid}`;
        llmInferenceServiceConfigName = testData.llmInferenceServiceConfigName;
        llmInferenceServiceConfigDisplayName = testData.llmInferenceServiceConfigDisplayName;
        llmInferenceServiceConfigContainerImage = testData.llmInferenceServiceConfigContainerImage;
        modelURI = testData.modelLocationURI;
        hardwareProfileResourceName = `${testData.hardwareProfileName}`;
        subscriptionName = `${testData.subscriptionName}-${uuid}`;
        subscriptionDescription = 'This is a test MaaS subscription';
        subscriptionPriority = 256;
        secondSubscriptionPriority = subscriptionPriority + 1;
        subscriptionGroups = ['rhods-admins'];
        apiKeyName = `maas-api-key-${uuid}`;
        tokenRateLimit = {
          limit: 1000,
          window: '1000',
        };
        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log(
          `Wait for ${projectName}, then grant ${LDAP_ADMIN_USER.USERNAME} namespace admin (oc created the project as cluster admin; deploy wizard needs secrets)`,
        );
        return verifyOpenShiftProjectExists(projectName).then((exists) => {
          if (!exists) {
            throw new Error(
              `Project ${projectName} not found via oc before RBAC; cannot add ${LDAP_ADMIN_USER.USERNAME}`,
            );
          }
          return addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
        });
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
    cy.log(`Cleaning up Subscription: ${subscriptionName}`);
    cleanupSubscription(subscriptionName, 'models-as-a-service');
    cy.log(`Just in case, cleaning up second subscription: ${subscriptionName}-2`);
    cleanupSubscription(`${subscriptionName}-2`, 'models-as-a-service');

    cy.log(`Cleaning up Auth Policy: ${subscriptionName}-policy`);
    cleanupAuthPolicy(`${subscriptionName}-policy`, 'models-as-a-service');
    cy.log(`Just in case, cleaning up second auth policy: ${subscriptionName}-2-policy`);
    cleanupAuthPolicy(`${subscriptionName}-2-policy`, 'models-as-a-service');
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
      cy.visitWithLogin('/?devFeatureFlags=vLLMDeploymentOnMaaS=true', LDAP_ADMIN_USER);

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Open the deploy model wizard');
      projectDetails.findModelServingTab().click();
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
        .then((val) => {
          resourceName = String(val ?? '');
        });
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

      // Check the MaaS checkbox
      maasWizardField.findSaveAsMaaSCheckbox().click();
      maasWizardField.findSaveAsMaaSCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review and submit');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify the model is available in UI');
      modelServingSection.findModelServerDeployedName(modelName);

      cy.step('Verify LLMInferenceService exists in the project namespace');
      cy.then(() => {
        checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true });
      });

      cy.step('Verify LLMInferenceServiceConfig was copied to the project namespace');
      cy.then(() => {
        checkLLMInferenceServiceConfigState(resourceName, projectName, {
          containerImage: llmInferenceServiceConfigContainerImage,
        });
      });

      cy.step('Create a new MaaS subscription');
      subscriptionsPage.visit();
      subscriptionsPage.findCreateSubscriptionButton().click();
      createSubscriptionPage.findDisplayNameInput().clear().type(subscriptionName);
      createSubscriptionPage.findDescriptionInput().clear().type(subscriptionDescription);
      createSubscriptionPage.findPriorityInput().clear().type(subscriptionPriority.toString());

      createSubscriptionPage.selectCustomGroup(subscriptionGroups[0]);

      // Add a model to the subscription
      createSubscriptionPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton(modelName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();

      // Verify the model appears in the subscription models table
      createSubscriptionPage.findModelsTable().should('exist');
      createSubscriptionPage.findModelsTable().should('contain.text', modelName);

      // Edit token rate limits for the added model
      createSubscriptionPage.addTokenRateLimit(0);
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

      cy.step('Verify the subscription exists on the cluster');
      cy.then(() => {
        checkMaaSSubscriptionState(subscriptionName, 'models-as-a-service');
      });

      cy.step('Verify the subscription is created');
      subscriptionsPage.visit();
      subscriptionsPage.findFilterInput().type(subscriptionName);
      subscriptionsPage.findRows().should('have.length', 1);
      subscriptionsPage.findRows().should('contain.text', subscriptionName);

      cy.step('Create another subscription to test edit and delete');
      subscriptionsPage.findCreateSubscriptionButton().click();
      createSubscriptionPage.findDisplayNameInput().clear().type(`${subscriptionName}-2`);
      createSubscriptionPage.findDescriptionInput().clear().type(`${subscriptionDescription}-2`);
      createSubscriptionPage
        .findPriorityInput()
        .clear()
        .type(secondSubscriptionPriority.toString());
      // Select groups and add a custom one
      createSubscriptionPage.selectCustomGroup(subscriptionGroups[0]);

      // Add a model to the subscription
      createSubscriptionPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton(modelName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();

      // Verify the model appears in the subscription models table
      createSubscriptionPage.findModelsTable().should('exist');
      createSubscriptionPage.findModelsTable().should('contain.text', modelName);

      // Edit token rate limits for the added model
      createSubscriptionPage.addTokenRateLimit(0);
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

      cy.step('Verify the second subscription exists on the cluster');
      cy.then(() => {
        checkMaaSSubscriptionState(`${subscriptionName}-2`, 'models-as-a-service');
      });

      cy.step('Verify the second subscription is created');
      subscriptionsPage.visit();
      subscriptionsPage.findFilterInput().type(`${subscriptionName}-2`);
      subscriptionsPage.findRows().should('have.length', 1);
      subscriptionsPage.findRows().should('contain.text', `${subscriptionName}-2`);

      cy.step('Edit the second subscription');
      editSubscriptionPage.visit(`${subscriptionName}-2`);
      editSubscriptionPage.findNameInput().should('have.value', `${subscriptionName}-2`);
      editSubscriptionPage
        .findPriorityInput()
        .should('have.value', secondSubscriptionPriority.toString());
      editSubscriptionPage.typeCustomGroup('premium-users');
      editSubscriptionPage.findPolicyChangeWarning().should('exist');
      editSubscriptionPage.findPolicyChangeWarning().should('exist');
      editSubscriptionPage.findModelsTable().should('contain.text', modelName);

      editSubscriptionPage
        .findDescriptionInput()
        .clear()
        .type(`Updated - ${subscriptionDescription}`);
      editSubscriptionPage.findSaveButton().click();

      cy.step('Verify the second subscription is updated');
      subscriptionsPage.visit();
      subscriptionsPage.findFilterInput().type(`${subscriptionName}-2`);
      subscriptionsPage.findRows().should('have.length', 1);
      subscriptionsPage.findRows().should('contain.text', `${subscriptionName}-2`);
      subscriptionsPage.findRows().should('contain.text', `Updated - ${subscriptionDescription}`);

      cy.step('Verify the view subscription page');
      subscriptionsPage.findViewDetailsButton(`${subscriptionName}-2`).click();
      cy.url().should('include', `/maas/subscriptions/view/${subscriptionName}-2`);

      viewSubscriptionPage.findTitle().should('contain.text', `${subscriptionName}-2`);

      viewSubscriptionPage
        .findDetailsSection()
        .should('contain.text', `${subscriptionName}-2`)
        .and('contain.text', 'Name')
        .and('contain.text', 'Created');

      viewSubscriptionPage.findGroupsSection().should('exist');
      viewSubscriptionPage.findGroupsTable().should('contain.text', subscriptionGroups);

      viewSubscriptionPage.findModelsSection().should('exist');
      viewSubscriptionPage
        .findModelsTable()
        .should('contain.text', modelName)
        .and('contain.text', projectName)
        .and('contain.text', tokenRateLimit.limit.toString());

      viewSubscriptionPage.findBreadcrumbSubscriptionsLink().click();
      cy.url().should('include', '/maas/subscriptions');

      cy.step('Delete the second subscription');
      subscriptionsPage.findDeleteButton(`${subscriptionName}-2`).click();
      deleteSubscriptionModal.findInput().type(`${subscriptionName}-2`);
      deleteSubscriptionModal.findSubmitButton().click();
      // Sometimes the page isn't refreshing fast enough, reloading for now
      subscriptionsPage.reload();
      subscriptionsPage.findFilterInput().type(`${subscriptionName}-2`);
      subscriptionsPage.findRows().should('have.length', 0);
      subscriptionsPage.findTable().should('not.contain', `${subscriptionName}-2`);

      cy.step('Verify the second subscription is deleted from the cluster');
      cy.then(() => {
        checkMaaSSubscriptionState(`${subscriptionName}-2`, 'models-as-a-service', {
          expectDeleted: true,
        });
      });

      cy.step('Create an API key for the subscription');
      apiKeysPage.visit();
      apiKeysPage.findCreateApiKeyButton().click();
      createApiKeyModal.shouldBeOpen();
      createApiKeyModal.findNameInput().type(apiKeyName);
      createApiKeyModal
        .findDescriptionInput()
        .type(`Cypress test: API key for ${subscriptionName}`);
      createApiKeyModal.findSubscriptionToggle().click();
      createApiKeyModal.findSubscriptionOption(subscriptionName).click();
      createApiKeyModal.findExpirationToggle().click();
      createApiKeyModal.findExpirationOption('custom').click();
      createApiKeyModal.findCustomDaysInput().should('exist');
      createApiKeyModal.findCustomDaysInput().type('1');
      createApiKeyModal.findSubmitButton().should('be.enabled');
      createApiKeyModal.findSubmitButton().click();

      cy.step('Read the API key from the success dialog');
      copyApiKeyModal.shouldBeOpen();
      stubClipboardWriteTextForApiKeyModal();
      copyApiKeyModal.findApiKeyTokenCopyButton().click();
      verifyMaaSModelInferenceUsingCopiedApiKeyFromModal(projectName, () => resourceName);

      cy.step('Revoke the API key');
      copyApiKeyModal.findCloseButton().click();
      apiKeysPage.findColumnSortButton('Name').click();

      // Filter by the admin username to find the API key, there could be a lot of keys
      apiKeysPage.findFilterInput().find('input').type(LDAP_ADMIN_USER.USERNAME);
      apiKeysPage.findFilterSearchButton().click();
      apiKeysPage.findRevokeActionsButton(apiKeyName).click();

      revokeAPIKeyModal.shouldBeOpen();
      revokeAPIKeyModal.findRevokeButton().should('be.disabled');
      revokeAPIKeyModal.findRevokeConfirmationInput().clear().type(apiKeyName);
      revokeAPIKeyModal.findRevokeButton().should('be.enabled');
      revokeAPIKeyModal.findRevokeButton().click();

      cy.step('Try and inference with the model using the revoked API key');
      verifyMaaSModelInferenceUsingRevokedApiKey(projectName, () => resourceName);
    },
  );
});
