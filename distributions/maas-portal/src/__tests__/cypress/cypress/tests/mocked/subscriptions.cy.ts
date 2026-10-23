import {
  mockSubscriptions,
  mockCreateSubscriptionResponse,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import {
  apiKeysPage,
  subscriptionsTab,
  mySubscriptionsPage,
  subscriptionsPage,
  createSubscriptionPage,
  addModelsToSubscriptionModal,
  editRateLimitsModal,
  deleteSubscriptionModal,
} from '@odh-dashboard/cypress/cypress/pages/modelsAsAService';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';
import { setupSubscriptionMocks, setupGovernanceMocks } from '../../support/subscriptions';

describe('Portal subscriptions', () => {
  beforeEach(() => {
    setupPortalMocks();
    setupSubscriptionMocks();
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
    portal.findNavLink('AI asset endpoints').should('be.visible');
  });
});

describe('Portal subscription management', () => {
  beforeEach(() => {
    setupPortalMocks({ isMaaSAdmin: true });
    setupGovernanceMocks();
  });

  it('creates a subscription with a group, model and token limit through the portal API', () => {
    cy.intercept('POST', maasApi('/new-subscription'), {
      data: mockCreateSubscriptionResponse(),
    }).as('createSubscription');
    portal.visit('/maas/maas-governance/subscriptions/create');
    createSubscriptionPage.findCreateButton().should('be.disabled');
    createSubscriptionPage.findDisplayNameInput().type('Test Subscription');
    createSubscriptionPage.findGroupsSelect().click();
    createSubscriptionPage.findGroupOption('premium-users').click();
    createSubscriptionPage.findGroupsInput().type('{esc}');
    createSubscriptionPage.findAddModelsButton().click();
    addModelsToSubscriptionModal
      .findToggleModelButton('granite-3-8b-instruct', 'maas-models')
      .click();
    addModelsToSubscriptionModal.findConfirmButton().click();
    createSubscriptionPage.addTokenRateLimit(0);
    editRateLimitsModal.findCountInput(0).clear().type('5000');
    editRateLimitsModal.findTimeInput(0).clear().type('1');
    editRateLimitsModal.findSaveButton().click();
    createSubscriptionPage.findCreateButton().click();
    cy.wait('@createSubscription')
      .its('request.body.data')
      .should((data) => {
        expect(data.displayName).to.equal('Test Subscription');
        expect(data.owner.groups).to.deep.equal([{ name: 'premium-users' }]);
        expect(data.modelRefs[0]).to.include({
          name: 'granite-3-8b-instruct',
          namespace: 'maas-models',
        });
        expect(data.modelRefs[0].tokenRateLimits[0].limit).to.equal(5000);
      });
    cy.location('pathname').should('eq', portalPath('/maas/maas-governance/subscriptions'));
    subscriptionsPage.findTable().should('be.visible');
  });

  it('deletes a subscription and refreshes governance without leaving the portal', () => {
    cy.intercept('DELETE', maasApi('/subscription/premium-team-sub'), {
      data: { message: 'Subscription deleted' },
    }).as('deleteSubscription');
    portal.visit('/maas/maas-governance/subscriptions');
    subscriptionsPage.getRow('Premium Team Subscription').findActionsToggle().click();
    subscriptionsPage.findDeleteMenuItem().click();
    deleteSubscriptionModal.findInput().type('Premium Team Subscription');
    cy.intercept('GET', maasApi('/all-subscriptions'), {
      data: mockSubscriptions().filter((s) => s.name !== 'premium-team-sub'),
    }).as('refreshSubscriptions');
    deleteSubscriptionModal.findSubmitButton().click();
    cy.wait(['@deleteSubscription', '@refreshSubscriptions']);
    subscriptionsPage.findTable().should('not.contain.text', 'Premium Team Subscription');
    cy.location('pathname').should('eq', portalPath('/maas/maas-governance/subscriptions'));
  });
});
