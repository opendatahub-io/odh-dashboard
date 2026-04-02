import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  deleteSubscriptionModal,
  subscriptionsPage,
  viewSubscriptionPage,
} from '../../../pages/modelsAsAService';
import { mockSubscriptions, mockSubscriptionInfo } from '../../../utils/maasUtils';

const setupCommonIntercepts = () => {
  asProductAdminUser();
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: true }));
  cy.interceptOdh('GET /maas/api/v1/user', { data: { userId: 'test-user', clusterAdmin: false } });
  cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
      },
    }),
  );
};

describe('Subscriptions Page', () => {
  beforeEach(() => {
    setupCommonIntercepts();
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
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
    // @ts-expect-error - Gen AI API endpoint not in Cypress type definitions
    // Mock MaaS model without subscriptions
    cy.interceptOdh('GET /gen-ai/api/v1/maas/models' as string, {
      data: [
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
    }).as('maasModels');

    // Reload the page to get the new model data
    cy.visit('/gen-ai-studio/assets');

    // Wait for models API calls to complete before interacting with the page
    cy.wait('@maasModels');
    cy.wait('@aaaModels');
    cy.contains('Llama 3 8B').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.get('[role="menu"]').contains('View endpoints').click();

    // Verify endpoint modal is open and scope all assertions to it
    cy.get('[role="dialog"]')
      .should('exist')
      .within(() => {
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
  });

  it('should handle API key generation error', () => {
    cy.visit('/gen-ai-studio/assets');
    // Wait for models API calls to complete before interacting with the page
    cy.wait('@defaultMaasModels');
    cy.wait('@aaaModels');
    cy.contains('Granite 3.1 8B Instruct').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.get('[role="menu"]').contains('View endpoints').click();

    // @ts-expect-error - Gen AI API endpoint not in Cypress type definitions
    // Mock token generation error
    cy.interceptOdh('POST /gen-ai/api/v1/maas/tokens' as string, {
      statusCode: 500,
      body: { error: 'Failed to generate token' },
    });

    // Select subscription
    cy.get('[data-testid="endpoint-modal-subscription-select"]').click();
    cy.findByRole('listbox')
      .should('be.visible')
      .within(() => {
        cy.findByRole('option', { name: 'Premium Tier' }).click();
      });

    // Click generate button
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').click();

    // Verify error alert appears
    cy.contains('Error generating API key').should('exist');

    // Verify token input is not shown
    cy.get('[data-testid="endpoint-modal-api-key-input"]').should('not.exist');

    // Verify Generate button is still available and actionable for retry
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').should('be.enabled');
  });

  it('should disable generate button while loading', () => {
    cy.visit('/gen-ai-studio/assets');
    // Wait for models API calls to complete before interacting with the page
    cy.wait('@defaultMaasModels');
    cy.wait('@aaaModels');
    cy.contains('Granite 3.1 8B Instruct').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.get('[role="menu"]').contains('View endpoints').click();

    // @ts-expect-error - Gen AI API endpoint not in Cypress type definitions
    // Mock token generation with delay to catch loading state
    cy.interceptOdh('POST /gen-ai/api/v1/maas/tokens' as string, {
      delay: 1000,
      body: {
        key: 'test-ephemeral-token-12345',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    }).as('generateToken');

    // Select subscription
    cy.get('[data-testid="endpoint-modal-subscription-select"]').click();
    cy.findByRole('listbox')
      .should('be.visible')
      .within(() => {
        cy.findByRole('option', { name: 'Premium Tier' }).click();
      });

    // Click generate button
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').click();

    // Verify button is disabled during loading
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').should('be.disabled');

    // Wait for token generation API call to complete
    cy.wait('@generateToken');
    cy.get('[data-testid="endpoint-modal-api-key-input"]').should('exist');
  });

  it('should reset state when modal is closed', () => {
    cy.visit('/gen-ai-studio/assets');
    // Wait for models API calls to complete before interacting with the page
    cy.wait('@defaultMaasModels');
    cy.wait('@aaaModels');
    cy.contains('Granite 3.1 8B Instruct').should('exist');
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.get('[role="menu"]').contains('View endpoints').click();

    // @ts-expect-error - Gen AI API endpoint not in Cypress type definitions
    // Mock token generation
    cy.interceptOdh('POST /gen-ai/api/v1/maas/tokens' as string, {
      body: {
        key: 'test-ephemeral-token-12345',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    });

    // Select subscription and generate token
    cy.get('[data-testid="endpoint-modal-subscription-select"]').click();
    cy.findByRole('listbox')
      .should('be.visible')
      .within(() => {
        cy.findByRole('option', { name: 'Premium Tier' }).click();
      });
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').click();

    // Verify token is displayed
    cy.get('[data-testid="endpoint-modal-api-key-input"]').should('exist');

    // Show the key
    cy.get('[data-testid="endpoint-modal-api-key-toggle"]').click();
    cy.get('[data-testid="endpoint-modal-api-key-input"]').should('have.attr', 'type', 'text');

    // Close the modal
    cy.get('[data-testid="endpoint-modal-close"]').click();

    // Reopen the modal
    cy.get('[data-testid="model-row-kebab"]').first().click();
    cy.get('[role="menu"]').contains('View endpoints').click();

    // Verify modal is reset - no token shown, key is hidden
    cy.get('[data-testid="endpoint-modal-api-key-input"]').should('not.exist');
    cy.get('[data-testid="endpoint-modal-generate-api-key"]').should('exist');

    // Verify subscription dropdown is back to default (first subscription)
    cy.get('[data-testid="endpoint-modal-subscription-select"]').should('contain', 'Premium Tier');
  });
});

describe('View Subscription Page', () => {
  const subscriptionName = 'premium-team-sub';

  beforeEach(() => {
    setupCommonIntercepts();
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: subscriptionName } },
      mockSubscriptionInfo(subscriptionName),
    );
  });

  it('should display the page content with title, breadcrumb, details, groups, and models', () => {
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
    subscriptionsPage.visit();
    subscriptionsPage.getRow(subscriptionName).findKebabAction('View details').click();
    cy.url().should('include', `/maas/subscriptions/view/${subscriptionName}`);

    viewSubscriptionPage.findTitle().should('contain.text', subscriptionName);

    viewSubscriptionPage
      .findDetailsSection()
      .should('contain.text', subscriptionName)
      .and('contain.text', 'Name')
      .and('contain.text', 'Date created');

    viewSubscriptionPage.findGroupsSection().should('exist');
    viewSubscriptionPage.findGroupsTable().should('contain.text', 'premium-users');

    viewSubscriptionPage.findModelsSection().should('exist');
    viewSubscriptionPage
      .findModelsTable()
      .should('contain.text', 'granite-3-8b-instruct Display')
      .and('contain.text', 'granite-3-8b-instruct')
      .and('contain.text', 'maas-models')
      .and('contain.text', '100,000');

    viewSubscriptionPage.findBreadcrumbSubscriptionsLink().click();
    cy.url().should('include', '/maas/subscriptions');
  });

  it('should show error state when the subscription-info API fails', () => {
    cy.interceptOdh(
      'GET /maas/api/v1/subscription-info/:name',
      { path: { name: subscriptionName } },
      { forceNetworkError: true } as never,
    );
    viewSubscriptionPage.visit(subscriptionName);
    viewSubscriptionPage.findPageError().should('exist');
  });
});
