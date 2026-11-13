import {
  mockSubscriptionListItems,
  mockSubscriptions,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { subscriptionsPage } from '@odh-dashboard/cypress/cypress/pages/modelsAsAService';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';

describe('Grid Model access', () => {
  it('shows the read-only subscription table and deep links for a MaaS admin', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    cy.intercept('GET', maasApi('/subscriptions/premium-team-sub'), {
      data: mockSubscriptionListItems()[0],
    }).as('subscriptionDetails');
    portal.visit('/maas/models');
    cy.wait('@whoami');
    portal.findNavLink('Model access').click();
    cy.location('pathname').should('eq', portalPath('/maas/model-access'));
    cy.findByTestId('app-page-title').should('have.text', 'Model access');
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

  it('does not expose Model access to non-admin users', () => {
    setupPortalMocks();
    portal.visit('/maas/models');
    cy.wait('@whoami');
    portal.findNavLink('Model access').should('not.exist');
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

  it('filters admin subscriptions by free-text search across subscription details', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    portal.visit('/maas/model-access');
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team Subscription');

    // Matches the subscription display name
    cy.findByTestId('model-access-subscription-filter-input').type('Basic Team');
    cy.findAllByTestId('subscription-row').should('have.length', 1);
    cy.findByRole('link', { name: 'Basic Team Subscription' }).should('be.visible');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('not.exist');

    // Matches the group name
    cy.findByTestId('model-access-subscription-filter-input').clear().type('beta-testers');
    cy.findAllByTestId('subscription-row').should('have.length', 1);

    // Matches the model display name across multiple subscriptions
    cy.findByTestId('model-access-subscription-filter-input').clear().type('Flan T5');
    cy.findAllByTestId('subscription-row').should('have.length', 3);
    cy.findByRole('link', { name: 'Basic Team Subscription' }).should('be.visible');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('be.visible');
    cy.findByRole('link', { name: 'Enterprise Multi-Group Llama Access' }).should('not.exist');

    // A search with no matches empties the table until cleared
    cy.findByTestId('model-access-subscription-filter-input').clear().type('missing-subscription');
    cy.findAllByTestId('subscription-row').should('not.exist');
    cy.findAllByRole('button', { name: 'Clear all filters' }).first().click();
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team Subscription');
  });

  it("shows the caller's organization groups by the organization's name, and other groups as they are", () => {
    const orgId = '53d4f57e-3588-55e8-b96c-4ec54a7c42fa';
    setupPortalMocks({ isMaaSAdmin: true });
    cy.intercept('GET', maasApi('/whoami'), {
      data: { sub: 'portal-user', isAdmin: true, orgId, orgName: 'Grid Tenant 2' },
    }).as('whoami');
    const premiumSubscription = mockSubscriptions()[0];
    cy.intercept('GET', maasApi('/admin-subscriptions'), {
      data: [
        {
          ...premiumSubscription,
          owner: { groups: [{ name: `${orgId}/ai-grid-bob` }, { name: 'data-science' }] },
        },
      ],
    }).as('adminSubscriptions');
    portal.visit('/maas/model-access');
    cy.wait('@adminSubscriptions');

    const premiumRow = subscriptionsPage.getRow('Premium Team Subscription');
    premiumRow.findExpandGroupButton().click();
    premiumRow.findGroupsExpandedPanel().within(() => {
      cy.findByTestId('group-name').should('have.text', 'Grid Tenant 2/ai-grid-bob');
      cy.contains(orgId).should('not.exist');
      cy.findAllByTestId('expanded-group-name').eq(1).should('have.text', 'data-science');
      cy.findByTestId('group-organization').click();
    });
    cy.findByText('Organization ID').should('be.visible');
    cy.contains(orgId).should('be.visible');

    // The filter lists the group by the organization's name and still matches its full name.
    cy.findByTestId('model-access-table-toolbar-dropdown').click();
    cy.findByTestId('model-access-table-toolbar-option-group').findByRole('menuitem').click();
    cy.findByTestId('model-access-table-toolbar').findByRole('combobox').click();
    cy.findByRole('option', { name: 'Grid Tenant 2/ai-grid-bob' }).click();
    cy.findByTestId('subscription-row').should('have.length', 1);
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

  it('filters admin subscriptions by model selection and by model text', () => {
    setupPortalMocks({ isMaaSAdmin: true });
    portal.visit('/maas/model-access');
    cy.findByTestId('subscriptions-table').should('contain.text', 'Premium Team Subscription');
    cy.findByTestId('model-access-table-toolbar-dropdown').click();
    cy.findByTestId('model-access-table-toolbar-option-model').findByRole('menuitem').click();

    // Selecting a model option filters to its subscriptions
    cy.findByTestId('model-access-table-toolbar').findByRole('combobox').type('llama');
    cy.findByRole('option', { name: 'llama-3-70b-instruct' }).click();
    cy.findAllByTestId('subscription-row').should('have.length', 1);
    cy.findByRole('link', { name: 'Enterprise Multi-Group Llama Access' }).should('be.visible');
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('not.exist');

    // A typed model text search matches the model display name
    cy.findByTestId('model-access-model-filter-toggle')
      .findByRole('button', { name: 'Clear input value' })
      .click();
    cy.findByTestId('model-access-model-filter-toggle').findByRole('combobox').type('Granite 3 8B');
    cy.findByRole('option', { name: 'Filter by "Granite 3 8B"' }).click();
    cy.findAllByTestId('subscription-row').should('have.length', 1);
    cy.findByRole('link', { name: 'Premium Team Subscription' }).should('be.visible');
    cy.findByRole('link', { name: 'Enterprise Multi-Group Llama Access' }).should('not.exist');
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
