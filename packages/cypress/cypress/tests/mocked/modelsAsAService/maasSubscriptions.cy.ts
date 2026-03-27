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
