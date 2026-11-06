import {
  checkLLMInferenceServiceState,
  cleanupLLMInferenceService,
} from '../../../utils/oc_commands/modelServing';
import {
  checkMaaSAuthPolicyState,
  checkMaaSSubscriptionState,
  cleanupApiKeys,
  cleanupAuthPolicy,
  cleanupSubscription,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSAuthPolicy,
  createMaaSModelRef,
  createMaaSSubscription,
  cleanupMaaSModelRef,
  modelsAsAServiceNamespace,
  waitForMaaSModelReady,
} from '../../../utils/oc_commands/maas';
import { deleteOpenShiftProjectBestEffort } from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { createAndVerifyProject } from '../../../utils/projectChecker';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  apiKeysPage,
  copyApiKeyModal,
  createApiKeyModal,
  revokeAPIKeyModal,
  subscriptionsTab,
} from '../../../pages/modelsAsAService';
import { maasPortalPage } from '../../../pages/maasPortal';
import { MAAS_PORTAL_ADMIN_USER, MAAS_PORTAL_USER } from '../../../utils/e2eUsers';
import { getClipboardContent, stubClipboard } from '../../../utils/clipboardUtils';
import type { UserAuthConfig } from '../../../types';

const testSuffix = `${generateTestUUID()}-${Date.now().toString(36).slice(-5)}`;
const projectName = `portal-e2e-project-${testSuffix}`;
const modelName = `portal-e2e-model-${testSuffix}`;
const subscriptionName = `portal-e2e-sub-${testSuffix}`;
const policyName = `portal-e2e-policy-${testSuffix}`;
const apiKeyName = `portal-e2e-key-${testSuffix}`;
const modelFixture = 'resources/maas/llmInferenceServiceSimulatorPremium.yaml';
const subscriptionFixture = 'resources/maas/MaaSSubscriptionPortal.yaml';
const authPolicyFixture = 'resources/maas/MaaSAuthPolicyPortal.yaml';
const runMaaSPortalE2E = Cypress.env('ENABLE_MAAS_PORTAL_E2E') === 'true';

const getRequiredPortalConfig = (): {
  portalUrl: string;
  organizationId: string;
  userGroups: string[];
  adminUser: UserAuthConfig;
  portalUser: UserAuthConfig;
} => {
  const portalUrl = Cypress.env('MAAS_PORTAL_URL') as string | undefined;
  const organizationId = Cypress.env('MAAS_PORTAL_ORGANIZATION_ID') as string | undefined;
  const userGroups = Cypress.env('MAAS_PORTAL_USER_GROUPS') as string[] | undefined;

  if (!portalUrl) {
    throw new Error('MAAS_PORTAL_URL is not configured in CY_TEST_CONFIG');
  }

  if (!organizationId) {
    throw new Error('MAAS_PORTAL_ORGANIZATION_ID is not configured in CY_TEST_CONFIG');
  }

  if (!userGroups?.length) {
    throw new Error('MAAS_PORTAL_USER_GROUPS is not configured in CY_TEST_CONFIG');
  }

  if (!MAAS_PORTAL_ADMIN_USER) {
    throw new Error('MAAS_PORTAL_ADMIN_USER is not configured in CY_TEST_CONFIG');
  }

  if (!MAAS_PORTAL_USER) {
    throw new Error('MAAS_PORTAL_USER is not configured in CY_TEST_CONFIG');
  }

  return {
    portalUrl,
    organizationId,
    userGroups,
    adminUser: MAAS_PORTAL_ADMIN_USER,
    portalUser: MAAS_PORTAL_USER,
  };
};

describe('MaaS Portal role access and API-key lifecycle', () => {
  const portalTest = runMaaSPortalE2E ? it : it.skip;

  before(() => {
    if (!runMaaSPortalE2E) {
      return;
    }

    const { organizationId, userGroups, adminUser, portalUser } = getRequiredPortalConfig();
    if (userGroups.length !== 2) {
      throw new Error(
        `MAAS_PORTAL_USER_GROUPS must contain exactly 2 groups for the portal fixtures; received ${userGroups.length}`,
      );
    }

    const accessReplacements = {
      MAAS_NAMESPACE: modelsAsAServiceNamespace,
      ORGANIZATION_ID: organizationId,
      USER_GROUP_1: userGroups[0],
      USER_GROUP_2: userGroups[1],
      PORTAL_USER_USERNAME: portalUser.USERNAME,
      PORTAL_ADMIN_USERNAME: adminUser.USERNAME,
    };

    cy.step('Create isolated MaaS resources for the portal test');
    ensureAdminOcSession();
    createAndVerifyProject(projectName);
    createLLMInferenceServiceWithMaaSEnabled(projectName, modelName, modelFixture);
    checkLLMInferenceServiceState(modelName, projectName, { checkReady: true });
    createMaaSModelRef(projectName, modelName);
    createMaaSSubscription(
      subscriptionName,
      'Cypress MaaS Portal test subscription',
      projectName,
      modelName,
      subscriptionFixture,
      accessReplacements,
    );
    createMaaSAuthPolicy(policyName, projectName, modelName, authPolicyFixture, accessReplacements);
    checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, {
      phase: 'Active',
      models: [modelName],
    });
    checkMaaSAuthPolicyState(policyName, modelsAsAServiceNamespace, { phase: 'Active' });
    waitForMaaSModelReady(projectName, modelName);
  });

  after(() => {
    if (!runMaaSPortalE2E) {
      return;
    }

    cy.step('Clean up isolated MaaS resources created by the portal test');
    ensureAdminOcSession();
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(policyName, modelsAsAServiceNamespace);
    cleanupMaaSModelRef(modelName, projectName);
    cleanupLLMInferenceService(modelName, projectName);
    deleteOpenShiftProjectBestEffort(projectName);
    cleanupApiKeys(apiKeyName);
  });

  portalTest(
    'validates role access, API-key creation and revocation, and revoked-key authorization',
    { tags: ['@Smoke', '@Dashboard', '@MaaS', '@MaaSPortal', '@MaaSAccess'] },
    () => {
      const { portalUrl, adminUser, portalUser } = getRequiredPortalConfig();

      cy.step('Log into the MaaS Portal as an administrator');
      maasPortalPage.loginWithCachedSession(portalUrl, adminUser);

      cy.step('Open Model Access and verify that subscriptions are available');
      maasPortalPage.findNavLink('Model Access').should('be.visible').click();
      maasPortalPage.shouldShowPageTitle('Model Access');
      subscriptionsTab.findSubscriptionsTable().should('be.visible');
      subscriptionsTab.findSubscriptionRows().should('have.length.greaterThan', 0);

      cy.step('Switch to the regular-user MaaS Portal session');
      maasPortalPage.loginWithCachedSession(portalUrl, portalUser);

      cy.step('Verify that Model Access is not available to the regular user');
      maasPortalPage.findNavLink('Model Access').should('not.exist');

      cy.step('Open API keys for the regular user');
      maasPortalPage.findNavLink('API keys').should('be.visible').click();
      apiKeysPage.findTitle().should('contain.text', 'API keys');

      cy.step('Create an API key using an available subscription');
      apiKeysPage.findCreateApiKeyButton().click();
      createApiKeyModal.shouldBeOpen();
      createApiKeyModal.findSubscriptionToggle().click();
      createApiKeyModal.findSubscriptionOption(subscriptionName).should('be.visible').click();
      createApiKeyModal.findNameInput().type(apiKeyName);
      createApiKeyModal.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the API key details modal without asserting secret values');
      copyApiKeyModal.shouldBeOpen();
      copyApiKeyModal.findApiKeyName().should('contain.text', apiKeyName);
      copyApiKeyModal.findSubscriptionName().should('not.be.empty');
      copyApiKeyModal.findApiKeyTokenInput().should('exist');
      copyApiKeyModal.findApiKeyExpirationDate().should('not.be.empty');
      copyApiKeyModal.expandAccessDetails();
      copyApiKeyModal.findBaseURL().invoke('val').should('not.be.empty');
      copyApiKeyModal.findModelID().invoke('val').should('not.be.empty');
      copyApiKeyModal.findUsageExample().should('contain.text', '/v1/chat/completions');
      copyApiKeyModal
        .findEndpointCompatibilityAlert()
        .scrollIntoView()
        .should('be.visible')
        .and('contain.text', 'Endpoint compatibility');

      cy.step('Run the copied usage example with the newly created API key');
      stubClipboard('copiedApiKey');
      copyApiKeyModal.findApiKeyTokenCopyButton().click();
      getClipboardContent('copiedApiKey', { log: false }).then((apiKeys) => {
        const apiKey = apiKeys[0];
        expect(typeof apiKey, 'created API key type').to.equal('string');
        expect(apiKey.length, 'created API key length').to.be.greaterThan(0);
        cy.wrap(apiKey, { log: false }).as('storedApiKey');
        copyApiKeyModal
          .findBaseURL()
          .invoke('val')
          .then((baseUrl) => {
            copyApiKeyModal
              .findModelID()
              .invoke('val')
              .then((model) => {
                const modelId = String(model ?? '');
                expect(modelId.length, 'created model ID length').to.be.greaterThan(0);
                cy.wrap(modelId).as('createdModelId');
                const gatewayBaseUrl = String(baseUrl ?? '').replace(/\/$/, '');

                cy.request({
                  method: 'POST',
                  url: `${gatewayBaseUrl}/v1/chat/completions`,
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: {
                    model: modelId,
                    messages: [{ role: 'user', content: 'Hello' }],
                  },
                  failOnStatusCode: false,
                  log: false,
                }).then((response) => {
                  expect(response.status).to.equal(200);
                });
              });
          });
      });

      cy.step('Acknowledge the API key was copied and close the modal');
      copyApiKeyModal.acknowledgeKeyCopiedCheckbox();
      copyApiKeyModal.findCloseButton().should('be.enabled').click();
      copyApiKeyModal.shouldBeOpen(false);

      cy.step('Switch to the administrator MaaS Portal session and revoke the created API key');
      maasPortalPage.loginWithCachedSession(portalUrl, adminUser);
      maasPortalPage.reload();
      maasPortalPage.findNavLink('API keys').should('be.visible').click();
      apiKeysPage.findTitle().should('contain.text', 'API keys');
      maasPortalPage.findNavLink('Model Access').should('be.visible').click();
      maasPortalPage.shouldShowPageTitle('Model Access');
      subscriptionsTab.selectModelAccessSubscription(subscriptionName);
      subscriptionsTab.findSubscriptionRows().should('have.length', 1);

      maasPortalPage.findNavLink('API keys').click();
      apiKeysPage.findTitle().should('contain.text', 'API keys');
      apiKeysPage.findSubscriptionFilterToggle().click();
      apiKeysPage.findSubscriptionFilterOption(subscriptionName).click();
      apiKeysPage.filterByUsername(portalUser.USERNAME);

      const createdApiKeyRow = apiKeysPage.getRow(apiKeyName);
      createdApiKeyRow.findName().should('contain.text', apiKeyName);
      createdApiKeyRow.findOwner().should('contain.text', portalUser.USERNAME);
      createdApiKeyRow
        .findName()
        .invoke('text')
        .then((createdApiKeyName) => {
          createdApiKeyRow.findRevokeButton().click();
          revokeAPIKeyModal.shouldBeOpen();
          revokeAPIKeyModal.findRevokeConfirmationInput().clear().type(createdApiKeyName.trim());
          revokeAPIKeyModal.findRevokeButton().should('be.enabled').click();
          revokeAPIKeyModal.shouldBeOpen(false);
        });
      apiKeysPage.findRows().should('not.contain.text', apiKeyName);

      cy.step('Switch back to the regular-user MaaS Portal session');
      maasPortalPage.loginWithCachedSession(portalUrl, portalUser);
      maasPortalPage.reload();

      cy.step('Open another model endpoint and copy its usage example');
      maasPortalPage.findNavLink('Model endpoints').should('be.visible').click();
      maasPortalPage.findModelEndpointsPage().should('be.visible');
      maasPortalPage.ensureModelEndpointsLoaded();
      maasPortalPage.getCreatedModelId().then((modelId) => {
        maasPortalPage.openModelEndpointDetailsFor(modelId);
        maasPortalPage.findEndpointDetailsModal().should('be.visible');
        stubClipboard('revokedUsageExample');
        maasPortalPage.findEndpointUsageExampleCopyButton().click();
      });

      cy.step('Verify the revoked API key is unauthorized for the model endpoint');
      getClipboardContent('revokedUsageExample').then((usageExamples) => {
        const usageExample = usageExamples[0];
        const endpointMatch = usageExample.match(/curl\s+-X\s+POST\s+'?([^'\s]+)'?/);
        const bodyMatch = usageExample.match(/-d\s+'([\s\S]*?)'/);

        if (!endpointMatch || !bodyMatch) {
          throw new Error('Could not parse the model endpoint usage example');
        }

        const endpoint = endpointMatch[1];
        const requestBody = JSON.parse(bodyMatch[1]) as {
          model: string;
          messages: Array<{ role: string; content: string }>;
        };

        maasPortalPage.getStoredApiKey().then((apiKey) => {
          cy.request({
            method: 'POST',
            url: endpoint,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: requestBody,
            failOnStatusCode: false,
            log: false,
          }).then((response) => {
            expect(response.status).to.equal(403);
          });
        });
      });
    },
  );
});
