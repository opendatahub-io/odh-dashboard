import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import type { APIKey } from '@odh-dashboard/maas/types/api-key';
import { formatApiKeyHiddenPreview } from '@odh-dashboard/maas/utils/api-keys';
import { mockSubscriptionDetails, mockSearchResponse } from './maasApiKeysTestUtils';
import { asClusterAdminUser, asProjectAdminUser } from '../../../utils/mockUsers';
import {
  apiKeysPage,
  bulkRevokeAPIKeyModal,
  inactiveStatusPopover,
  revokeAPIKeyModal,
  copyApiKeyModal,
  createApiKeyModal,
} from '../../../pages/modelsAsAService';
import {
  mockAPIKeys,
  mockCreateAPIKeyResponse,
  mockSubscriptionListItems,
  mockSubscriptions,
} from '../../../utils/maasUtils';

describe('API Keys Page', () => {
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
    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse(
        mockAPIKeys().filter((k) => k.status === 'active' || k.status === 'expired'),
        mockSubscriptionDetails,
      ),
    ).as('initialSearch');
    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: mockSubscriptionListItems(),
    }).as('getSubscriptions');
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions(),
    }).as('getAllSubscriptions');
    cy.interceptOdh('GET /maas/api/v1/api-keys-config', {
      data: {
        // eslint-disable-next-line camelcase
        max_expiration_days: 365,
        // eslint-disable-next-line camelcase
        ephemeral_max_expiration: '1h',
      },
    }).as('getApiKeyConfig');
    cy.interceptOdh('GET /maas/api/v1/gateway-url', {
      data: { url: 'https://api.example.com/maas-api' },
    }).as('getGatewayUrl');

    apiKeysPage.visit();
    cy.wait('@initialSearch');
  });

  it('should display the API keys table page with active and expired keys on initial load', () => {
    apiKeysPage.findTitle().should('contain.text', 'API keys');
    cy.contains('Manage API keys that can be used to authenticate with model endpoints.').should(
      'exist',
    );

    apiKeysPage.findTable().should('exist');
    apiKeysPage.findRows().should('have.length', 3);

    apiKeysPage.findStatusFilterToggle().click();
    apiKeysPage.findStatusFilterOptionCheckbox('Active').should('be.checked');
    apiKeysPage.findStatusFilterOptionCheckbox('Expired').should('be.checked');
    apiKeysPage.findStatusFilterOptionCheckbox('Revoked').should('not.be.checked');

    const developmentTestingRow = apiKeysPage.getRow('development-testing');
    developmentTestingRow.findName().should('contain.text', 'development-testing');
    developmentTestingRow
      .findDescription()
      .should('contain.text', 'Development API key for testing purposes');
    developmentTestingRow.findStatus().should('contain.text', 'Active');
    developmentTestingRow.findCreationDate().should('contain.text', 'Jan 14, 2026');
    developmentTestingRow.findExpirationDate().should('contain.text', 'Jan 15, 2026');
  });

  it('should display empty table with toolbar and disable revoke all when user has no active keys', () => {
    const revokedKeys = mockAPIKeys().filter((k) => k.status === 'revoked');
    asProjectAdminUser();
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });

    // Existence check (no status filter) returns the revoked key;
    // filtered search (status: active) returns nothing.
    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      const hasStatusFilter = req.body?.data?.filters?.status?.length > 0;
      req.reply(hasStatusFilter ? mockSearchResponse([]) : mockSearchResponse(revokedKeys));
    }).as('apiKeysSearch');

    apiKeysPage.visit();
    cy.wait('@apiKeysSearch');

    apiKeysPage.findTitle().should('contain.text', 'API keys');

    // Table shows no results for the active filter since only revoked keys exist
    apiKeysPage.findTable().should('exist');
    apiKeysPage.findEmptyTableState().should('exist');
    apiKeysPage.findEmptyTableState().should('contain.text', 'No results found');

    // Toolbar and create button are still accessible
    apiKeysPage.findToolbar().should('exist');
    apiKeysPage.findCreateApiKeyButton().should('exist').and('be.enabled');

    // Status filter defaults to Active
    apiKeysPage.findStatusFilterToggle().click();
    apiKeysPage.findStatusFilterOptionCheckbox('Active').should('be.checked');
    apiKeysPage.findStatusFilterOptionCheckbox('Expired').should('be.checked');
    apiKeysPage.findStatusFilterOptionCheckbox('Revoked').should('not.be.checked');
    apiKeysPage.findStatusFilterToggle().click();

    // Revoke all should be disabled when no active keys are present
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysActionButton().should('be.disabled');
    apiKeysPage.findActionsToggle().click();

    // Clearing filters reveals the revoked key
    apiKeysPage.clearAllFilters();
    cy.wait('@apiKeysSearch');
    cy.wait('@apiKeysSearch');

    apiKeysPage.findEmptyTableState().should('not.exist');
    apiKeysPage.findRows().should('have.length', 1);
    apiKeysPage.getRow('ci-pipeline').findStatus().should('contain.text', 'Revoked');
  });

  it('should display empty state when no keys are present', () => {
    asProjectAdminUser();
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse([])).as('emptySearch');
    apiKeysPage.visit();
    cy.wait('@emptySearch');
    cy.wait('@emptySearch');

    apiKeysPage.findEmptyState().should('exist');
    apiKeysPage.findEmptyState().should('contain.text', 'No API keys');
    apiKeysPage.findCreateApiKeyButton().should('exist').and('be.enabled');
  });

  it('should display the empty table when the only key is revoked', () => {
    const [singleKey] = mockAPIKeys().filter((k) => k.id === 'key-prod-backend-001');
    expect(singleKey).to.not.equal(undefined);

    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse([singleKey], mockSubscriptionDetails),
    ).as('singleKeySearch');

    apiKeysPage.visit();
    cy.wait('@singleKeySearch');

    apiKeysPage.findTable().should('exist');
    apiKeysPage.findRows().should('have.length', 1);
    apiKeysPage.getRow('production-backend').findStatus().should('contain.text', 'Active');

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

    // Existence check (no status filter) still finds the revoked key → table page.
    // Default Active/Expired filter returns nothing → empty table, not empty-state page.
    const revokedKey: APIKey = { ...singleKey, status: 'revoked' };
    cy.intercept('POST', '/maas/api/v1/api-keys/search', (req) => {
      const hasStatusFilter = req.body?.data?.filters?.status?.length > 0;
      req.reply(
        hasStatusFilter
          ? mockSearchResponse([])
          : mockSearchResponse([revokedKey], mockSubscriptionDetails),
      );
    }).as('postRevokeSearch');

    apiKeysPage.getRow('production-backend').findKebabAction('Revoke').click();
    revokeAPIKeyModal.shouldBeOpen();
    revokeAPIKeyModal.findRevokeConfirmationInput().type('production-backend');
    revokeAPIKeyModal.findRevokeButton().click();

    cy.wait('@deleteApiKey');
    cy.wait('@postRevokeSearch');
    cy.wait('@postRevokeSearch');

    apiKeysPage.findEmptyState().should('not.exist');
    apiKeysPage.findTable().should('exist');
    apiKeysPage.findEmptyTableState().should('exist');
    apiKeysPage.findEmptyTableState().should('contain.text', 'No results found');
    apiKeysPage.findToolbar().should('exist');
  });

  it('should display a useful error state when the API keys search fails and still show the tabs', () => {
    cy.intercept('POST', '/maas/api/v1/api-keys/search', {
      statusCode: 500,
      body: {
        error: {
          code: '500',
          message:
            'Internal Server Error - here is a bunch of info to help you debug it: /maas/api/v1/api-keys/search',
        },
      },
    }).as('searchError');
    apiKeysPage.visit();
    cy.wait('@searchError');
    apiKeysPage.findErrorState().should('exist');
    apiKeysPage.findSubscriptionsTab().should('exist');
    apiKeysPage.findApiKeysTab().should('exist');
    apiKeysPage
      .findErrorState()
      .should(
        'contain.text',
        'Internal Server Error - here is a bunch of info to help you debug it: /maas/api/v1/api-keys/search',
      );
  });

  it('should show Inactive status with popover for keys whose subscription was deleted', () => {
    const deletedSubscriptionKey: APIKey = {
      id: 'key-deleted-subscription-001',
      name: 'deleted-subscription-key',
      description: 'Key with a deleted subscription',
      creationDate: '2026-01-10T10:00:00Z',
      status: 'active',
      username: 'alice',
      subscription: 'deleted-sub',
    };

    const allActiveKeys = [
      deletedSubscriptionKey,
      ...mockAPIKeys().filter((k) => k.status === 'active'),
    ];
    const searchResponseWithOrphaned = mockSearchResponse(allActiveKeys, mockSubscriptionDetails);

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', searchResponseWithOrphaned).as(
      'searchWithOrphaned',
    );

    apiKeysPage.visit();
    cy.wait('@searchWithOrphaned');

    apiKeysPage.findTable().should('contain.text', 'deleted-subscription-key');

    const deletedSubscriptionRow = apiKeysPage.getRow('deleted-subscription-key');
    deletedSubscriptionRow.findStatus().should('contain.text', 'Inactive').click();
    inactiveStatusPopover.shouldBeVisible();

    deletedSubscriptionRow.findSubscription().should('contain.text', 'deleted-sub');
    deletedSubscriptionRow.findSubscriptionDetailLink().should('not.exist');
    deletedSubscriptionRow.findSubscriptionGovernanceLink().should('not.exist');
  });

  it('should display all API keys when the status filter is cleared', () => {
    apiKeysPage.findRows().should('have.length', 3);
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(mockAPIKeys())).as(
      'clearAllFilters',
    );

    apiKeysPage.clearAllFilters();
    cy.wait('@clearAllFilters');

    const oldServiceKeyRow = apiKeysPage.getRow('old-service-key');
    oldServiceKeyRow.findStatus().should('contain.text', 'Expired');

    const productionBackendRow = apiKeysPage.getRow('production-backend');
    productionBackendRow.findStatus().should('contain.text', 'Active');

    const ciPipelineRow = apiKeysPage.getRow('ci-pipeline');
    ciPipelineRow.findStatus().should('contain.text', 'Revoked');

    const developmentTestingRow = apiKeysPage.getRow('development-testing');
    developmentTestingRow.findStatus().should('contain.text', 'Active');
  });

  it('should display the subscription column with display names', () => {
    apiKeysPage.findTable().contains('th', 'Subscription').should('exist');

    const prodRow = apiKeysPage.getRow('production-backend');
    prodRow.findSubscription().should('contain.text', 'Premium Team');

    const devRow = apiKeysPage.getRow('development-testing');
    devRow.findSubscription().should('contain.text', 'Basic Team');
  });

  it('should link subscription name to the subscription details page when subscription exists', () => {
    const prodRow = apiKeysPage.getRow('production-backend');
    prodRow
      .findSubscriptionDetailLink()
      .should('have.attr', 'href')
      .and('include', '/maas/keys-and-subs/subscriptions/premium-team-sub');
  });

  it('should show View in MaaS governance under the subscription for admins when the CR exists', () => {
    const prodRow = apiKeysPage.getRow('production-backend');
    prodRow
      .findSubscriptionGovernanceLink()
      .should('contain.text', 'View in MaaS governance')
      .and('have.attr', 'href')
      .and('include', '/maas/maas-governance/subscriptions/view/premium-team-sub');
  });

  it('should not link My Subscriptions for a sub the admin cannot access, but still show governance link', () => {
    const inaccessibleSubKey: APIKey = {
      id: 'key-inaccessible-sub-001',
      name: 'other-user-inaccessible-sub-key',
      description: 'Key on a subscription the admin does not have in My Subscriptions',
      creationDate: '2026-01-10T10:00:00Z',
      status: 'active',
      username: 'other-user',
      subscription: 'negative-priority-sub',
    };

    // BFF admin enrichment includes the CR in search subscriptionDetails even when
    // it is absent from My Subscriptions (GET /subscriptions).
    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse([inaccessibleSubKey], {
        ...mockSubscriptionDetails,
        'negative-priority-sub': {
          displayName: 'Negative Priority Subscription',
          models: ['flan-t5-small'],
        },
      }),
    ).as('searchInaccessibleSub');
    // My Subscriptions: only premium/basic — not negative-priority-sub (no detail link)
    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: mockSubscriptionListItems(),
    });

    apiKeysPage.visit();
    cy.wait('@searchInaccessibleSub');

    const row = apiKeysPage.getRow('other-user-inaccessible-sub-key');
    row.findStatus().should('contain.text', 'Active');
    row.findSubscription().should('contain.text', 'Negative Priority Subscription');
    row.findSubscriptionDetailLink().should('not.exist');
    row
      .findSubscriptionGovernanceLink()
      .should('have.attr', 'href')
      .and('include', '/maas/maas-governance/subscriptions/view/negative-priority-sub');
  });

  it('should not show View in MaaS governance for non-admin users', () => {
    asProjectAdminUser();
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });
    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse(
        mockAPIKeys().filter((k) => k.status === 'active' || k.status === 'expired'),
        mockSubscriptionDetails,
      ),
    ).as('userSearch');
    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: mockSubscriptionListItems(),
    });

    apiKeysPage.visit();
    cy.wait('@userSearch');

    const prodRow = apiKeysPage.getRow('production-backend');
    prodRow
      .findSubscriptionDetailLink()
      .should('have.attr', 'href')
      .and('include', '/maas/keys-and-subs/subscriptions/premium-team-sub');
    prodRow.findSubscriptionGovernanceLink().should('not.exist');
  });

  it('should filter api keys by subscription and clear the filter', () => {
    const premiumKeys = mockAPIKeys().filter((k) => k.subscription === 'premium-team-sub');
    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse(premiumKeys, {
        'premium-team-sub': mockSubscriptionDetails['premium-team-sub'],
      }),
    ).as('filterBySubscription');

    apiKeysPage.findSubscriptionFilterToggle().click();
    apiKeysPage.findSubscriptionFilterOption('premium-team-sub').click();

    cy.wait('@filterBySubscription').then((interception) => {
      expect(interception.request.body.data.filters.subscription).to.eq('premium-team-sub');
    });
    apiKeysPage.findToolbar().should('contain.text', 'Premium Team');

    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse(mockAPIKeys().filter((k) => k.status === 'active')),
    ).as('clearSubscriptionFilter');

    apiKeysPage.findSubscriptionFilterToggle().click();
    apiKeysPage.findAllSubscriptionsOption().click();

    cy.wait('@clearSubscriptionFilter').then((interception) => {
      expect(interception.request.body.data.filters?.subscription).to.eq(undefined);
    });
    apiKeysPage.findToolbar().should('not.contain.text', 'Premium Team');
  });

  it('should filter api keys by username', () => {
    const aliceKeys = mockAPIKeys().filter((k) => k.username === 'alice');
    apiKeysPage.findRows().should('have.length', 3);

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(aliceKeys)).as(
      'searchByUsername',
    );

    apiKeysPage.findFilterInput().find('input').type('alice');
    apiKeysPage.findUsernameFilterTooltip().should('be.visible');
    apiKeysPage.findFilterSearchButton().click();

    cy.wait('@searchByUsername').then((interception) => {
      expect(interception.request.body.data.filters.username).to.eq('alice');
    });

    apiKeysPage.findRows().should('have.length', 1);
    apiKeysPage
      .getRow('production-backend')
      .findName()
      .should('contain.text', 'production-backend');
  });

  it('should not display the username filter for non-MaaS admins', () => {
    asProjectAdminUser();
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });
    apiKeysPage.visit();
    cy.wait('@initialSearch');
    apiKeysPage.findFilterInput().should('not.exist');
    apiKeysPage.findUsernameFilterTooltip().should('not.exist');
  });

  it('should not display the username column for non-MaaS admins', () => {
    asProjectAdminUser();
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });
    apiKeysPage.visit();
    cy.wait('@initialSearch');
    apiKeysPage.findTable().should('not.contain.text', 'Owner');
  });

  it('should filter api keys by status', () => {
    const filteredKeys = mockAPIKeys().filter((k) => k.status === 'expired');
    apiKeysPage.findRows().should('have.length', 3);

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(filteredKeys)).as(
      'filterByStatus',
    );

    apiKeysPage.findStatusFilterToggle().click();
    apiKeysPage.findStatusFilterOption('Active').click();
    apiKeysPage.findStatusFilterOption('Inactive').click();
    apiKeysPage.findStatusFilterToggle().click();

    // Keys are filtered to show active,inactive and expired by default so here we're looking for just expired since active and inactive was pre-selected
    cy.wait('@filterByStatus');
    cy.wait('@filterByStatus').then((interception) => {
      expect(interception.request.body.data.filters.status).to.deep.equal(['expired']);
    });

    apiKeysPage.findRows().should('have.length', 1);

    const oldServiceKeyRow = apiKeysPage.getRow('old-service-key');
    oldServiceKeyRow.findStatus().should('contain.text', 'Expired');
  });

  it('should sort api keys by name', () => {
    const keys = mockAPIKeys();

    apiKeysPage.findRows().should('have.length', 3);

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortNameAsc',
    );
    apiKeysPage.findColumnSortButton('Name').click();

    cy.wait('@sortNameAsc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'name',
        order: 'asc',
      });
    });

    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse([...keys].reverse()),
    ).as('sortNameDesc');
    apiKeysPage.findColumnSortButton('Name').click();

    cy.wait('@sortNameDesc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'name',
        order: 'desc',
      });
    });
  });

  it('should sort api keys by creation date', () => {
    const keys = mockAPIKeys();

    apiKeysPage.findRows().should('have.length', 3);

    // Creation date is the default active sort (desc). First click toggles to asc.
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortCreationDateAsc',
    );
    apiKeysPage.findColumnSortButton('Created').click();

    cy.wait('@sortCreationDateAsc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'created_at',
        order: 'asc',
      });
    });

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortCreationDateDesc',
    );
    apiKeysPage.findColumnSortButton('Created').click();

    cy.wait('@sortCreationDateDesc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'created_at',
        order: 'desc',
      });
    });
  });

  it('should sort api keys by expiration date', () => {
    const keys = mockAPIKeys();

    apiKeysPage.findRows().should('have.length', 3);

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortExpirationAsc',
    );
    apiKeysPage.findColumnSortButton('Expires').click();

    cy.wait('@sortExpirationAsc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'expires_at',
        order: 'asc',
      });
    });

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortExpirationDesc',
    );
    apiKeysPage.findColumnSortButton('Expires').click();

    cy.wait('@sortExpirationDesc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'expires_at',
        order: 'desc',
      });
    });
  });

  it('should sort api keys by last used', () => {
    const keys = mockAPIKeys();

    apiKeysPage.findRows().should('have.length', 3);

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortLastUsedAsc',
    );
    apiKeysPage.findColumnSortButton('Last used').click();

    cy.wait('@sortLastUsedAsc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'last_used_at',
        order: 'asc',
      });
    });

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortLastUsedDesc',
    );
    apiKeysPage.findColumnSortButton('Last used').click();

    cy.wait('@sortLastUsedDesc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'last_used_at',
        order: 'desc',
      });
    });
  });

  it('should revoke all my API keys', () => {
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });
    apiKeysPage.visit();

    apiKeysPage.findTitle().should('contain.text', 'API keys');
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();

    bulkRevokeAPIKeyModal.shouldBeOpen();
    bulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
    bulkRevokeAPIKeyModal.findRevokeConfirmationInput().type('incorrect');
    bulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
    bulkRevokeAPIKeyModal.findRevokeConfirmationInput().clear().type('test-user');
    bulkRevokeAPIKeyModal.findRevokeButton().should('be.enabled');

    cy.interceptOdh('POST /maas/api/v1/api-keys/bulk-revoke', {
      data: {
        revokedCount: 4,
        message: 'All API keys revoked',
      },
    }).as('deleteAllApiKeys');

    bulkRevokeAPIKeyModal.findRevokeButton().click();

    cy.wait('@deleteAllApiKeys').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
  });

  it('should revoke a specific API key', () => {
    apiKeysPage.findTitle().should('contain.text', 'API keys');
    apiKeysPage.getRow('development-testing').findKebabAction('Revoke').click();

    revokeAPIKeyModal.shouldBeOpen();
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().type('incorrect');
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().clear().type('development-testing');
    revokeAPIKeyModal.findRevokeButton().should('be.enabled');

    cy.interceptOdh(
      'DELETE /maas/api/v1/api-keys/:id',
      { path: { id: 'key-dev-testing-002' } },
      {
        data: {
          id: 'key-dev-testing-002',
          name: 'development-testing',
          description: 'Development API key for testing purposes',
          status: 'revoked',
          creationDate: '2026-01-14T09:54:34.521671447-05:00',
        },
      },
    ).as('deleteApiKey');

    revokeAPIKeyModal.findRevokeButton().click();

    cy.wait('@deleteApiKey').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
  });

  it('should create a new API key with the default 1 day expiration', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');
    createApiKeyModal.findExpirationModeToggle().should('contain.text', 'On date');
    createApiKeyModal.findExpirationDateInput().should('exist');
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findDescriptionInput().type('Production API key for backend service');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();
    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '1d' });
      expect(interception.response?.body?.data).to.include({
        name: 'production-backend',
        expiresAt: '2026-01-20T11:54:34.521671447-05:00',
      });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyName().should('contain.text', 'production-backend');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '1 days');
  });

  it('should show/hide the token when the visibility toggle is clicked', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');
    createApiKeyModal.findExpirationDateInput().should('exist');
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findDescriptionInput().type('Production API key for backend service');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();
    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '1d' });
      expect(interception.response?.body?.data).to.include({
        name: 'production-backend',
        expiresAt: '2026-01-20T11:54:34.521671447-05:00',
      });
    });
    copyApiKeyModal.shouldBeOpen();
    const createdApiKey = mockCreateAPIKeyResponse().key;
    copyApiKeyModal
      .findApiKeyTokenInput()
      .should('have.value', formatApiKeyHiddenPreview(createdApiKey));
    copyApiKeyModal.findApiKeyTokenVisibilityToggle().should('be.visible').click();
    copyApiKeyModal.findApiKeyTokenInput().should('have.value', createdApiKey);

    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite');
    });
    copyApiKeyModal.findApiKeyTokenCopyButton().click();
    cy.get('@clipboardWrite').should('have.been.calledOnce');
    cy.get('@clipboardWrite').should('have.been.calledWith', createdApiKey);
    copyApiKeyModal.findApiKeyTokenVisibilityToggle().should('be.visible').click();
    copyApiKeyModal
      .findApiKeyTokenInput()
      .should('have.value', formatApiKeyHiddenPreview(createdApiKey));
  });

  it('should create an API key with an on-date expiration', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');

    createApiKeyModal.findExpirationModeToggle().should('contain.text', 'On date');
    createApiKeyModal.findExpirationDateInput().should('exist');
    createApiKeyModal.findAfterDaysInput().should('not.exist');
    createApiKeyModal.setExpirationDaysFromToday(45);
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('on-date-key');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();

    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '45d' });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyName().should('contain.text', 'on-date-key');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '45 days');
  });

  it('should create an API key with an after-days expiration', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');

    createApiKeyModal.selectExpirationMode('after');
    createApiKeyModal.findExpirationDatePicker().should('not.exist');
    createApiKeyModal.findAfterDaysInput().should('have.value', '1');
    createApiKeyModal.findExpirationHelper().should('contain.text', 'Enter a value between 1 and');
    createApiKeyModal.setAfterDays(45);
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('after-days-key');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();

    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '45d' });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyName().should('contain.text', 'after-days-key');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '45 days');
  });

  it('should create an API key with the maximum expiration', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');

    createApiKeyModal.selectExpirationMode('max');
    createApiKeyModal.findExpirationDatePicker().should('not.exist');
    createApiKeyModal.findAfterDaysInput().should('not.exist');
    createApiKeyModal
      .findExpirationModeToggle()
      .should('contain.text', 'Use max value of 365 days');
    createApiKeyModal.findExpirationHelper().should('contain.text', 'Expires in 365 days');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('max-expiration-key');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();

    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '365d' });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyName().should('contain.text', 'max-expiration-key');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '365 days (maximum)');
  });

  it('should display the correct information in the copy API key modal', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');
    createApiKeyModal.findExpirationModeToggle().should('contain.text', 'On date');
    createApiKeyModal.findExpirationDateInput().should('exist');
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findDescriptionInput().type('Production API key for backend service');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();
    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '1d' });
      expect(interception.response?.body?.data).to.include({
        name: 'production-backend',
        expiresAt: '2026-01-20T11:54:34.521671447-05:00',
      });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyName().should('contain.text', 'production-backend');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '1 days');

    copyApiKeyModal.findSubscriptionID().should('have.value', 'premium-team-sub');
    copyApiKeyModal.findModelID().should('have.value', 'granite-3-8b-instruct');
    copyApiKeyModal.findAvailableModelsToggle().should('exist');
    copyApiKeyModal.findBaseURL().should('have.value', 'https://api.example.com/maas-api');
    copyApiKeyModal
      .findModelDocumentation()
      .should('have.value', 'https://api.example.com/v1/models/granite-3-8b-instruct/docs');

    //ensure documentation link is not displayed for external models
    copyApiKeyModal.findAvailableModelsToggle().should('contain.text', 'Granite 3 8B Instruct');
    copyApiKeyModal.selectAvailableModel('flan-t5-small');
    copyApiKeyModal.findAvailableModelsToggle().should('contain.text', 'Flan T5 Small');
    copyApiKeyModal.findModelID().should('have.value', 'flan-t5-small');
    copyApiKeyModal.findModelDocumentation().should('not.exist'); // external
  });

  it('should show a validation error for an out-of-range after-days value', () => {
    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    createApiKeyModal.setAfterDays(400);
    createApiKeyModal.findNameInput().type('my-key');
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal.findExpirationHelper().should('contain.text', 'Enter a value between 1 and');
  });

  it('should respect a lower configured max expiration across modes', () => {
    cy.interceptOdh('GET /maas/api/v1/api-keys-config', {
      data: {
        // eslint-disable-next-line camelcase
        max_expiration_days: 90,
        // eslint-disable-next-line camelcase
        ephemeral_max_expiration: '1h',
      },
    }).as('getApiKeyConfig90');

    apiKeysPage.visit();
    cy.wait('@initialSearch');
    cy.wait('@getApiKeyConfig90');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    createApiKeyModal.findExpirationModeToggle().click();
    createApiKeyModal
      .findExpirationModeOption('max')
      .should('contain.text', 'Use max value of 90 days');
    createApiKeyModal.findExpirationModeOption('max').click();
    createApiKeyModal.findExpirationHelper().should('contain.text', 'Expires in 90 days');

    createApiKeyModal.setAfterDays(91);
    createApiKeyModal.findNameInput().type('my-key');
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal
      .findExpirationHelper()
      .should('contain.text', 'Enter a value between 1 and 90');

    createApiKeyModal.setExpirationDaysFromToday(91);
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal.find().contains('Select a date').should('exist');
  });

  it('should display an inline error alert when API key creation fails', () => {
    cy.intercept('POST', '/maas/api/v1/api-keys', {
      statusCode: 400,
      body: {
        error: {
          code: '400',
          message: 'requested expiration (8760h0m0s) exceeds maximum allowed (90 days)',
        },
      },
    }).as('createApiKeyFail');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findSubmitButton().click();

    cy.wait('@createApiKeyFail');

    createApiKeyModal.findErrorAlert().should('exist');
    createApiKeyModal
      .findErrorAlert()
      .should(
        'contain.text',
        'Requested expiration exceeds maximum allowed (90 days). Select a shorter duration and try again.',
      );
    createApiKeyModal.findSubmitButton().should('be.enabled');
  });

  it('should handle subscription selection and submit an API key with the selected subscription', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');

    createApiKeyModal
      .findSubscriptionToggle()
      .find('input')
      .should('have.attr', 'placeholder', 'Select a subscription');
    createApiKeyModal.findSubmitButton().should('be.disabled');

    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal
      .findSubscriptionOption('premium-team-sub')
      .should('contain.text', 'Premium Team')
      .and('contain.text', '2 models');
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findSubscriptionCostCenterDetails().should('be.visible');
    createApiKeyModal.findSubscriptionCostCenter().should('contain.text', 'engineering');
    createApiKeyModal.findSubscriptionModelsTable().should('be.visible');
    createApiKeyModal
      .findSubscriptionModelDisplayName('granite-3-8b-instruct')
      .should('contain.text', 'Granite 3 8B Instruct');
    createApiKeyModal
      .findSubscriptionModelDisplayName('flan-t5-small')
      .should('contain.text', 'Flan T5 Small');
    createApiKeyModal
      .findSubscriptionModelDescription('granite-3-8b-instruct')
      .should(
        'contain.text',
        'Granite 3 8B Instruct is a large language model that is used for advanced tasks.',
      );
    createApiKeyModal
      .findSubscriptionModelDescription('flan-t5-small')
      .should(
        'contain.text',
        'Flan T5 Small is a small language model that is used for basic tasks.',
      );
    createApiKeyModal
      .findSubscriptionModelRateLimit('granite-3-8b-instruct')
      .should('contain.text', '100,000 / 24 hours');
    createApiKeyModal
      .findSubscriptionModelRateLimit('flan-t5-small')
      .should('contain.text', '200,000 / 24 hours');

    createApiKeyModal.findSubmitButton().should('be.disabled');

    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findSubmitButton().should('be.enabled');

    createApiKeyModal.findSubmitButton().click();
    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ subscription: 'premium-team-sub' });
    });
  });

  it('should show a warning and block submission when no subscriptions are available', () => {
    cy.interceptOdh('GET /maas/api/v1/subscriptions', { data: [] }).as('emptySubscriptions');
    apiKeysPage.visit();
    cy.wait('@emptySubscriptions');
    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();

    createApiKeyModal.findNoSubscriptionsAlert().should('be.visible');
    createApiKeyModal.findNameInput().type('my-key');
    createApiKeyModal.findSubmitButton().should('be.disabled');
  });
});
