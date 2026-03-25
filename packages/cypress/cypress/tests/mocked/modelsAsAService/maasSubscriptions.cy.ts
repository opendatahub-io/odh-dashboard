import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { deleteSubscriptionModal, subscriptionsPage } from '../../../pages/modelsAsAService';
import { mockSubscriptions } from '../../../utils/maasUtils';

describe('Subscriptions Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
      }),
    );
    cy.interceptOdh('GET /maas/api/v1/user', {
      data: { userId: 'test-user', clusterAdmin: false },
    });
    cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions(),
    });
    subscriptionsPage.visit();
  });

  it('should show the empty state when there are no subscriptions', () => {
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: [],
    });
    subscriptionsPage.visit();
    subscriptionsPage.findEmptyState().should('exist');
    subscriptionsPage.findCreateSubscriptionButton().should('exist');
  });

  it('should display the subscriptions table with correct page content', () => {
    subscriptionsPage.findTitle().should('contain.text', 'Subscriptions');
    subscriptionsPage
      .findDescription()
      .should(
        'contain.text',
        'Subscriptions control access and entitlements to AI model endpoints that are available as a service.',
      );

    subscriptionsPage.findTable().should('exist');
    subscriptionsPage.findRows().should('have.length', 2);
    subscriptionsPage.findCreateSubscriptionButton().should('exist');

    const premiumRow = subscriptionsPage.getRow('premium-team-sub');
    premiumRow.findName().should('contain.text', 'premium-team-sub');
    premiumRow.findGroups().should('contain.text', '1 Groups');
    premiumRow.findModels().should('contain.text', '2 Models');

    const basicRow = subscriptionsPage.getRow('basic-team-sub');
    basicRow.findName().should('contain.text', 'basic-team-sub');
    basicRow.findGroups().should('contain.text', '1 Groups');
    basicRow.findModels().should('contain.text', '1 Models');

    subscriptionsPage.findFilterInput().should('exist').type('premium');
    subscriptionsPage.findRows().should('have.length', 1);
    subscriptionsPage.findFilterResetButton().should('exist').click();
    subscriptionsPage.findRows().should('have.length', 2);

    premiumRow.findKebabAction('View details').should('exist');
    premiumRow.findKebabAction('Edit subscription').should('exist');
    premiumRow.findKebabAction('Delete subscription').should('exist');
  });
  it('should delete a subscription', () => {
    cy.interceptOdh(
      'DELETE /maas/api/v1/subscription/:name',
      { path: { name: 'premium-team-sub' } },
      { message: "MaaSSubscription 'premium-team-sub' deleted successfully" },
    ).as('deleteSubscription');

    subscriptionsPage.getRow('premium-team-sub').findKebabAction('Delete subscription').click();
    deleteSubscriptionModal.findInput().type('premium-team-sub');

    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions().filter((subscription) => subscription.name !== 'premium-team-sub'),
    }).as('getSubscriptions');

    deleteSubscriptionModal.findSubmitButton().click();
    cy.wait('@deleteSubscription').then((response) => {
      expect(response.response?.body).to.deep.equal({
        message: "MaaSSubscription 'premium-team-sub' deleted successfully",
      });
    });
    subscriptionsPage.findRows().should('have.length', 1);
    subscriptionsPage.findTable().should('not.contain', 'premium-team-sub');
  });

  it('should display no subscriptions message when model has no subscriptions', () => {
    // Mock MaaS model without subscriptions
    cy.interceptOdh('GET /gen-ai/api/v1/maas/models', {
      body: [
        /* eslint-disable camelcase */
        {
          id: 'llama-3-8b',
          object: 'model',
          created: 1734000000,
          owned_by: 'meta',
          ready: true,
          url: 'https://llama-model.apps.cluster.com',
          display_name: 'Llama 3 8B',
          description: 'Llama family of LLMs',
          usecase: 'Text Generation',
          model_type: 'llm',
          subscriptions: [],
        },
        /* eslint-enable camelcase */
      ],
    });

    // Reload the page to get the new model data
    cy.visit('/aiAssets');

    cy.contains('Llama 3 8B').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.contains('View endpoints').click();

    // Verify endpoint modal is open
    cy.get('[role="dialog"]').should('exist');
    cy.contains('Endpoints').should('exist');

    // Verify Authentication heading is NOT shown when no subscriptions
    cy.contains('Authentication').should('not.exist');

    // Verify no subscriptions alert is shown
    cy.contains('No subscriptions available').should('exist');
    cy.contains(
      "You don't have any subscriptions for this model. Contact your administrator to request access.",
    ).should('exist');

    // Verify subscription dropdown is not shown
    cy.get('[data-testid="endpoint-modal-subscription-select"]').should('not.exist');

    // Verify Generate API key button is not shown
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').should('not.exist');
  });

  it('should handle API key generation error', () => {
    cy.contains('Granite 3.1 8B Instruct').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.contains('View endpoints').click();

    // Mock token generation error
    cy.interceptOdh('POST /gen-ai/api/v1/maas/tokens', {
      statusCode: 500,
      body: { error: 'Failed to generate token' },
    });

    // Select subscription
    cy.get('[data-testid="endpoint-modal-subscription-select"]').click();
    cy.contains('Premium Tier').click();

    // Click generate button
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').click();

    // Verify error alert appears
    cy.contains('Error generating API key').should('exist');

    // Verify token input is not shown
    cy.get('[data-testid="endpoint-modal-api-key-input"]').should('not.exist');

    // Verify Generate button is still available to retry
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').should('exist');
  });

  it('should disable generate button while loading', () => {
    cy.contains('Granite 3.1 8B Instruct').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.contains('View endpoints').click();

    // Mock token generation with delay to catch loading state
    cy.interceptOdh('POST /gen-ai/api/v1/maas/tokens', {
      delay: 1000,
      body: {
        key: 'test-ephemeral-token-12345',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });

    // Select subscription
    cy.get('[data-testid="endpoint-modal-subscription-select"]').click();
    cy.contains('Premium Tier').click();

    // Click generate button
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').click();

    // Verify button is disabled during loading
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').should('be.disabled');

    // Wait for token to be generated
    cy.get('[data-testid="endpoint-modal-api-key-input"]', { timeout: 2000 }).should('exist');
  });
});
