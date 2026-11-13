/* eslint-disable camelcase */
import { mockAAModel } from '@odh-dashboard/gen-ai/__mocks__/genAiFixtures';
import { endpointModalPage, maasModelsPage } from '@odh-dashboard/gen-ai/testing/pages';
import { mockSubscriptionListItems } from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';

const modelsPath = portalPath('/gen-ai/api/v1/aaa/models*');
const model = (overrides: Parameters<typeof mockAAModel>[0] = {}) =>
  mockAAModel({
    model_id: 'llama-3',
    model_name: 'llama-3',
    display_name: 'Llama 3',
    model_source_type: 'maas',
    ...overrides,
  });

describe('Grid Model endpoints', () => {
  beforeEach(() => setupPortalMocks());

  it('loads MaaS models from the portal root and retains its route on reload', () => {
    cy.intercept('GET', modelsPath, (request) => {
      expect(request.query).to.deep.equal({ sources: 'maas' });
      request.reply({ data: [model(), model({ model_id: 'granite', display_name: 'Granite' })] });
    }).as('models');
    portal.visit();
    cy.wait('@models');
    cy.location('pathname').should('eq', portalPath('/maas/models'));
    maasModelsPage.findTitle().should('have.text', 'Model endpoints');
    maasModelsPage.findTable().should('contain.text', 'Llama 3').and('contain.text', 'Granite');
    maasModelsPage.findModelIds().should('have.length', 2);
    maasModelsPage.findPlaygroundActions().should('not.exist');
    maasModelsPage.findTabs().should('not.exist');
    portal.findNavLink('AI asset endpoints').should('not.exist');
    cy.reload();
    cy.wait('@models');
    maasModelsPage.findTable().should('contain.text', 'Llama 3');
  });

  it('redirects /maas to Model endpoints', () => {
    cy.intercept('GET', modelsPath, { data: [model()] }).as('models');
    portal.visit('/maas');
    cy.wait('@models');
    cy.location('pathname').should('eq', portalPath('/maas/models'));
    maasModelsPage.findTitle().should('have.text', 'Model endpoints');
  });

  it('shows row values and opens a subscription from the endpoint details modal', () => {
    const modelId = 'publishers/models-as-a-service/models/granite-3-8b-instruct';
    const baseUrl = 'https://inference.example.test';
    cy.intercept('GET', modelsPath, {
      data: [
        model({
          model_name: 'granite-3-8b-instruct',
          model_id: modelId,
          display_name: 'Granite 3 8B Instruct',
          description: 'Granite model for chat requests',
          usecase: 'Chat completion',
          capabilities: ['text-generation', 'vision'],
          endpoints: [`external:${baseUrl}`],
          subscriptions: [
            {
              name: 'premium-team-sub',
              displayName: 'Premium Team',
              description: 'Premium access to Granite models',
            },
          ],
        }),
      ],
    }).as('models');
    cy.intercept('GET', maasApi('/subscriptions/premium-team-sub'), {
      data: mockSubscriptionListItems()[0],
    }).as('subscriptionDetails');

    portal.visit('/maas/models');
    cy.wait('@models');
    maasModelsPage.findRow('Granite 3 8B Instruct').within(() => {
      cy.findByTestId('model-id-text').should('contain.text', modelId);
      cy.findByRole('cell', { name: 'Chat completion' }).should('be.visible');
      cy.findByTestId('capability-badge-vision').should('contain.text', 'Vision');
      cy.findByTestId('capability-badge-text-generation').should('not.exist');
      cy.findByRole('cell', { name: 'Ready' }).should('be.visible');
      cy.findByTestId('endpoint-view-button').click();
    });

    endpointModalPage.findModal().should('be.visible');
    cy.findByDisplayValue(baseUrl).should('be.visible');
    cy.findByDisplayValue(modelId).should('be.visible');
    endpointModalPage.findModal().should('contain.text', '/v1/chat/completions');
    endpointModalPage.findAuthenticationCopy().should('contain.text', 'existing API key');
    endpointModalPage.findSubscriptionsToggle().click();
    endpointModalPage
      .findSubscriptionLink('premium-team-sub')
      .should('have.attr', 'href', portalPath('/maas/keys-and-subs/subscriptions/premium-team-sub'))
      .click();
    cy.wait('@subscriptionDetails');
    cy.location('pathname').should(
      'eq',
      portalPath('/maas/keys-and-subs/subscriptions/premium-team-sub'),
    );
    cy.findByTestId('app-page-title').should('contain.text', 'Premium Team');
  });

  it('shows an empty state when no MaaS models are available', () => {
    cy.intercept('GET', modelsPath, { data: [] }).as('models');
    portal.visit('/maas/models');
    cy.wait('@models');
    maasModelsPage.findEmptyState().should('contain.text', 'No MaaS models available');
    maasModelsPage.findTable().should('not.exist');
  });

  it('recovers when a failed model request is retried', () => {
    cy.intercept('GET', modelsPath, { statusCode: 503, body: {} }).as('modelsError');
    portal.visit('/maas/models');
    cy.wait('@modelsError');
    maasModelsPage.findError().should('contain.text', 'Unable to load page');
    cy.intercept('GET', modelsPath, { data: [model()] }).as('modelsRetry');
    maasModelsPage.findRetry().click();
    cy.wait('@modelsRetry');
    maasModelsPage.findTable().should('contain.text', 'Llama 3');
  });
});
