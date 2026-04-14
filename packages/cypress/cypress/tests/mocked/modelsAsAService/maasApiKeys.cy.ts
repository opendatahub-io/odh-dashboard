import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import type { APIKey, SubscriptionDetail } from '@odh-dashboard/maas/types/api-key';
import {
  asClusterAdminUser,
  asProductAdminUser,
  asProjectAdminUser,
} from '../../../utils/mockUsers';
import {
  adminBulkRevokeAPIKeyModal,
  apiKeysPage,
  bulkRevokeAPIKeyModal,
  revokeAPIKeyModal,
  copyApiKeyModal,
  createApiKeyModal,
  subscriptionPopover,
} from '../../../pages/modelsAsAService';
import {
  mockAPIKeys,
  mockCreateAPIKeyResponse,
  mockSubscriptionListItems,
} from '../../../utils/maasUtils';

const mockSubscriptionDetails: Record<string, SubscriptionDetail> = {
  'premium-team-sub': {
    displayName: 'Premium Team',
    models: ['granite-3-8b-instruct', 'flan-t5-small'],
  },
  'basic-team-sub': { displayName: 'Basic Team', models: ['flan-t5-small'] },
};

const mockSearchResponse = (
  keys: APIKey[],
  subscriptionDetails?: Record<string, SubscriptionDetail>,
) => ({
  data: {
    object: 'list',
    data: keys,
    // eslint-disable-next-line camelcase
    has_more: false,
    subscriptionDetails,
  },
});

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
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse(
        mockAPIKeys().filter((k) => k.status === 'active'),
        mockSubscriptionDetails,
      ),
    ).as('initialSearch');
    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: mockSubscriptionListItems(),
    }).as('getSubscriptions');
    apiKeysPage.visit();
    cy.wait('@initialSearch');
  });

  it('should display the API keys table page with active keys on initial load', () => {
    apiKeysPage.findTitle().should('contain.text', 'API Keys');
    apiKeysPage
      .findDescription()
      .should(
        'contain.text',
        'Manage personal API keys that can be used to access AI asset endpoints.',
      );

    apiKeysPage.findTable().should('exist');
    apiKeysPage.findRows().should('have.length', 2);

    apiKeysPage.findStatusFilterToggle().click();
    apiKeysPage.findStatusFilterOptionCheckbox('Active').should('be.checked');
    apiKeysPage.findStatusFilterOptionCheckbox('Expired').should('not.be.checked');
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

  it('should display all API keys when the status filter is cleared', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(mockAPIKeys())).as(
      'clearAllFilters',
    );
    apiKeysPage.findRows().should('have.length', 2); // active keys show on page load

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

  it('should show subscription popover with model names on click', () => {
    const prodRow = apiKeysPage.getRow('production-backend');
    prodRow.findSubscriptionPopoverButton().click();

    subscriptionPopover.findModelCount().should('contain.text', '2 models');
    subscriptionPopover.findModelName('granite-3-8b-instruct').should('be.visible');
    subscriptionPopover.findModelName('flan-t5-small').should('be.visible');
  });

  it('should filter api keys by username', () => {
    const aliceKeys = mockAPIKeys().filter((k) => k.username === 'alice');

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(aliceKeys)).as(
      'searchByUsername',
    );

    apiKeysPage.findFilterInput().type('alice');
    apiKeysPage.findUsernameFilterTooltip().should('be.visible');
    apiKeysPage.findFilterInput().type('{enter}');

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
    const filteredKeys = mockAPIKeys().filter(
      (k) => k.status === 'active' || k.status === 'expired',
    );

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(filteredKeys)).as(
      'filterByStatus',
    );

    apiKeysPage.findStatusFilterToggle().click();
    apiKeysPage.findStatusFilterOption('Expired').click();

    // Keys are filtered to show active by default so here we're looking for active and expired since active was pre-selected
    cy.wait('@filterByStatus').then((interception) => {
      expect(interception.request.body.data.filters.status).to.deep.equal(['active', 'expired']);
    });

    apiKeysPage.findRows().should('have.length', 3);

    const oldServiceKeyRow = apiKeysPage.getRow('old-service-key');
    oldServiceKeyRow.findStatus().should('contain.text', 'Expired');

    const productionBackendRow = apiKeysPage.getRow('production-backend');
    productionBackendRow.findStatus().should('contain.text', 'Active');

    const developmentTestingRow = apiKeysPage.getRow('development-testing');
    developmentTestingRow.findStatus().should('contain.text', 'Active');
  });

  it('should sort api keys by name', () => {
    const keys = mockAPIKeys();

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

    // Creation date is the default active sort (desc). First click toggles to asc.
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortCreationDateAsc',
    );
    apiKeysPage.findColumnSortButton('Creation date').click();

    cy.wait('@sortCreationDateAsc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'created_at',
        order: 'asc',
      });
    });

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortCreationDateDesc',
    );
    apiKeysPage.findColumnSortButton('Creation date').click();

    cy.wait('@sortCreationDateDesc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'created_at',
        order: 'desc',
      });
    });
  });

  it('should sort api keys by expiration date', () => {
    const keys = mockAPIKeys();

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortExpirationAsc',
    );
    apiKeysPage.findColumnSortButton('Expiration date').click();

    cy.wait('@sortExpirationAsc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'expires_at',
        order: 'asc',
      });
    });

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(keys)).as(
      'sortExpirationDesc',
    );
    apiKeysPage.findColumnSortButton('Expiration date').click();

    cy.wait('@sortExpirationDesc').then((interception) => {
      expect(interception.request.body.data).to.have.deep.property('sort', {
        by: 'expires_at',
        order: 'desc',
      });
    });
  });

  it('should sort api keys by last used', () => {
    const keys = mockAPIKeys();

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

    apiKeysPage.findTitle().should('contain.text', 'API Keys');
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
    apiKeysPage.findTitle().should('contain.text', 'API Keys');
    apiKeysPage.getRow('development-testing').findKebabAction('Revoke API key').click();

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

  it('should create a new API key with the default 30 days expiration', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');
    createApiKeyModal.findExpirationToggle().should('contain.text', '30 days');
    createApiKeyModal.findSubmitButton().should('be.disabled');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findDescriptionInput().type('Production API key for backend service');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();
    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '30d' });
      expect(interception.response?.body?.data).to.include({
        name: 'production-backend',
        expiresAt: '2026-01-20T11:54:34.521671447-05:00',
      });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyTokenInput().should('have.value', mockCreateAPIKeyResponse().key);
    copyApiKeyModal.findApiKeyName().should('contain.text', 'production-backend');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '30 days');
  });

  it('should show the custom days input when Custom (days) is selected and hide it when switching back', () => {
    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();

    createApiKeyModal.findCustomDaysInput().should('not.exist');
    createApiKeyModal.findExpirationToggle().click();
    createApiKeyModal.findExpirationOption('custom').click();
    createApiKeyModal.findCustomDaysInput().should('exist');

    createApiKeyModal.findExpirationToggle().click();
    createApiKeyModal.findExpirationOption('90d').click();
    createApiKeyModal.findCustomDaysInput().should('not.exist');
  });

  it('should create an API key with a custom expiration and show the correct label in the success view', () => {
    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@getSubscriptions');
    createApiKeyModal.findExpirationToggle().click();
    createApiKeyModal.findExpirationOption('custom').click();
    createApiKeyModal.findCustomDaysInput().type('45');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('my-key');
    createApiKeyModal.findSubmitButton().should('be.enabled');
    createApiKeyModal.findSubmitButton().click();

    cy.wait('@createApiKey').then((interception) => {
      expect(interception.request.body?.data).to.include({ expiresIn: '45d' });
    });

    copyApiKeyModal.shouldBeOpen();
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '45 days');
  });

  it('should show a validation error for an out-of-range custom days value', () => {
    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    createApiKeyModal.findExpirationToggle().click();
    createApiKeyModal.findExpirationOption('custom').click();
    createApiKeyModal.findCustomDaysInput().type('366').blur();
    createApiKeyModal.find().contains('Enter a value between 1 and 365 days').should('exist');
    createApiKeyModal.findNameInput().type('my-key');
    createApiKeyModal.findSubmitButton().should('be.disabled');
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

    createApiKeyModal.findSubscriptionToggle().should('contain.text', 'Select a subscription');
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

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@emptySubscriptions');

    createApiKeyModal.findNoSubscriptionsAlert().should('be.visible');
    createApiKeyModal.findNameInput().type('my-key');
    createApiKeyModal.findSubmitButton().should('be.disabled');
  });

  it('should show an error alert when subscriptions fail to load', () => {
    cy.intercept('GET', '/maas/api/v1/subscriptions', {
      statusCode: 500,
      body: { error: { code: '500', message: 'Internal Server Error' } },
    }).as('failedSubscriptions');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    cy.wait('@failedSubscriptions');

    createApiKeyModal.findSubscriptionsErrorAlert().should('be.visible');
    createApiKeyModal.findSubmitButton().should('be.disabled');
  });
});

describe('API Keys Page (Admin)', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
      }),
    );

    cy.interceptOdh('GET /maas/api/v1/user', {
      data: { userId: 'admin-user', clusterAdmin: true },
    });
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: true } });
    cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(mockAPIKeys())).as(
      'initialSearch',
    );
    apiKeysPage.visit();
    cy.wait('@initialSearch');
  });

  it('should show admin revoke action label', () => {
    apiKeysPage.findActionsToggle().click();
    apiKeysPage
      .findRevokeAllAPIKeysAction()
      .should('contain.text', 'Revoke all keys for a single user');
    apiKeysPage.findRevokeAllAPIKeysAction().should('not.be.disabled');
  });

  it('should open admin revoke modal, search a user, and revoke their keys', () => {
    const aliceKeys = mockAPIKeys().filter((k) => k.username === 'alice');

    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();

    adminBulkRevokeAPIKeyModal.shouldBeOpen();
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(aliceKeys)).as(
      'searchUserKeys',
    );

    adminBulkRevokeAPIKeyModal.findUsernameInput().type('alice');
    adminBulkRevokeAPIKeyModal.findSearchButton().click();

    cy.wait('@searchUserKeys').then((interception) => {
      expect(interception.request.body.data.filters.username).to.eq('alice');
    });

    adminBulkRevokeAPIKeyModal.findKeysFoundHeading().should('exist');
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.enabled');

    cy.interceptOdh('POST /maas/api/v1/api-keys/bulk-revoke', {
      data: {
        revokedCount: 1,
        message: 'All API keys revoked for alice',
      },
    }).as('bulkRevokeKeys');

    adminBulkRevokeAPIKeyModal.findRevokeButton().click();

    cy.wait('@bulkRevokeKeys').then((interception) => {
      expect(interception.request.body.data.username).to.eq('alice');
    });
  });

  it('should show no keys alert when searched user has no active keys', () => {
    const revokedKeys = mockAPIKeys().filter((k) => k.status === 'revoked');

    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();

    adminBulkRevokeAPIKeyModal.shouldBeOpen();

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(revokedKeys)).as(
      'searchNoActiveKeys',
    );

    adminBulkRevokeAPIKeyModal.findUsernameInput().type('carol');
    adminBulkRevokeAPIKeyModal.findSearchButton().click();

    cy.wait('@searchNoActiveKeys');

    adminBulkRevokeAPIKeyModal.findNoKeysAlert().should('exist');
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
  });
});
