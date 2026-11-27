// Uses TEST_USER_3 and discovers the Portal URL from Dashboard.status.maasPortalUrl.
// The Portal must already be enabled; this spec does not mutate the DataScienceCluster.
// The cluster needs MaaS, model serving, TEST_USER_3 in rhods-users, Dashboard.spec.gateway.domain,
// and an operator/image capable of deploying the Portal.
// In CI, the cluster URL serves its installed Portal build. The local E2E proxy serves the PR's
// main dashboard and BFFs, not the cluster Portal.
import {
  checkLLMInferenceServiceState,
  cleanupLLMInferenceService,
} from '../../../utils/oc_commands/modelServing';
import {
  checkMaaSAuthPolicyState,
  checkMaaSSubscriptionState,
  cleanupApiKeys,
  cleanupAuthPolicy,
  cleanupMaaSModelRef,
  cleanupSubscription,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSAuthPolicy,
  createMaaSModelRef,
  createMaaSSubscription,
  modelsAsAServiceNamespace,
  waitForMaaSModelReady,
} from '../../../utils/oc_commands/maas';
import { getEnabledOpenShiftMaaSPortalUrl } from '../../../utils/oc_commands/maasPortal';
import {
  addUserToProject,
  deleteOpenShiftProjectBestEffort,
} from '../../../utils/oc_commands/project';
import { ensureAdminOcSession } from '../../../utils/oc_commands/baseCommands';
import { createAndVerifyProject } from '../../../utils/projectChecker';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { apiKeysPage, revokeAPIKeyModal } from '../../../pages/modelsAsAService';
import { maasPortalPage } from '../../../pages/maasPortal';
import { createPortalApiKeyAndVerifyInference } from '../../../utils/maasPortalApiKeyFlow';
import { verifyMaaSApiKeyRevoked } from '../../../utils/maasApiKeyRevocation';

const suffix = `${generateTestUUID()}-${Date.now().toString(36).slice(-5)}`;
const projectName = `portal-oc-project-${suffix}`;
const modelName = `portal-oc-model-${suffix}`;
const subscriptionName = `portal-oc-sub-${suffix}`;
const policyName = `portal-oc-policy-${suffix}`;
const apiKeyName = `portal-oc-key-${suffix}`;

describe('MaaS Portal API keys with OpenShift authentication', () => {
  let portalUrl: string;
  before(() => {
    cy.step('Verify the gateway MaaS Portal is already enabled and available');
    ensureAdminOcSession();
    getEnabledOpenShiftMaaSPortalUrl().then((url) => {
      portalUrl = url;
    });

    cy.step('Create a temporary LLMInferenceService for the Portal test');
    createAndVerifyProject(projectName);
    addUserToProject(projectName, LDAP_CONTRIBUTOR_USER.USERNAME, 'admin');
    createLLMInferenceServiceWithMaaSEnabled(
      projectName,
      modelName,
      'resources/maas/llmInferenceServiceSimulatorPremium.yaml',
    );
    checkLLMInferenceServiceState(modelName, projectName, { checkReady: true });
    createMaaSModelRef(projectName, modelName);
    createMaaSSubscription(
      subscriptionName,
      'Cypress OpenShift MaaS Portal subscription',
      projectName,
      modelName,
    );
    createMaaSAuthPolicy(policyName, projectName, modelName);
    checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, {
      phase: 'Active',
      models: [modelName],
    });
    checkMaaSAuthPolicyState(policyName, modelsAsAServiceNamespace, { phase: 'Active' });
    waitForMaaSModelReady(projectName, modelName);
  });

  after(() => {
    ensureAdminOcSession();
    cy.step('Remove only the MaaS resources created by this test');
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(policyName, modelsAsAServiceNamespace);
    cleanupMaaSModelRef(modelName, projectName);
    cleanupLLMInferenceService(modelName, projectName);
    deleteOpenShiftProjectBestEffort(projectName);
    cleanupApiKeys(apiKeyName);
  });

  it(
    'creates an API key as an OpenShift user, gets HTTP 200, then revokes it and gets HTTP 403',
    { tags: ['@Smoke', '@Dashboard', '@MaaS', '@MaaSPortal', '@Maintain'] },
    () => {
      cy.step('Sign in to the gateway MaaS Portal as a regular OpenShift user');
      cy.then(() => maasPortalPage.visitWithOpenShiftLogin(portalUrl, LDAP_CONTRIBUTOR_USER));

      cy.step('Verify the generated model appears in Model endpoints');
      maasPortalPage.findNavLink('Model endpoints').should('be.visible').click();
      maasPortalPage.ensureModelEndpointsLoaded();
      maasPortalPage.findModelEndpointRow(modelName).should('be.visible');

      cy.step('Create an API key for the generated subscription');
      maasPortalPage.findNavLink('API keys').should('be.visible').click();
      apiKeysPage.findTitle().should('contain.text', 'API keys');

      createPortalApiKeyAndVerifyInference(portalUrl, subscriptionName, apiKeyName, {
        projectName,
        modelName,
      });

      cy.step('Revoke the test API key after successful inference');
      const apiKeyRow = apiKeysPage.getRow(apiKeyName);
      apiKeyRow.findRevokeButton().click();
      revokeAPIKeyModal.shouldBeOpen();
      revokeAPIKeyModal.findRevokeConfirmationInput().clear().type(apiKeyName);
      revokeAPIKeyModal.findRevokeButton().should('be.enabled').click();
      revokeAPIKeyModal.shouldBeOpen(false);
      apiKeysPage.findRows().should('not.contain.text', apiKeyName);

      cy.step('Verify the revoked key returns HTTP 403 after the authorization cache expires');
      maasPortalPage.getStoredApiKey().then((apiKey) => {
        cy.get<string>('@createdEndpoint').then((endpoint) => {
          cy.get<{ model: string; messages: Array<{ role: string; content: string }> }>(
            '@createdRequestBody',
          ).then((requestBody) => verifyMaaSApiKeyRevoked(endpoint, apiKey, requestBody));
        });
      });
    },
  );
});
