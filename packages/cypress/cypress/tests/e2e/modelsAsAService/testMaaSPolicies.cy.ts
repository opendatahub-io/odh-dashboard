import {
  checkMaaSSubscriptionState,
  checkMaaSAuthPolicyState,
  cleanupAuthPolicy,
  cleanupSubscription,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSModelRef,
  modelsAsAServiceNamespace,
} from '../../../utils/oc_commands/maas';
import { verifyMaasModelExistsForUser } from '../../../utils/maasApiKeyClipboardInference';
import {
  addUserToProject,
  deleteOpenShiftProject,
  verifyOpenShiftProjectExists,
} from '../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
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
  adminBulkRevokeAPIKeyModal,
} from '../../../pages/modelsAsAService';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelAsAServiceTestData, DataConnectionUriReplacements } from '../../../types';
import { loadMaaSFixture } from '../../../utils/dataLoader';
import { createDataConnectionUri } from '../../../utils/oc_commands/dataConnection';
import { checkLLMInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { stubClipboard, getClipboardContent } from '../../../utils/clipboardUtils';

const capitalize = (input: string): string => input.charAt(0).toUpperCase() + input.slice(1);

const uuid = generateTestUUID();
let testData: ModelAsAServiceTestData;
let projectName: string;
let modelName: string;
let llmInferenceserviceYamlFixturePath: string;
let modelURI: string;
let subscriptionName: string;
let subscriptionDescription: string;
let subscriptionGroups: string[];
let tokenRateLimit: { limit: string; window: string; unit: string };
let policiesName: string;
let policiesDescription: string;
let apiKeyName: string;
let apiKeyExpirationTime: string;
let activeApiKeyStatus: { active: string; expired: string; revoked: string };
let policiesModelsCount: number;
let policiesGroupsCount: number;
let phase: string;
let tokenLimit: string;
const today = new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
let expiryDate: string;

describe('An admin can manage MaaS authorization policies and control model access via group membership', () => {
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
        phase = testData.phase;
        tokenRateLimit = testData.tokenRateLimit;
        tokenLimit = `${tokenRateLimit.limit} / ${tokenRateLimit.window} ${tokenRateLimit.unit}`;
        apiKeyName = `${subscriptionName}-api-key`;
        apiKeyExpirationTime = testData.apiKeyExpirationTime;
        activeApiKeyStatus = testData.apiKeyStatus;
        expiryDate = new Date(
          new Date().setDate(new Date().getDate() + parseInt(apiKeyExpirationTime, 10)),
        ).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
    cleanupAuthPolicy(policiesName, modelsAsAServiceNamespace);
    cy.log(`Cleaning up Subscription: ${subscriptionName}`);
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(`${subscriptionName}-policy`, modelsAsAServiceNamespace);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });
  it(
    ' Verify Authorization Policy Create, View, Edit and  Delete Operations',
    {
      tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaS', '@NonConcurrent'],
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
      policiesGroupsCount = 1;

      policyPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findFilterInput().type(modelName);
      addModelsToSubscriptionModal.findRows().should('have.length', 1);
      addModelsToSubscriptionModal.findToggleModelButton(modelName).click();
      addModelsToSubscriptionModal.findConfirmButton().click();
      policyPage.findModelsTable().should('contain.text', modelName);
      policiesModelsCount = 1;
      policyPage.findSubmitButton().click();

      cy.step('Verify the authorization policy exists on the cluster');
      cy.then(() => {
        checkMaaSAuthPolicyState(policiesName);
      });

      authPoliciesPage.findKeywordFilterInput().type(policiesName);
      let policyRow = authPoliciesPage.getRow(policiesName);
      policyRow.findName().should('contain.text', policiesName);
      policyRow.findDescription().should('contain.text', policiesDescription);
      policyRow.findGroups().should('contain.text', `${policiesGroupsCount} Group`);
      policyRow.findModels().should('contain.text', `${policiesModelsCount} Model`);
      policyRow.findActionsToggle().click();
      policyRow.findViewDetailsActionButton().should('be.visible');
      policyRow.findEditActionButton().should('be.visible');
      policyRow.findDeleteActionButton().should('be.visible');

      cy.step(' View the authorization policy details');
      policyRow.findViewDetailsActionButton().click();
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

      policyPage.findDisplayNameInput().clear().type(`${policiesName}-edited`);
      policyPage.findDescriptionInput().clear().type(`${policiesDescription}-edited`);
      policyPage.selectGroup(testData.policiesGroups[1]);
      policiesGroupsCount = 2;
      policyPage.findAddModelsButton().click();
      addModelsToSubscriptionModal.shouldBeOpen();
      addModelsToSubscriptionModal.findTable().should('exist');
      addModelsToSubscriptionModal.findCancelButton().click();
      policyPage.findSubmitButton().click();

      cy.step('Verify the authorization policy is updated');
      policyRow = authPoliciesPage.getRow(policiesName);
      policyRow.findTitleButton().should('contain.text', `${policiesName}-edited`);
      policyRow.findDescription().should('contain.text', `${policiesDescription}-edited`);
      policyRow.findGroups().should('contain.text', `${policiesGroupsCount} Group`);
      policyRow.findModels().should('contain.text', `${testData.policiesModelsCount} Model`);

      cy.step('Delete the authorization policy');
      policyRow.findActionsToggle().click();
      policyRow.findDeleteActionButton().click();
      deleteAuthPolicyModal.findInput().type(policiesName);
      deleteAuthPolicyModal.findSubmitButton().click();

      cy.step('Verify the authorization policy is deleted');
      cy.then(() => {
        checkMaaSAuthPolicyState(policiesName, modelsAsAServiceNamespace, { expectDeleted: true });
      });
    },
  );

  it(
    'Verify auth policy group removal revokes model access',
    {
      tags: ['@Smoke', '@SmokeSet5', '@Dashboard', '@MaaSCI', '@NonConcurrent'],
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
      editRateLimitsModal.findUnitDropdown(0).click();
      cy.findByText(tokenRateLimit.unit).should('be.visible').click();
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
        viewAuthPolicyPage.findGroupsSection().should('contain.text', testData.policiesGroups[1]);
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
      createApiKeyModal.findSubscriptionToggle().click().type(subscriptionName);
      createApiKeyModal.findSubscriptionOption(subscriptionName).click();
      createApiKeyModal
        .findSubscriptionModelRateLimit(modelName)
        .should('contain.text', tokenLimit);
      createApiKeyModal.findExpirationToggle().click();
      createApiKeyModal.findExpirationOption('custom').click();
      createApiKeyModal.findCustomDaysInput().clear().type(apiKeyExpirationTime);
      createApiKeyModal.findSubmitButton().should('be.enabled');
      createApiKeyModal.findSubmitButton().click();

      cy.step('Read the API key from the success dialog');
      copyApiKeyModal.shouldBeOpen();
      stubClipboard('copiedApiKey');
      copyApiKeyModal.findApiKeyTokenCopyButton().click();
      getClipboardContent('copiedApiKey').then((apiKeys: string[]) => {
        expect(apiKeys).to.have.length.at.least(1);
        copyApiKeyModal.findCloseButton().click();

        cy.step('Verify the API key is created');
        apiKeysPage.findRows().should('contain.text', apiKeyName);
        let apiKeyRow = apiKeysPage.getRow(apiKeyName);
        apiKeyRow
          .findDescription()
          .should('contain.text', `Cypress test: API key for ${subscriptionName}`);
        apiKeyRow.findStatus().should('contain.text', phase);
        apiKeyRow.findSubscription().should('contain.text', subscriptionName);
        apiKeyRow.findOwner().should('contain.text', LDAP_ADMIN_USER.USERNAME);
        apiKeyRow.findCreationDate().should('contain.text', today);
        apiKeyRow.findExpirationDate().should('contain.text', expiryDate);

        cy.step('Verify the model is accessible to the user');
        verifyMaasModelExistsForUser(modelName, apiKeys[0], true)
          .then(() => {
            cy.step(' Remove group from the policy');
            authPoliciesPage.visit();
            cy.get('@policiesName').then((policyName) => {
              policiesName = String(policyName);
              authPoliciesPage.findKeywordFilterInput().type(policiesName);
              authPoliciesPage.findRows().should('have.length', 1);
              const policyRow = authPoliciesPage.getRow(policiesName);
              policyRow.findActionsToggle().click();
              policyRow.findEditActionButton().click();
              // remove the selected group
              policyPage.selectGroup(testData.policiesGroups[0]);
              policyPage.findSubmitButton().click();
            });
            cy.then(() => {
              checkMaaSAuthPolicyState(policiesName, modelsAsAServiceNamespace, {
                groups: [testData.policiesGroups[1]],
              });
            });
          })
          .then(() => {
            cy.step('Verify the model is not accessible to the user');
            return verifyMaasModelExistsForUser(modelName, apiKeys[0], false);
          });

        cy.step('Revoke the API key');
        apiKeysPage.visit();
        apiKeysPage.findActionsToggle().click();
        apiKeysPage.findRevokeAllAPIKeysActionButton().click();
        adminBulkRevokeAPIKeyModal.shouldBeOpen();
        adminBulkRevokeAPIKeyModal.findUsernameInput().type(HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
        adminBulkRevokeAPIKeyModal.findSearchButton().click();
        adminBulkRevokeAPIKeyModal.findNoKeysAlert().should('exist');
        adminBulkRevokeAPIKeyModal.findUsernameInput().clear().type(LDAP_ADMIN_USER.USERNAME);
        adminBulkRevokeAPIKeyModal.findSearchButton().click();
        adminBulkRevokeAPIKeyModal.findKeysFoundHeading().should('exist');
        adminBulkRevokeAPIKeyModal.findRevokeButton().click();

        apiKeysPage.findStatusFilterToggle().click();
        apiKeysPage.findStatusFilterOptionCheckbox(activeApiKeyStatus.active).should('be.checked');
        apiKeysPage.findStatusFilterOptionCheckbox(activeApiKeyStatus.revoked).click();
        apiKeyRow = apiKeysPage.getRow(apiKeyName);
        apiKeyRow.findStatus().should('contain.text', capitalize(activeApiKeyStatus.revoked));
        apiKeyRow.findLastUsedAt().should('contain.text', today);
        apiKeysPage.findRevokeActionsButton(apiKeyName).should('be.disabled');
      });
    },
  );
});
