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
});
