import { getClipboardContent, stubClipboard } from './clipboardUtils';
import { buildMaaSInferenceUrl } from './oc_commands/maas';
import { apiKeysPage, copyApiKeyModal, createApiKeyModal } from '../pages/modelsAsAService';

/** Create a key for this test's subscription and verify inference with it. */
export const createPortalApiKeyAndVerifyInference = (
  portalUrl: string,
  subscriptionName: string,
  apiKeyName: string,
  modelRoute?: { projectName: string; modelName: string },
): void => {
  const subscriptionsUrl = `${portalUrl.replace(/\/$/, '')}/maas/api/v1/subscriptions`;
  const waitForSubscription = (attempt = 0): Cypress.Chainable<null> =>
    cy
      .request({
        url: subscriptionsUrl,
        followRedirect: false,
        failOnStatusCode: false,
        log: false,
      })
      .then((response) => {
        expect(response.status, 'Portal subscriptions HTTP status').to.equal(200);
        const body = response.body as {
          data?: Array<{
            subscription_id_header?: string;
            subscription_description?: string;
            model_refs?: unknown;
          }>;
        };
        const subscription = body.data?.find(
          (item) => item.subscription_id_header === subscriptionName,
        );
        if (subscription) {
          expect(subscription.subscription_description, 'subscription description').to.be.a(
            'string',
          );
          expect(subscription.model_refs, 'subscription model references').to.be.an('array');
          return cy.wrap(null);
        }
        if (attempt >= 12) {
          throw new Error(
            `The Portal did not expose subscription ${subscriptionName} within 60 seconds`,
          );
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- MaaS subscription propagation
        return cy.wait(5000, { log: false }).then(() => waitForSubscription(attempt + 1));
      });

  cy.step('Wait for the generated subscription to reach the Portal');
  waitForSubscription();
  apiKeysPage.findTitle().should('contain.text', 'API keys');

  cy.step('Create an API key for the generated subscription');
  apiKeysPage.findCreateApiKeyButton().click();
  createApiKeyModal.shouldBeOpen();
  createApiKeyModal.findSubscriptionToggle().click();
  createApiKeyModal.findSubscriptionOption(subscriptionName).should('be.visible').click();
  createApiKeyModal.findSubscriptionCombobox().should('have.value', subscriptionName);
  createApiKeyModal.findNameInput().type(apiKeyName);
  createApiKeyModal.findSubmitButton().should('be.enabled').click();

  cy.step('Verify the API key details and copied usage example');
  copyApiKeyModal.shouldBeOpen();
  copyApiKeyModal.findApiKeyName().should('contain.text', apiKeyName);
  copyApiKeyModal.findSubscriptionName().should('contain.text', subscriptionName);
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

  stubClipboard('copiedPortalApiKey', { log: false });
  copyApiKeyModal.findApiKeyTokenCopyButton().click();

  cy.step('Run inference with the copied API key and verify HTTP 200');
  copyApiKeyModal
    .findUsageExample()
    .invoke('text')
    .then((example) => {
      const endpointMatch = example.match(/curl\s+-X\s+POST\s+(\S+)/);
      const bodyMatch = example.match(/-d\s+'([^']+)'/);
      if (!endpointMatch || !bodyMatch) {
        throw new Error('Could not parse the Portal API key usage example');
      }
      const usageEndpoint = new URL(endpointMatch[1]);
      expect(usageEndpoint.protocol, 'usage example protocol').to.equal('https:');
      expect(usageEndpoint.pathname, 'usage example endpoint').to.match(/\/v1\/chat\/completions$/);
      const requestBody = JSON.parse(bodyMatch[1]) as {
        model: string;
        messages: Array<{ role: string; content: string }>;
      };
      const usageModelId = requestBody.model;
      const endpoint = modelRoute
        ? buildMaaSInferenceUrl(usageEndpoint.host, modelRoute.projectName, modelRoute.modelName)
        : usageEndpoint.toString();
      if (modelRoute) {
        requestBody.model = modelRoute.modelName;
      }
      cy.wrap(endpoint).as('createdEndpoint');
      cy.wrap(requestBody).as('createdRequestBody');
      copyApiKeyModal
        .findModelID()
        .invoke('val')
        .then((modelId) => {
          expect(usageModelId, 'usage example model').to.equal(String(modelId));
          cy.wrap(String(modelId)).as('createdModelId');
        });
      getClipboardContent('copiedPortalApiKey', { log: false }).then(([apiKey]) => {
        expect(apiKey, 'copied API key').to.be.a('string');
        expect(apiKey.length, 'copied API key length').to.be.greaterThan(0);
        cy.wrap(apiKey, { log: false }).as('storedApiKey');
        cy.request({
          method: 'POST',
          url: endpoint,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: requestBody,
          failOnStatusCode: false,
          timeout: 180000,
          log: false,
        }).then((response) => {
          expect(response.status, `MaaS inference response from ${endpoint}`).to.equal(200);
          expect(response.headers['content-type'], 'MaaS inference content type').to.include(
            'application/json',
          );
          expect(response.body, 'MaaS chat completion').to.have.property('choices');
        });
      });
    });

  copyApiKeyModal.acknowledgeKeyCopiedCheckbox();
  copyApiKeyModal.findCloseButton().should('be.enabled').click();
  copyApiKeyModal.shouldBeOpen(false);
};
