import { getClipboardContent, stubClipboard } from './clipboardUtils';
import { executeMaaSUsageExample, parseMaaSUsageExample } from './maasApiKeyRevocation';
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
  // Assert in a callback: a failure then prints true/false, not the text (it can hold the key).
  copyApiKeyModal.findUsageExample().should(($usageExample) => {
    expect(
      $usageExample.text().includes('/v1/chat/completions'),
      'usage example contains /v1/chat/completions',
    ).to.equal(true);
  });
  copyApiKeyModal
    .findEndpointCompatibilityAlert()
    .scrollIntoView()
    .should('be.visible')
    .and('contain.text', 'Endpoint compatibility');

  stubClipboard('copiedPortalApiKey', { log: false });
  copyApiKeyModal.findApiKeyTokenCopyButton().click();
  getClipboardContent('copiedPortalApiKey', { log: false }).then(([apiKey]) => {
    expect(typeof apiKey, 'copied API key type').to.equal('string');
    expect(apiKey.length, 'copied API key length').to.be.greaterThan(0);
    cy.wrap(apiKey, { log: false }).as('storedApiKey');
  });

  cy.step('Run the copied usage example and verify HTTP 200');
  copyApiKeyModal.findUsageExampleCopyButton().click();
  getClipboardContent('copiedPortalApiKey', { log: false })
    .should((copiedValues) => {
      // Check the count only: a failed have.length assertion prints the copied array, which
      // shows a short key in full.
      expect(copiedValues.length, 'number of copied values').to.be.at.least(2);
    })
    .then((copiedValues) => {
      const usageExample = copiedValues[1];
      const { endpoint: usageEndpoint, requestBody } = parseMaaSUsageExample(usageExample);
      const endpoint = modelRoute
        ? buildMaaSInferenceUrl(
            new URL(usageEndpoint).host,
            modelRoute.projectName,
            modelRoute.modelName,
          )
        : usageEndpoint;
      const portalModelId = requestBody.model;
      if (modelRoute) {
        requestBody.model = modelRoute.modelName;
      }
      cy.wrap(endpoint).as('createdEndpoint');
      cy.wrap(requestBody).as('createdRequestBody');
      cy.wrap(portalModelId).as('createdModelId');
      copyApiKeyModal
        .findModelID()
        .invoke('val')
        .then((modelId) => expect(portalModelId, 'usage example model').to.equal(String(modelId)));
      executeMaaSUsageExample(
        usageExample,
        modelRoute ? endpoint : undefined,
        modelRoute ? requestBody : undefined,
      ).then(({ status }) => {
        expect(status, 'MaaS inference response').to.equal(200);
      });
    });

  copyApiKeyModal.acknowledgeKeyCopiedCheckbox();
  copyApiKeyModal.findCloseButton().should('be.enabled').click();
  copyApiKeyModal.shouldBeOpen(false);
};
