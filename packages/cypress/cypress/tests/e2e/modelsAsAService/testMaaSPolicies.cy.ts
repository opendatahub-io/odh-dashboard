import {
  checkMaaSSubscriptionState,
  checkMaaSAuthPolicyState,
  cleanupAuthPolicy,
  cleanupSubscription,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSModelRef,
} from '../../../utils/oc_commands/maas';
import { verifyMaasModelExistsForUser } from '../../../utils/maasApiKeyClipboardInference';
import {
  addUserToProject,
  deleteOpenShiftProject,
  verifyOpenShiftProjectExists,
} from '../../../utils/oc_commands/project';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { retryableBefore } from '../../../utils/retryableHooks';
import { createCleanProject } from '../../../utils/projectChecker';
import {
  addModelsToSubscriptionModal,
  createApiKeyModal,
  apiKeysPage,
  createSubscriptionPage,
  editRateLimitsModal,
  copyApiKeyModal,
  subscriptionsPage,
  authPoliciesPage,
  viewAuthPolicyPage,
  policyPage,
  deleteAuthPolicyModal,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelAsAServiceTestData, DataConnectionUriReplacements } from '../../../types';
import { loadMaaSFixture } from '../../../utils/dataLoader';
import { createDataConnectionUri } from '../../../utils/oc_commands/dataConnection';
import { checkLLMInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { stubClipboard, getClipboardContent } from '../../../utils/clipboardUtils';

const uuid = generateTestUUID();
let testData: ModelAsAServiceTestData;
let projectName: string;
let modelName: string;
let llmInferenceserviceYamlFixturePath: string;
let modelURI: string;
let subscriptionName: string;
let subscriptionDescription: string;
let subscriptionGroups: string[];
let tokenRateLimit: { limit: number; window: string; unit: string };
let policiesName: string;
let policiesDescription: string;
let apiKeyName: string;
let apiKeyExpirationTime: string;

describe('A admin can create a MaaS policy and acess maas model endpoint', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadMaaSFixture('e2e/modelsAsService/testMaaSPolicies.yaml')
      .then((fixtureData: ModelAsAServiceTestData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelName}-${uuid}`;
        llmInferenceserviceYamlFixturePath =
          'resources/modelsAsService/llmInferenceserviceWithMaasEnabled.yaml';
        modelURI = testData.modelLocationURI;
        policiesName = `${testData.policiesName}-${uuid}`;
        policiesDescription = testData.policiesDescription;
        subscriptionName = `${testData.subscriptionName}-${uuid}`;
        subscriptionDescription = `${testData.subscriptionDescription}`;
        subscriptionGroups = testData.subscriptionGroups;
        tokenRateLimit = testData.tokenRateLimit;
        apiKeyName = `${subscriptionName}-api-key`;
        apiKeyExpirationTime = testData.apiKeyExpirationTime;

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
        cy.log('Create LLMInferenceService with MaaS enabled and create MaaSModelRef');
        const dataConnectionReplacements: DataConnectionUriReplacements = {
          NAMESPACE: projectName,
          MODEL_URI: Buffer.from(modelURI).toString('base64'),
          CONNECTION_NAME: `${modelName}-connection`,
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
      });
  });

  after(() => {
    cy.log(`Cleaning up Auth Policy: ${policiesName}`);
    cleanupAuthPolicy(policiesName, 'models-as-a-service');
    cy.log(`Cleaning up Subscription: ${subscriptionName}`);
    cleanupSubscription(subscriptionName, 'models-as-a-service');
    cleanupAuthPolicy(`${subscriptionName}-policy`, 'models-as-a-service');
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });
  it(
    ' Verify policy create, View, Edit and  Delete Operations',
    {
      tags: ['@Smoke', '@SmokeSet4', '@Dashboard', '@MaaS'],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Create new Authorization Policy ');
      authPoliciesPage.visit();
      authPoliciesPage.findCreateAuthPolicyButton().click();
      policyPage.findDisplayNameInput().type(policiesName);
      policyPage.findDescriptionInput().type(policiesDescription);
      policyPage.selectGroup(testData.policiesGroups[0]);
      policyPage.findAddModelsButton().click();

      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findFilterInput().type(modelName);
      addModelsToSubscriptionModal.findRows().should('have.length', 1);
      addModelsToSubscriptionModal.findToggleModelButton(modelName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();
      policyPage.findModelsTable().should('contain.text', modelName);

      policyPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the authorization policy exists on the cluster');
      cy.then(() => {
        checkMaaSAuthPolicyState(policiesName);
      });

      authPoliciesPage.findKeywordFilterInput().type(policiesName);
      authPoliciesPage.findRows().should('have.length', 1);
      let policyRow = authPoliciesPage.getRow(policiesName);
      policyRow.findName().should('contain.text', policiesName);
      policyRow.findDescription().should('contain.text', policiesDescription);
      policyRow.findGroups().should('contain.text', '1 Group');
      policyRow.findModels().should('contain.text', `${testData.policiesModelsCount} Model`);
      policyRow.findActionsToggle().click();
      policyRow.findViewDetailsActionButton().should('be.visible');
      policyRow.findEditActionButton().should('be.visible');
      policyRow.findDeleteActionButton().should('be.visible');

      cy.step(' View the authorization policy details');
      policyRow.findViewDetailsActionButton().should('be.visible').click();
      viewAuthPolicyPage.findBreadcrumbPoliciesLink().should('be.visible').click();
      policyRow.findTitleButton().click();
      viewAuthPolicyPage.findTitle().should('contain.text', policiesName);
      viewAuthPolicyPage.findDetailsSection().should('contain.text', policiesName);
      viewAuthPolicyPage.findDetailsSection().should('contain.text', policiesDescription);
      viewAuthPolicyPage.findGroupsSection().should('contain.text', testData.policiesGroups[0]);
      viewAuthPolicyPage.findModelsSection().should('contain.text', modelName);

      cy.step('Edit the authorization policy');
      viewAuthPolicyPage.findActionsToggle().click();
      viewAuthPolicyPage.findDeleteActionButton().should('be.visible');
      viewAuthPolicyPage.findEditActionButton().click();

      policyPage.findDisplayNameInput().type(`${policiesName}-edited`);
      policyPage.findDescriptionInput().type(`${policiesDescription}-edited`);
      policyPage.selectGroup(testData.policiesGroups[1]);
      policyPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findCancelButton().click();
      policyPage.findSubmitButton().click();

      cy.step('Verify the authorization policy is updated');
      policyRow = authPoliciesPage.getRow(policiesName);
      policyRow.findTitleButton().should('contain.text', `${policiesName}-edited`);
      policyRow.findDescription().should('contain.text', `${policiesDescription}-edited`);
      policyRow.findGroups().should('contain.text', '2 Groups');
      policyRow.findModels().should('contain.text', '1 Model');

      cy.step('Delete the authorization policy');
      policyRow.findActionsToggle().click();
      policyRow.findDeleteActionButton().click();
      deleteAuthPolicyModal.findInput().type(policiesName);
      deleteAuthPolicyModal.findSubmitButton().click();

      cy.step('Verify the authorization policy is deleted');
      cy.then(() => {
        checkMaaSAuthPolicyState(policiesName, 'models-as-a-service', { expectDeleted: true });
      });
    },
  );

  it(
    'Verify auth policy group removal revokes model access',
    {
      tags: ['@Smoke', '@SmokeSet4', '@Dashboard', '@MaaS'],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Create a new MaaS subscription with Authorization Policy ');
      subscriptionsPage.visit();
      subscriptionsPage.findCreateSubscriptionButton().click();
      createSubscriptionPage.findDisplayNameInput().clear().type(subscriptionName);
      createSubscriptionPage.findDescriptionInput().clear().type(subscriptionDescription);
      createSubscriptionPage.findPriorityInput().should('not.have.value', '');
      createSubscriptionPage.findPriorityInput().should('be.visible').invoke('val').as('priority');
      createSubscriptionPage.selectCustomGroup(subscriptionGroups[0]);
      createSubscriptionPage.selectCustomGroup(subscriptionGroups[1]);

      // Add a model to the subscription
      createSubscriptionPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findToggleModelButton(modelName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();

      // Edit token rate limits for the added model
      createSubscriptionPage.addTokenRateLimit(0);
      editRateLimitsModal.shouldBeOpen();
      editRateLimitsModal.findCountInput(0).clear();
      editRateLimitsModal.findCountInput(0).type(tokenRateLimit.limit.toString());
      editRateLimitsModal.findTimeInput(0).clear();
      editRateLimitsModal.findTimeInput(0).type(tokenRateLimit.window);
      editRateLimitsModal.selectUnit(0, tokenRateLimit.unit);
      editRateLimitsModal.findSaveButton().click();

      // Verify the auth policy checkbox is checked by default
      createSubscriptionPage.findAuthPolicyCheckbox().should('be.checked');

      // Submit the form
      createSubscriptionPage.findCreateButton().should('be.enabled');
      createSubscriptionPage.findCreateButton().click();

      cy.step('Verify the subscription exists on the cluster');
      cy.then(() => {
        checkMaaSSubscriptionState(subscriptionName);
      });

      cy.step('Verify the policy is visble in policies page');
      authPoliciesPage.visit();
      authPoliciesPage.findKeywordFilterInput().type(subscriptionName);
      authPoliciesPage.findRows().should('have.length', 1);
      authPoliciesPage.getFirstRowPolicyName().as('policiesName');
      policiesDescription = `Auth policy created for subscription "${subscriptionName}"`;

      cy.get('@policiesName').then((policyName) => {
        policiesName = String(policyName);
        const policyRow = authPoliciesPage.getRow(policiesName);
        policyRow.findActionsToggle().click();
        policyRow.findViewDetailsActionButton().click();

        viewAuthPolicyPage.findTitle().should('contain.text', policiesName);
        viewAuthPolicyPage.findDetailsSection().should('contain.text', policiesName);
        viewAuthPolicyPage.findDetailsSection().should('contain.text', policiesDescription);
        viewAuthPolicyPage.findGroupsSection().should('contain.text', testData.policiesGroups[0]);
        viewAuthPolicyPage.findModelsSection().should('contain.text', modelName);

        cy.step('Verify the authorization policy exists on the cluster');
        cy.then(() => {
          checkMaaSAuthPolicyState(policiesName);
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
      createApiKeyModal.findCustomDaysInput().type(apiKeyExpirationTime);
      createApiKeyModal.findSubmitButton().should('be.enabled');
      createApiKeyModal.findSubmitButton().click();

      cy.step('Read the API key from the success dialog');
      copyApiKeyModal.shouldBeOpen();
      stubClipboard('copiedApiKey');
      copyApiKeyModal.findApiKeyTokenCopyButton().click();
      getClipboardContent('copiedApiKey').then((apiKeys: string[]) => {
        expect(apiKeys).to.have.length.at.least(1);
        copyApiKeyModal.findCloseButton().click();

        cy.step('Verify the model is accessible to the user');
        verifyMaasModelExistsForUser(modelName, apiKeys[0], true);

        cy.step(' Remove group from the policy');
        authPoliciesPage.visit();
        cy.get('@policiesName').then((policyName) => {
          policiesName = String(policyName);
          authPoliciesPage.findKeywordFilterInput().clear().type(policiesName);
          authPoliciesPage.findRows().should('have.length', 1);
          const policyRow = authPoliciesPage.getRow(policiesName);
          policyRow.findActionsToggle().click();
          policyRow.findEditActionButton().click();
          policyPage.selectGroup(testData.policiesGroups[0]);
          policyPage.findSubmitButton().click();
        });

        cy.step('Verify the model is not accessible to the user');
        verifyMaasModelExistsForUser(modelName, apiKeys[0], false);
      });
    },
  );
});
