import {
  checkMaaSSubscriptionState,
  checkMaaSAuthPolicyState,
  cleanupAuthPolicy,
  cleanupSubscription,
  cleanupApiKeys,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSModelRef,
  modelsAsAServiceNamespace,
  createMaaSAuthPolicy,
  createMaaSSubscription,
} from '../../../utils/oc_commands/maas';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { retryableBefore } from '../../../utils/retryableHooks';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  createApiKeyModal,
  apiKeysPage,
  copyApiKeyModal,
  subscriptionsTab,
  mySubscriptionsPage,
  revokeAPIKeyModal,
  bulkRevokeAPIKeyModal,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelAsAServiceTestData, DataConnectionUriReplacements } from '../../../types';
import { ApiKeyStatus } from '../../../types';
import { loadMaaSFixture } from '../../../utils/dataLoader';
import { createDataConnectionUri } from '../../../utils/oc_commands/dataConnection';
import { checkLLMInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { formatApiKeyDisplayDate, formatApiKeyExpirationDate } from '../../../utils/dateUtils';

const uuid = generateTestUUID();
let testData: ModelAsAServiceTestData;
let projectName: string;
let modelName: string;
let llmInferenceserviceYamlFixturePath: string;
let modelURI: string;
let subscriptionName: string;
let subscriptionDescription: string;
let policiesName: string;
let apiKeyName: string;
let apiKeyExpirationTime: string;
let apiKeyExpirationTimeId: string;
let phase: string;
let tokenRateLimit: { limit: string; window: string; unit: string };
let tokenLimit: string;
let apiKeyCount: number;
let secondApiKeyName: string;
const keyCreatedAt = new Date();

describe('A user can view subscriptions and manage API keys on the Keys and Subscriptions page', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadMaaSFixture('e2e/modelsAsService/testApiKeys.yaml')
      .then((fixtureData: ModelAsAServiceTestData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelName}-${uuid}`;
        llmInferenceserviceYamlFixturePath =
          'resources/modelsAsService/llmInferenceserviceWithMaasEnabled.yaml';
        modelURI = testData.modelLocationURI;
        subscriptionName = `${testData.subscriptionName}-${uuid}`;
        subscriptionDescription = `${testData.subscriptionDescription}`;
        policiesName = `${testData.policiesName}-${uuid}`;
        phase = testData.phase;
        apiKeyName = `${testData.apiKeyName}-${uuid}`;
        secondApiKeyName = `${apiKeyName}-2`;
        apiKeyExpirationTime = testData.apiKeyExpirationTime;
        apiKeyExpirationTimeId = testData.apiKeyExpirationTimeId;
        tokenRateLimit = testData.tokenRateLimit;
        tokenLimit = `${tokenRateLimit.limit} / ${tokenRateLimit.window} ${tokenRateLimit.unit}`;
        apiKeyCount = testData.apiKeyCount;
        cy.log(`Loaded project name: ${projectName}`);
        ensureAdminOcSession();
        cleanupApiKeys(apiKeyName);
        cleanupApiKeys(secondApiKeyName);
        createCleanProject(projectName);
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log('Create LLMInferenceService with MaaS enabled and create MaaSModelRef');
        const dataConnectionReplacements: DataConnectionUriReplacements = {
          NAMESPACE: projectName,
          MODEL_URI: Buffer.from(modelURI).toString('base64'),
          CONNECTION_NAME: `${modelName}${testData.connectionNameSuffix}`,
        };
        createDataConnectionUri(dataConnectionReplacements);
        createLLMInferenceServiceWithMaaSEnabled(
          projectName,
          modelName,
          dataConnectionReplacements.CONNECTION_NAME,
          llmInferenceserviceYamlFixturePath,
        );
        checkLLMInferenceServiceState(modelName, projectName, { checkReady: true });
        createMaaSModelRef(projectName, modelName);
      })
      .then(() => {
        ensureAdminOcSession();
        cy.log('Create a MaaS subscription with Authorization Policy that has user access ');
        createMaaSSubscription(subscriptionName, subscriptionDescription, projectName, modelName);
        checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, { phase });
        createMaaSAuthPolicy(policiesName, projectName, modelName);
        checkMaaSAuthPolicyState(policiesName, modelsAsAServiceNamespace, { phase });
      });
  });

  after(() => {
    ensureAdminOcSession();
    cy.log(`Cleaning up Subscription: ${subscriptionName}`);
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(policiesName, modelsAsAServiceNamespace);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
    cleanupApiKeys(apiKeyName);
    cleanupApiKeys(secondApiKeyName);
  });
  it(
    'Verify subscriptions tab, API keys, filtering, and revoke all keys for a user',
    {
      tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaS', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application as user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step(
        'Verify the admin-created subscription is visible on the Subscriptions tab for the user',
      );
      apiKeysPage.visitKeysAndSubsWithoutLogin();
      apiKeysPage.findSubscriptionsTab().click();
      subscriptionsTab.findSortBySubscriptionButton().click();
      subscriptionsTab.findSearchInput().type(subscriptionName);
      subscriptionsTab
        .findSubscriptionRows()
        .should('have.length', 1)
        .and('contain.text', subscriptionName)
        .and('contain.text', apiKeyCount);
      subscriptionsTab.expandSubscriptionRow(0);
      subscriptionsTab
        .findSubscriptionsTable()
        .should('contain.text', modelName)
        .and('contain.text', tokenLimit);
      subscriptionsTab.findSortByModelButton().click();
      subscriptionsTab.findSearchInput().clear().type(modelName);
      subscriptionsTab.findModelGroupRows().should('have.length', 1).and('contain.text', modelName);
      subscriptionsTab.expandModelGroupRow(0);
      subscriptionsTab
        .findModelsTable()
        .should('contain.text', subscriptionName)
        .and('contain.text', apiKeyCount)
        .and('contain.text', tokenLimit);

      cy.step('Verify the subscription details page and create an API key');
      subscriptionsTab.findSubscriptionDetailLink(subscriptionName).click();
      mySubscriptionsPage.findTitle().should('contain.text', subscriptionName);
      mySubscriptionsPage
        .findDetailsSection()
        .should('contain.text', subscriptionName)
        .and('contain.text', subscriptionDescription);
      mySubscriptionsPage
        .findModelsSection()
        .should('contain.text', modelName)
        .and('contain.text', tokenLimit);
      mySubscriptionsPage.findApiKeyEmptyState().should('exist');

      cy.step('Create an API key in the Subscription detail page.');
      mySubscriptionsPage.findCreateApiKeyButton().click();
      createApiKeyModal.shouldBeOpen();
      createApiKeyModal.findNameInput().type(apiKeyName);
      createApiKeyModal
        .findDescriptionInput()
        .type(`${testData.apiKeyDescription} ${subscriptionName}`);
      createApiKeyModal.findSubscriptionCombobox().should('have.value', subscriptionName);
      createApiKeyModal
        .findSubscriptionModelRateLimit(modelName)
        .should('contain.text', tokenLimit);
      createApiKeyModal
        .findExpirationToggle()
        .should('contain.text', testData.apiKeyExpirationTime);
      createApiKeyModal.findSubmitButton().click();
      copyApiKeyModal.findApiKeyName().should('contain.text', apiKeyName);
      copyApiKeyModal.findSubscriptionName().should('contain.text', subscriptionName);
      copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', apiKeyExpirationTime);
      copyApiKeyModal.findCloseButton().click();
      apiKeyCount++;

      cy.step('Verify the API key is created in the Subscription detail page.');
      mySubscriptionsPage.findApiKeysTable().should('exist');
      const apiKeyRow = mySubscriptionsPage.getRow(apiKeyName);
      apiKeyRow
        .findDescription()
        .should('contain.text', `${testData.apiKeyDescription} ${subscriptionName}`);
      apiKeyRow.findStatus().should('contain.text', ApiKeyStatus.active);
      apiKeyRow.findCreationDate().should('contain.text', formatApiKeyDisplayDate(keyCreatedAt));
      apiKeyRow.findLastUsedAt().should('not.be.empty');
      apiKeyRow
        .findExpirationDate()
        .should('contain.text', formatApiKeyExpirationDate(apiKeyExpirationTimeId, keyCreatedAt));

      cy.step('Verify active key counts is updated in the Subscriptions tab');
      mySubscriptionsPage.findMySubscriptionsLink().click();
      subscriptionsTab.findSortBySubscriptionButton().click();
      subscriptionsTab.findSearchInput().type(subscriptionName);
      subscriptionsTab
        .findSubscriptionRows()
        .should('have.length', 1)
        .and('contain.text', subscriptionName)
        .and('contain.text', apiKeyCount);
      subscriptionsTab.findSubscriptionDetailLink(subscriptionName).click();

      cy.step('Revoke the API key and verify active key counts update');
      apiKeyRow.findRevokeButton().click();
      revokeAPIKeyModal.findRevokeConfirmationInput().clear().type(apiKeyName);
      revokeAPIKeyModal.findRevokeButton().click();
      apiKeyCount--;
      mySubscriptionsPage.findMySubscriptionsLink().click();
      subscriptionsTab.findSortByModelButton().click();
      subscriptionsTab.findSearchInput().type(modelName);
      subscriptionsTab.expandModelGroupRow(0);
      subscriptionsTab.findModelsTable().should('contain.text', apiKeyCount);

      cy.step('Filter revoked keys on the API Keys tab and navigate to subscription details');
      apiKeysPage.findApiKeysTab().click();
      apiKeysPage.findRows().should('not.contain.text', apiKeyName);
      apiKeysPage.findStatusFilterToggle().click();
      apiKeysPage.findStatusFilterOption(ApiKeyStatus.revoked).click();
      apiKeysPage.findSubscriptionFilterToggle().click();
      apiKeysPage.findSubscriptionFilterOption(subscriptionName).click();
      apiKeysPage.findRows().should('contain.text', apiKeyName);
      const apiKeyRow1 = apiKeysPage.getRow(apiKeyName);
      apiKeyRow1.findSubscriptionDetailLink().click();
      mySubscriptionsPage
        .findDetailsSection()
        .should('exist')
        .and('contain.text', subscriptionName);

      cy.step('Create a second API key with expiration validation and revoke all keys');
      apiKeysPage.visitKeysAndSubsWithoutLogin();
      apiKeysPage.findCreateApiKeyButton().click();
      createApiKeyModal.findNameInput().type(secondApiKeyName);
      createApiKeyModal
        .findDescriptionInput()
        .type(`Cypress test: API key for ${subscriptionName}`);
      createApiKeyModal.findSubscriptionToggle().click();
      createApiKeyModal.findSubscriptionOption(subscriptionName).click();
      createApiKeyModal
        .findSubscriptionModelRateLimit(modelName)
        .should('contain.text', tokenLimit);
      createApiKeyModal.findExpirationToggle().click();
      createApiKeyModal.findExpirationOption(testData.apiKeyExpirationTimeInvalid).click();
      createApiKeyModal.findSubmitButton().click();
      createApiKeyModal.findErrorAlert().should('exist');
      createApiKeyModal.findExpirationToggle().click();
      createApiKeyModal.findExpirationOption(apiKeyExpirationTimeId).click();
      createApiKeyModal.findSubmitButton().click();

      copyApiKeyModal.shouldBeOpen();
      copyApiKeyModal.findApiKeyName().should('contain.text', secondApiKeyName);
      copyApiKeyModal.findSubscriptionName().should('contain.text', subscriptionName);
      copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', apiKeyExpirationTime);
      copyApiKeyModal.findCloseButton().click();
      apiKeysPage.findRows().should('contain.text', secondApiKeyName);

      cy.step('Revoke all UserAPI keys');
      apiKeysPage.findActionsToggle().click();
      apiKeysPage.findRevokeAllAPIKeysAction().click();
      bulkRevokeAPIKeyModal
        .findRevokeConfirmationInput()
        .clear()
        .type(LDAP_CONTRIBUTOR_USER.USERNAME);
      bulkRevokeAPIKeyModal.findRevokeButton().click();
      apiKeysPage.findRows().should('not.contain.text', secondApiKeyName);
      apiKeysPage.findStatusFilterToggle().click();
      apiKeysPage.findStatusFilterOption(ApiKeyStatus.revoked).click();
      apiKeysPage
        .getRow(secondApiKeyName)
        .findStatus()
        .should('contain.text', ApiKeyStatus.revoked);
    },
  );
});
