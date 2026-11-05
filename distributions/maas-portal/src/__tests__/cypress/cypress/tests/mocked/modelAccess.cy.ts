import {
  mockSubscriptionListItems,
  mockSubscriptions,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { subscriptionsPage } from '@odh-dashboard/cypress/cypress/pages/modelsAsAService';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';

describe('Grid Model Access', () => {
  it('shows the read-only subscription table and deep links for a MaaS admin', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    cy.intercept('GET', maasApi('/subscriptions/premium-team-sub'), {
      data: mockSubscriptionListItems()[0],
    }).as('subscriptionDetails');
    portal.visit('/maas/models');
    cy.wait('@whoami');
    portal.findNavLink('Model Access').click();
    cy.location('pathname').should('eq', portalPath('/maas/model-access'));
    cy.findByTestId('app-page-title').should('have.text', 'Model Access');
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team');
    cy.findByRole('columnheader', { name: 'Status' }).should('not.exist');
    cy.findByRole('button', { name: /create subscription/i }).should('not.exist');
    cy.findByTestId('subscription-actions').should('not.exist');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).click();
    cy.wait('@subscriptionDetails');
    cy.location('pathname').should('eq', portalPath('/maas/model-access/view/premium-team-sub'));
    cy.findByTestId('app-page-title').should('contain.text', 'Premium Team');
    cy.reload();
    cy.findByTestId('breadcrumb-model-access-link').should(
      'have.attr',
      'href',
      portalPath('/maas/model-access'),
    );
    cy.findByTestId('breadcrumb-model-access-link').click();
    cy.findByTestId('subscriptions-table').should('be.visible');
  });

  it('does not expose Model Access to non-admin users', () => {
    setupPortalMocks();
    portal.visit('/maas/models');
    cy.wait('@whoami');
    portal.findNavLink('Model Access').should('not.exist');
  });

  it('expands the group and model counts to show their rows', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    const premiumSubscription = mockSubscriptions()[0];
    cy.intercept('GET', maasApi('/admin-subscriptions'), {
      data: [
        {
          ...premiumSubscription,
          owner: {
            groups: [...premiumSubscription.owner.groups, { name: 'data-science' }],
          },
        },
      ],
    }).as('adminSubscriptions');
    portal.visit('/maas/model-access');
    cy.wait('@adminSubscriptions');

    const premiumRow = subscriptionsPage.getRow('Premium Team Subscription');
    premiumRow.findExpandGroupButton().should('contain.text', '2').click();
    premiumRow.findGroupsExpandedPanel().should('be.visible');
    premiumRow.findExpandedGroupItems().should('have.length', 2);
    premiumRow.findGroupsExpandedPanel().should('contain.text', 'premium-users');
    premiumRow.findGroupsExpandedPanel().should('contain.text', 'data-science');

    premiumRow.findExpandModelButton().should('contain.text', '2').click();
    premiumRow.findGroupsExpandedPanel().should('not.be.visible');
    premiumRow.findModelsExpandedPanel().within(() => {
      cy.get('[data-testid="expanded-subscription-model-row"]').should('have.length', 2);
      cy.get('[data-testid="expanded-subscription-model-row"]')
        .eq(0)
        .should('contain.text', 'Granite 3 8B Instruct')
        .and('contain.text', '100,000 / 24 hours');
      cy.get('[data-testid="expanded-subscription-model-row"]')
        .eq(1)
        .should('contain.text', 'Flan T5 Small')
        .and('contain.text', '200,000 / 24 hours');
    });
  });

  it('filters admin subscriptions by subscription name', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    portal.visit('/maas/model-access');
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team Subscription');
    cy.findByTestId('model-access-table-toolbar').findByRole('combobox').click();
    cy.findByRole('option', { name: 'Basic Team Subscription' }).click();
    cy.findByTestId('subscription-row').should('have.length', 1);
    cy.findByRole('link', { name: 'Basic Team Subscription' }).should('be.visible');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('not.exist');
  });

  it('filters admin subscriptions by group', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    portal.visit('/maas/model-access');
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team Subscription');
    cy.findByTestId('model-access-table-toolbar-dropdown').click();
    cy.findByTestId('model-access-table-toolbar-option-group').findByRole('menuitem').click();
    cy.findByTestId('model-access-table-toolbar').findByRole('combobox').click();
    cy.findByRole('option', { name: 'platform-admins' }).click();
    cy.findByTestId('subscription-row').should('have.length', 1);
    cy.findByRole('link', { name: 'Enterprise Multi-Group Llama Access' }).should('be.visible');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('not.exist');
  });

  it('filters admin subscriptions by model', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    portal.visit('/maas/model-access');
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team Subscription');
    cy.findByTestId('model-access-table-toolbar-dropdown').click();
    cy.findByTestId('model-access-table-toolbar-option-model').findByRole('menuitem').click();
    cy.findByTestId('model-access-table-toolbar').findByRole('combobox').type('llama');
    cy.findByRole('option', { name: 'llama-3-70b-instruct' }).click();
    cy.findByTestId('subscription-row').should('have.length', 1);
    cy.findByRole('link', { name: 'Enterprise Multi-Group Llama Access' }).should('be.visible');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('not.exist');
  });

  it('shows the empty and error states from admin-subscriptions', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    cy.intercept('GET', maasApi('/admin-subscriptions'), { data: [] }).as('emptySubscriptions');
    portal.visit('/maas/model-access');
    cy.wait('@emptySubscriptions');
    cy.findByText('No subscriptions').should('be.visible');
    cy.intercept('GET', maasApi('/admin-subscriptions'), {
      statusCode: 503,
      body: { error: { code: '503', message: 'Subscriptions unavailable' } },
    }).as('failedSubscriptions');
    cy.reload();
    cy.wait('@failedSubscriptions');
    cy.findByTestId('error-empty-state-body').should('be.visible');
  });
});
