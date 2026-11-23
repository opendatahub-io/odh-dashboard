import {
  apiKeysPage,
  subscriptionsTab,
  mySubscriptionsPage,
  subscriptionsPage,
} from '@odh-dashboard/cypress/cypress/pages/modelsAsAService';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';
import { setupSubscriptionMocks } from '../../support/subscriptions';

describe('Portal subscriptions', () => {
  beforeEach(() => {
    setupPortalMocks();
    setupSubscriptionMocks();
  });

  it('shows API key counts and model token limits in expanded subscription rows', () => {
    portal.visit('/maas/keys-and-subs/subscriptions');
    subscriptionsTab.findSubscriptionRows().should('have.length', 2);
    subscriptionsTab.findSubscriptionRows().eq(0).should('contain.text', 'Premium Team');
    subscriptionsTab.findSubscriptionRows().eq(0).should('contain.text', '10+ active keys');
    subscriptionsTab.findSubscriptionRows().eq(1).should('contain.text', '5 active keys');

    subscriptionsTab.expandSubscriptionRow(0);
    subscriptionsTab.findSubscriptionModelsTable('premium-team-sub').within(() => {
      cy.get('[data-testid="subscription-model-row"]').should('have.length', 2);
      cy.get('[data-testid="subscription-model-row"]')
        .eq(0)
        .should('contain.text', 'Granite 3 8B Instruct')
        .find('[data-label="Token limits"]')
        .should('contain.text', '100,000 / 24 hours');
      cy.get('[data-testid="subscription-model-row"]')
        .eq(1)
        .should('contain.text', 'Flan T5 Small')
        .find('[data-label="Token limits"]')
        .should('contain.text', '200,000 / 24 hours');
    });
  });

  it('opens subscription details, filters its API keys, and preserves deep links on reload', () => {
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.findSubscriptionsTab().click();
    subscriptionsTab.findSubscriptionsTable().should('contain.text', 'Premium Team');
    subscriptionsTab.findSubscriptionDetailLink('premium-team-sub').click();
    cy.wait('@subscriptionDetails');
    cy.location('pathname').should(
      'eq',
      portalPath('/maas/keys-and-subs/subscriptions/premium-team-sub'),
    );
    mySubscriptionsPage.findModelsSection().should('contain.text', 'Granite 3 8B Instruct');
    mySubscriptionsPage
      .findApiKeysTable()
      .should('contain.text', 'production-backend')
      .and('not.contain.text', 'development-testing');
    cy.reload();
    cy.wait('@subscriptionDetails');
    mySubscriptionsPage.findDetailsSection().should('be.visible');
    mySubscriptionsPage.findMySubscriptionsLink().click();
    cy.location('pathname').should('eq', portalPath('/maas/keys-and-subs/subscriptions'));
  });

  it('shows the consumer empty state when no subscriptions are available', () => {
    cy.intercept('GET', maasApi('/subscriptions'), { data: [] });
    portal.visit('/maas/keys-and-subs/subscriptions');
    subscriptionsTab.findEmptyState().should('be.visible');
  });

  it('keeps the portal shell available when subscriptions cannot be loaded', () => {
    cy.intercept('GET', maasApi('/subscriptions'), {
      statusCode: 500,
      body: { error: { code: '500', message: 'Subscriptions unavailable' } },
    });
    portal.visit('/maas/keys-and-subs/subscriptions');
    subscriptionsPage.findErrorState().should('contain.text', 'Subscriptions unavailable');
    portal.findNavLink('Model endpoints').should('be.visible');
  });
});
