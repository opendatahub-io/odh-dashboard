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
import { apiKeysPage, revokeAPIKeyModal, subscriptionsTab } from '../../../pages/modelsAsAService';
import { maasPortalPage } from '../../../pages/maasPortal';
import { MAAS_PORTAL_ADMIN_USER, MAAS_PORTAL_USER } from '../../../utils/e2eUsers';
import { getClipboardContent, stubClipboard } from '../../../utils/clipboardUtils';
import { verifyMaaSApiKeyRevoked } from '../../../utils/maasApiKeyRevocation';
import { createPortalApiKeyAndVerifyInference } from '../../../utils/maasPortalApiKeyFlow';
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
const enableFlag = Cypress.env('ENABLE_MAAS_PORTAL_E2E');
const runMaaSPortalE2E = enableFlag === true || enableFlag === 'true';

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

  if (
    !Array.isArray(userGroups) ||
    !userGroups.length ||
    userGroups.some((group) => typeof group !== 'string' || !group.trim())
  ) {
    throw new Error(
      'MAAS_PORTAL_USER_GROUPS must contain at least one non-empty group name in CY_TEST_CONFIG',
    );
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

    const { organizationId, userGroups, adminUser } = getRequiredPortalConfig();

    const accessReplacements = {
      MAAS_NAMESPACE: modelsAsAServiceNamespace,
      ORGANIZATION_ID: organizationId,
      USER_GROUPS: JSON.stringify(userGroups.map((name) => ({ name }))),
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

      createPortalApiKeyAndVerifyInference(portalUrl, subscriptionName, apiKeyName);

      cy.step('Switch to the administrator MaaS Portal session and revoke the created API key');
      maasPortalPage.loginWithCachedSession(portalUrl, adminUser);
      maasPortalPage.findNavLink('API keys').should('be.visible').click();
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

      cy.step("Open the created model's endpoint and copy its usage example");
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
          return verifyMaaSApiKeyRevoked(endpoint, apiKey, requestBody);
        });
      });
    },
  );
});
