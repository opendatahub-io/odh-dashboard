// Uses TEST_USER_3 and discovers the Portal URL from Dashboard.status.maasPortalUrl.
// If the Portal is Removed, setup enables it through DataScienceCluster.spec.components.dashboard.maasPortal
// and restores the original state after the test. This spec does not need MAAS_PORTAL_URL.
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
import {
  prepareOpenShiftMaaSPortal,
  restoreOpenShiftMaaSPortal,
  waitForRestoredOpenShiftMaaSPortal,
} from '../../../utils/oc_commands/maasPortal';
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
  let restorePortal: (() => void) | undefined;
  let waitForPortalRestore: (() => void) | undefined;
  let restoreError: string | undefined;

  before(() => {
    cy.step('Ensure the gateway MaaS Portal is managed and available');
    ensureAdminOcSession();
    prepareOpenShiftMaaSPortal((state) => {
      restorePortal = () => {
        restoreOpenShiftMaaSPortal(state).then((result) => {
          if (result.exitCode !== 0) {
            restoreError = `Could not restore the original MaaS Portal state: ${result.stderr}`;
          } else {
            const restored = JSON.parse(result.stdout) as { metadata: { generation: number } };
            waitForPortalRestore = () =>
              waitForRestoredOpenShiftMaaSPortal(state, restored.metadata.generation);
          }
        });
      };
    }).then((url) => {
      portalUrl = url;
    });

    cy.step('Create a model, subscription and policy for the OpenShift user');
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
    if (restorePortal) {
      cy.step('Restore the original MaaS Portal management state');
      restorePortal();
    }
    cy.step('Remove only the MaaS resources created by this test');
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(policyName, modelsAsAServiceNamespace);
    cleanupMaaSModelRef(modelName, projectName);
    cleanupLLMInferenceService(modelName, projectName);
    deleteOpenShiftProjectBestEffort(projectName);
    cleanupApiKeys(apiKeyName);
    cy.then(() => {
      if (restoreError) {
        throw new Error(restoreError);
      }
      if (waitForPortalRestore) {
        cy.step('Wait for the DataScienceCluster and Dashboard to finish reconciling');
        waitForPortalRestore();
      }
    });
  });

  it(
    'creates an API key as an OpenShift user, gets HTTP 200, then revokes it and gets HTTP 403',
    { tags: ['@Smoke', '@Dashboard', '@MaaS', '@MaaSPortal', '@MaaSCI'] },
    () => {
      cy.step('Sign in to the gateway MaaS Portal as a regular OpenShift user');
      cy.then(() => maasPortalPage.visitWithOpenShiftLogin(portalUrl, LDAP_CONTRIBUTOR_USER));

      cy.step('Wait for the Portal API keys endpoint to finish starting');
      cy.then(() => {
        const endpoint = `${portalUrl.replace(/\/$/, '')}/maas/api/v1/api-keys/search/tenant`;
        const startedAt = Date.now();
        const poll = (): Cypress.Chainable<null> =>
          cy
            .request({
              method: 'POST',
              url: endpoint,
              body: { data: { pagination: { limit: 1 } } },
              followRedirect: false,
              failOnStatusCode: false,
              log: false,
            })
            .then((response) => {
              const data = response.body?.data;
              if (
                response.status === 200 &&
                String(response.headers['content-type']).includes('application/json') &&
                data?.object === 'list' &&
                Array.isArray(data.data) &&
                typeof data.has_more === 'boolean'
              ) {
                return cy.wrap(null, { log: false });
              }
              if (response.status === 401 || response.status === 403) {
                throw new Error(
                  `Portal API key search returned HTTP ${response.status} after login`,
                );
              }
              if (Date.now() - startedAt >= 300000) {
                throw new Error(
                  `Portal API key search did not become ready within 5 minutes: POST ${endpoint} returned HTTP ${
                    response.status
                  }, content-type ${String(response.headers['content-type'])}`,
                );
              }
              // eslint-disable-next-line cypress/no-unnecessary-waiting -- wait for the Portal API rollout
              return cy.wait(5000, { log: false }).then(poll);
            });
        return poll();
      });
      cy.reload();

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
