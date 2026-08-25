import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockSearchResponse } from './maasApiKeysTestUtils';
import { asClusterAdminUser } from '../../../utils/mockUsers';
import {
  apiKeysPage,
  revokeAPIKeyModal,
  createApiKeyModal,
  modelInfoPopover,
  mySubscriptionsPage,
  subscriptionsTab,
} from '../../../pages/modelsAsAService';
import { mockAPIKeys, mockSubscriptionListItems } from '../../../utils/maasUtils';

describe('API keys - Subscription Tab', () => {
  beforeEach(() => {
    asClusterAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
      }),
    );

    cy.interceptOdh('GET /maas/api/v1/user', {
      data: { userId: 'test-user', clusterAdmin: false },
    });
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: true } });
    cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
        },
        conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
      }),
    );

    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      const subscriptionFilter = req.body?.data?.filters?.subscription as string | undefined;
      const keys = mockAPIKeys().filter(
        (key) =>
          (!subscriptionFilter || key.subscription === subscriptionFilter) &&
          (key.status === 'active' || key.status === 'expired'),
      );
      req.reply(mockSearchResponse(keys));
    }).as('initialSearch');

    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: mockSubscriptionListItems(),
    }).as('getSubscriptions');

    cy.intercept('GET', '/maas/api/v1/subscriptions/*', (req) => {
      const id = req.url.split('/').pop();
      const sub = mockSubscriptionListItems().find((s) => s.subscription_id_header === id);
      req.reply(sub ? { data: sub } : { statusCode: 404, body: { error: 'not found' } });
    }).as('getSubscriptionById');
  });

  it('should navigate to subscriptions tab', () => {
    apiKeysPage.visit();
    cy.wait('@initialSearch');

    apiKeysPage.findTitle().should('contain.text', 'API keys');
    cy.contains('Manage API keys that can be used to authenticate with model endpoints.').should(
      'exist',
    );

    apiKeysPage.findApiKeysTab().should('have.attr', 'aria-selected', 'true');
    apiKeysPage.findTable().should('exist');
    apiKeysPage.findRows().should('have.length', 3);

    apiKeysPage.findSubscriptionsTab().click();
    cy.url().should('include', '/maas/keys-and-subs/subscriptions');
    apiKeysPage.findSubscriptionsTab().should('have.attr', 'aria-selected', 'true');

    cy.contains('View your subscriptions and the models they give you access to.').should('exist');
  });

  it('should display subscription view with search', () => {
    apiKeysPage.visit();
    cy.wait('@initialSearch');

    apiKeysPage.findSubscriptionsTab().click();
    subscriptionsTab.findSubscriptionsTable().should('exist');

    subscriptionsTab.findSubscriptionRows().should('have.length', 2);
    subscriptionsTab.findSubscriptionsTable().should('contain.text', 'Premium Team');
    subscriptionsTab.findSubscriptionsTable().should('contain.text', 'Basic Team');

    subscriptionsTab.findSubscriptionRows().eq(0).should('contain.text', '10+ active keys');
    subscriptionsTab.findSubscriptionRows().eq(1).should('contain.text', '5 active keys');

    subscriptionsTab.findSearchInput().type('Premium');
    subscriptionsTab.findSubscriptionRows().should('have.length', 1);
    subscriptionsTab.findSubscriptionsTable().should('contain.text', 'Premium Team');
    subscriptionsTab.findSubscriptionsTable().should('not.contain.text', 'Basic Team');

    subscriptionsTab.clearSearch();
    subscriptionsTab.findSubscriptionRows().should('have.length', 2);

    subscriptionsTab.expandSubscriptionRow(0);
    subscriptionsTab.findSubscriptionsTable().should('contain.text', 'Granite 3 8B Instruct');
  });

  it('should display model view with search', () => {
    apiKeysPage.visit();
    cy.wait('@initialSearch');

    apiKeysPage.findSubscriptionsTab().click();
    subscriptionsTab.findSortByModelButton().click();
    subscriptionsTab.findModelsTable().should('exist');

    subscriptionsTab.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');
    subscriptionsTab.findModelsTable().should('contain.text', 'Flan T5 Small');

    subscriptionsTab.findSearchInput().type('Granite');
    subscriptionsTab.findModelsTable().should('contain.text', 'Granite 3 8B Instruct');
    subscriptionsTab.findModelsTable().should('not.contain.text', 'Flan T5 Small');

    subscriptionsTab.clearSearch();
    subscriptionsTab.findModelsTable().should('contain.text', 'Flan T5 Small');

    subscriptionsTab.expandModelGroupRow(0);
    subscriptionsTab.findModelsTable().should('contain.text', 'Premium Team');
    subscriptionsTab.findModelsTable().should('contain.text', 'Basic Team');
  });

  it('should show model info popover on the subscriptions tab', () => {
    const premiumSubscriptionId = 'premium-team-sub';
    const graniteDisplayName = 'Granite 3 8B Instruct';
    const graniteModelId = 'granite-3-8b-instruct';
    const graniteDescription =
      'Granite 3 8B Instruct is a large language model that is used for advanced tasks.';

    apiKeysPage.visit();
    cy.wait('@initialSearch');

    apiKeysPage.findSubscriptionsTab().click();
    cy.wait('@getSubscriptions');

    cy.step('Subscription view shows model info popover on expanded row');
    subscriptionsTab.expandSubscriptionRow(0);
    subscriptionsTab
      .findSubscriptionModelsTable(premiumSubscriptionId)
      .should('contain.text', graniteDisplayName);
    subscriptionsTab
      .findModelInfoButtonInSubscriptionTable(premiumSubscriptionId, graniteModelId)
      .click();
    modelInfoPopover.findBody().should('be.visible');
    modelInfoPopover.findBody().should('contain.text', 'Model ID');
    modelInfoPopover.findModelIdCopy().should('have.value', graniteModelId);
    modelInfoPopover.findBody().should('contain.text', 'Description');
    modelInfoPopover.findBody().should('contain.text', graniteDescription);

    cy.step('Model view shows model info popover on model group row');
    cy.get('body').type('{esc}');
    subscriptionsTab.findSortByModelButton().click();
    subscriptionsTab.findModelInfoButtonInModelsTable(graniteModelId).click();
    modelInfoPopover.findBody().should('be.visible');
    modelInfoPopover.findBody().should('contain.text', 'Model ID');
    modelInfoPopover.findModelIdCopy().should('have.value', graniteModelId);
    modelInfoPopover.findBody().should('contain.text', 'Description');
    modelInfoPopover.findBody().should('contain.text', graniteDescription);
  });

  it('should show a key count badge when key_count is 0 or absent', () => {
    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: [
        {
          // eslint-disable-next-line camelcase
          subscription_id_header: 'no-keys-sub',
          // eslint-disable-next-line camelcase
          subscription_description: 'Subscription with no keys',
          // eslint-disable-next-line camelcase
          display_name: 'No Keys Sub',
          priority: 1,
          // eslint-disable-next-line camelcase
          key_count: 0,
          // eslint-disable-next-line camelcase
          model_refs: [],
        },
      ],
    });

    apiKeysPage.visit();
    cy.wait('@initialSearch');

    apiKeysPage.findSubscriptionsTab().click();
    subscriptionsTab.findSubscriptionRows().should('have.length', 1);
    subscriptionsTab.findSubscriptionRows().eq(0).should('contain.text', 'No Keys Sub');
    subscriptionsTab.findSubscriptionRows().eq(0).should('contain.text', '0 active keys');
  });

  it('should show empty state when no subscriptions exist', () => {
    cy.interceptOdh('GET /maas/api/v1/subscriptions', { data: [] }).as('emptySubscriptions');

    apiKeysPage.visit();
    cy.wait('@initialSearch');

    apiKeysPage.findSubscriptionsTab().click();
    cy.wait('@emptySubscriptions');

    subscriptionsTab.findEmptyState().should('exist');
    subscriptionsTab.findSubscriptionsTable().should('not.exist');
    subscriptionsTab.findEmptyState().should('contain.text', 'Request a subscription');
  });

  it('should show the correct data on the my subscriptions view page', () => {
    mySubscriptionsPage.visit('premium-team-sub');
    cy.wait('@initialSearch');
    mySubscriptionsPage.findTitle().should('contain.text', 'Premium Team');
    mySubscriptionsPage.findDetailsSection().should('exist');
    mySubscriptionsPage.findDetailsSection().should('contain.text', 'premium-team-sub');
    mySubscriptionsPage.findDetailsSection().should('contain.text', 'Premium Team');
    mySubscriptionsPage.findDetailsSection().should('contain.text', 'Premium Team Subscription');
    mySubscriptionsPage.findModelsSection().should('contain.text', 'granite-3-8b-instruct');
    mySubscriptionsPage.findModelsSection().should('contain.text', 'flan-t5-small');
    mySubscriptionsPage.findModelsSection().should('contain.text', '100,000 / 24 hours');
    mySubscriptionsPage.findModelsSection().should('contain.text', '200,000 / 24 hours');
    mySubscriptionsPage.findApiKeysTable().should('exist');
    mySubscriptionsPage.findApiKeysTable().should('contain.text', 'production-backend');
    mySubscriptionsPage.findApiKeysTable().should('not.contain.text', 'ci-pipeline');
    mySubscriptionsPage.findApiKeysTable().should('contain.text', 'old-service-key');
    mySubscriptionsPage.findApiKeysTable().should('not.contain.text', 'development-testing');
  });
  it('should prefill the api key form with the subscription details', () => {
    mySubscriptionsPage.visit('premium-team-sub');
    mySubscriptionsPage.findCreateApiKeyButton().click();
    createApiKeyModal
      .findSubscriptionToggle()
      .find('[role="combobox"]')
      .should('have.value', 'Premium Team');
    createApiKeyModal.findSubscriptionToggle().should('have.attr', 'disabled');
  });
  it('should revoke an api key from the my subscriptions view page', () => {
    mySubscriptionsPage.visit('premium-team-sub');
    mySubscriptionsPage.findApiKeysTable().should('exist');
    mySubscriptionsPage.findApiKeysTable().should('contain.text', 'production-backend');
    mySubscriptionsPage.getRow('production-backend').findKebabAction('Revoke').click();

    revokeAPIKeyModal.shouldBeOpen();
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().type('incorrect');
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().clear().type('production-backend');
    revokeAPIKeyModal.findRevokeButton().should('be.enabled');

    cy.interceptOdh(
      'DELETE /maas/api/v1/api-keys/:id',
      { path: { id: 'key-prod-backend-001' } },
      {
        data: {
          id: 'key-prod-backend-001',
          name: 'production-backend',
          description: 'Production API key for backend service',
          status: 'revoked',
          creationDate: '2026-01-07T11:54:34.521671447-05:00',
        },
      },
    ).as('deleteApiKey');

    revokeAPIKeyModal.findRevokeButton().click();

    cy.wait('@deleteApiKey').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
  });

  it('should sort subscription details api keys by column', () => {
    mySubscriptionsPage.visit('premium-team-sub');
    cy.wait('@initialSearch');
    mySubscriptionsPage.findApiKeysTable().should('exist');

    const premiumKeys = mockAPIKeys().filter(
      (k) => k.subscription === 'premium-team-sub' && k.status !== 'revoked',
    );
    const nameAsc = premiumKeys.toSorted((a, b) => a.name.localeCompare(b.name));
    const expiresAsc = premiumKeys.toSorted(
      (a, b) =>
        new Date(a.expirationDate ?? 0).getTime() - new Date(b.expirationDate ?? 0).getTime(),
    );

    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      req.reply(mockSearchResponse(nameAsc));
    }).as('sortNameAsc');
    mySubscriptionsPage.findColumnSortButton('Name').click();

    cy.wait('@sortNameAsc').then((interception) => {
      expect(interception.request.body.data).to.have.nested.property('sort.by', 'name');
    });
    mySubscriptionsPage
      .findApiKeysTable()
      .find('tbody tr')
      .eq(0)
      .should('contain.text', 'old-service-key');
    mySubscriptionsPage
      .findApiKeysTable()
      .find('tbody tr')
      .eq(1)
      .should('contain.text', 'production-backend');

    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      req.reply(mockSearchResponse(expiresAsc));
    }).as('sortExpiresAsc');
    mySubscriptionsPage.findColumnSortButton('Expires').click();

    cy.wait('@sortExpiresAsc').then((interception) => {
      expect(interception.request.body.data).to.have.nested.property('sort.by', 'expires_at');
    });
    mySubscriptionsPage
      .findApiKeysTable()
      .find('tbody tr')
      .eq(0)
      .should('contain.text', 'old-service-key');
    mySubscriptionsPage
      .findApiKeysTable()
      .find('tbody tr')
      .eq(1)
      .should('contain.text', 'production-backend');

    const mockReply = () => mockSearchResponse(premiumKeys);

    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      req.reply(mockReply());
    }).as('sortCreated');
    mySubscriptionsPage.findColumnSortButton('Created').click();
    cy.wait('@sortCreated').then((interception) => {
      expect(interception.request.body.data).to.have.nested.property('sort.by', 'created_at');
    });

    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      req.reply(mockReply());
    }).as('sortLastUsed');
    mySubscriptionsPage.findColumnSortButton('Last used').click();
    cy.wait('@sortLastUsed').then((interception) => {
      expect(interception.request.body.data).to.have.nested.property('sort.by', 'last_used_at');
    });
  });
});
