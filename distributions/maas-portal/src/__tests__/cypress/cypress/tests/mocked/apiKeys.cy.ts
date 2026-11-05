import {
  apiKeysPage,
  createApiKeyModal,
  copyApiKeyModal,
  revokeAPIKeyModal,
  bulkRevokeAPIKeyModal,
  adminBulkRevokeAPIKeyModal,
} from '@odh-dashboard/cypress/cypress/pages/modelsAsAService';
import {
  mockAPIKeys,
  mockCreateAPIKeyResponse,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';

const mockTenantSearchByUsername = (): void => {
  cy.intercept('POST', maasApi('/api-keys/search/tenant'), (request) => {
    const username = request.body.data.filters?.username;
    if (username) {
      // Cypress uses a request alias to distinguish this search from the initial table load.
      // eslint-disable-next-line no-param-reassign
      request.alias = 'tenantSearchByUsername';
    }
    request.reply({
      data: {
        object: 'list',
        data: mockAPIKeys().filter((key) => !username || key.username === username),
        // eslint-disable-next-line camelcase
        has_more: false,
      },
    });
  }).as('tenantSearch');
};

describe('MaaS portal composition', () => {
  it('redirects the root to Model endpoints and retains the portal prefix during navigation and reload', () => {
    setupPortalMocks();
    portal.visit();
    cy.location('pathname').should('eq', portalPath('/maas/models'));
    cy.findByTestId('app-page-title').should('have.text', 'Model endpoints');
    portal.findNavLink('AI asset endpoints').should('not.exist');
    portal.findNavLink('Playground').should('not.exist');
    portal.findNavLink('MaaS governance').should('not.exist');
    portal.findNavLink('API keys').click();
    cy.wait('@searchKeys');
    cy.location('pathname').should('eq', portalPath('/maas/keys-and-subs'));
    cy.reload();
    apiKeysPage.findTitle().should('contain.text', 'API keys');
    cy.location('pathname').should('eq', portalPath('/maas/keys-and-subs'));
  });
});

describe('Portal API keys', () => {
  beforeEach(() => setupPortalMocks());

  it('renders shared MaaS fixtures through the portal and passes accessibility checks', () => {
    portal.visit('/maas/keys-and-subs');
    cy.wait('@searchKeys');
    apiKeysPage.findTable().should('contain.text', 'production-backend');
    apiKeysPage.findTable().findByRole('columnheader', { name: 'Owner' }).should('not.exist');
    apiKeysPage.findFilterInput().should('not.exist');
    cy.injectAxe();
    cy.checkA11y(undefined, { includedImpacts: ['critical', 'serious'] });
  });

  it('shows an empty state when the user has no API keys', () => {
    cy.intercept('POST', maasApi('/api-keys/search/tenant'), {
      // eslint-disable-next-line camelcase
      data: { object: 'list', data: [], has_more: false },
    }).as('emptyKeys');
    portal.visit('/maas/keys-and-subs');
    cy.wait('@emptyKeys');
    apiKeysPage.findEmptyState().should('contain.text', 'No API keys');
    apiKeysPage.findCreateApiKeyButton().should('be.enabled');
  });

  it('shows API errors within the portal shell', () => {
    cy.intercept('POST', maasApi('/api-keys/search/tenant'), {
      statusCode: 500,
      body: { error: { code: '500', message: 'Portal API keys unavailable' } },
    }).as('searchKeysFailure');
    portal.visit('/maas/keys-and-subs');
    cy.wait('@searchKeysFailure');
    apiKeysPage.findErrorState().should('contain.text', 'Portal API keys unavailable');
    portal.findNavLink('Model endpoints').should('be.visible');
  });

  it('creates an API key using the portal-prefixed MaaS API', () => {
    // The created-key dialog fetches model endpoints for its usage instructions.
    cy.intercept('GET', maasApi('/models'), { data: { object: 'list', data: [] } });
    cy.intercept('POST', maasApi('/api-keys'), { data: mockCreateAPIKeyResponse() }).as(
      'createKey',
    );
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findSubmitButton().click();
    cy.wait('@createKey').its('request.body.data').should('include', {
      name: 'production-backend',
      subscription: 'premium-team-sub',
    });
    copyApiKeyModal.findApiKeyName().should('contain.text', 'production-backend');
  });

  it('revokes an API key using the portal-prefixed MaaS API', () => {
    let revoked = false;
    cy.intercept('POST', maasApi('/api-keys/search/tenant'), (request) => {
      request.reply({
        data: {
          object: 'list',
          data: mockAPIKeys().filter((key) => !revoked || key.id !== 'key-prod-backend-001'),
          // eslint-disable-next-line camelcase
          has_more: false,
        },
      });
    });
    cy.intercept('DELETE', maasApi('/api-keys/key-prod-backend-001'), (request) => {
      revoked = true;
      request.reply({ data: { ...mockAPIKeys()[0], status: 'revoked' } });
    }).as('revokeKey');
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.getRow('production-backend').findActionsToggle().click();
    apiKeysPage.findRevokeMenuItem().click();
    revokeAPIKeyModal.findRevokeConfirmationInput().type('production-backend');
    revokeAPIKeyModal.findRevokeButton().click();
    cy.wait('@revokeKey');
    apiKeysPage.findTable().should('not.contain.text', 'production-backend');
  });

  it('revokes all of the current user’s API keys after username confirmation', () => {
    cy.intercept('POST', maasApi('/api-keys/bulk-revoke'), {
      data: { revokedCount: 2, message: 'All API keys revoked' },
    }).as('bulkRevokeMyKeys');
    portal.visit('/maas/keys-and-subs');
    cy.wait('@searchKeys');
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().should('contain.text', 'Revoke all my keys').click();
    bulkRevokeAPIKeyModal.find().should('be.visible');
    bulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
    bulkRevokeAPIKeyModal.findRevokeConfirmationInput().type('wrong-user');
    bulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
    bulkRevokeAPIKeyModal.findRevokeConfirmationInput().clear().type('portal-user');
    bulkRevokeAPIKeyModal.findRevokeButton().should('be.enabled').click();
    cy.wait('@bulkRevokeMyKeys').its('request.body.data.username').should('eq', 'portal-user');
    bulkRevokeAPIKeyModal.shouldBeOpen(false);
  });
});

describe('Portal API keys for MaaS admins', () => {
  beforeEach(() => setupPortalMocks({ isMaaSAdmin: true }));

  it('shows owner details and filters tenant API keys by username', () => {
    mockTenantSearchByUsername();

    portal.visit('/maas/keys-and-subs');
    cy.wait('@whoami');
    cy.wait('@tenantSearch');
    apiKeysPage.findTable().findByRole('columnheader', { name: 'Owner' }).should('be.visible');
    apiKeysPage.getRow('production-backend').findOwner().should('have.text', 'alice');
    apiKeysPage.findFilterInput().find('input').type('alice');
    apiKeysPage.findFilterSearchButton().click();
    cy.wait('@tenantSearchByUsername')
      .its('request.body.data.filters.username')
      .should('eq', 'alice');
    apiKeysPage.findTable().should('contain.text', 'production-backend');
    apiKeysPage.findTable().should('not.contain.text', 'development-testing');
  });

  it('shows no results when the admin filters by an unknown username', () => {
    mockTenantSearchByUsername();
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.findTable().should('contain.text', 'production-backend');
    apiKeysPage.findFilterInput().find('input').type('missing-user');
    apiKeysPage.findFilterSearchButton().click();
    cy.wait('@tenantSearchByUsername')
      .its('request.body.data.filters.username')
      .should('eq', 'missing-user');
    apiKeysPage.findEmptyTableState().should('be.visible');
    apiKeysPage.findTable().should('not.contain.text', 'production-backend');
  });

  it('applies the status filter to the tenant search and table rows', () => {
    cy.intercept('POST', maasApi('/api-keys/search/tenant'), (request) => {
      const statuses: string[] | undefined = request.body.data.filters?.status;
      if (statuses?.length === 1 && statuses[0] === 'expired') {
        // eslint-disable-next-line no-param-reassign
        request.alias = 'expiredKeys';
      }
      request.reply({
        data: {
          object: 'list',
          data: mockAPIKeys().filter((key) => !statuses || statuses.includes(key.status)),
          // eslint-disable-next-line camelcase
          has_more: false,
        },
      });
    });
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.findStatusFilterToggle().click();
    apiKeysPage.findStatusFilterOption('Active').click();
    apiKeysPage.findStatusFilterOption('Inactive').click();
    cy.wait('@expiredKeys').its('request.body.data.filters.status').should('deep.eq', ['expired']);
    apiKeysPage.findTable().should('contain.text', 'old-service-key');
    apiKeysPage.findTable().should('not.contain.text', 'production-backend');
  });

  it('applies the subscription filter to the tenant search and table rows', () => {
    cy.intercept('POST', maasApi('/api-keys/search/tenant'), (request) => {
      const subscription: string | undefined = request.body.data.filters?.subscription;
      if (subscription === 'basic-team-sub') {
        // eslint-disable-next-line no-param-reassign
        request.alias = 'basicKeys';
      }
      request.reply({
        data: {
          object: 'list',
          data: mockAPIKeys().filter((key) => !subscription || key.subscription === subscription),
          // eslint-disable-next-line camelcase
          has_more: false,
        },
      });
    });
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.findSubscriptionFilterToggle().click();
    apiKeysPage.findSubscriptionFilterOption('basic-team-sub').click();
    cy.wait('@basicKeys')
      .its('request.body.data.filters.subscription')
      .should('eq', 'basic-team-sub');
    apiKeysPage.findTable().should('contain.text', 'development-testing');
    apiKeysPage.findTable().should('not.contain.text', 'production-backend');
  });

  it('searches a user and bulk revokes their active keys from the admin action', () => {
    mockTenantSearchByUsername();
    cy.intercept('POST', maasApi('/api-keys/bulk-revoke'), {
      data: { revokedCount: 1, message: 'All API keys revoked for alice' },
    }).as('bulkRevokeKeys');

    portal.visit('/maas/keys-and-subs');
    cy.wait('@whoami');
    cy.wait('@tenantSearch');
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().should('contain.text', 'Revoke user API keys').click();
    adminBulkRevokeAPIKeyModal.find().should('be.visible');
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
    adminBulkRevokeAPIKeyModal.findUsernameInput().type('alice');
    adminBulkRevokeAPIKeyModal.findSearchButton().click();
    cy.wait('@tenantSearchByUsername')
      .its('request.body.data.filters.username')
      .should('eq', 'alice');
    adminBulkRevokeAPIKeyModal.findKeysFoundHeading().should('contain.text', 'alice');
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.enabled').click();
    cy.wait('@bulkRevokeKeys').its('request.body.data.username').should('eq', 'alice');
    adminBulkRevokeAPIKeyModal.shouldBeOpen(false);
  });

  it('keeps admin revoke disabled when the searched username has no keys', () => {
    mockTenantSearchByUsername();
    portal.visit('/maas/keys-and-subs');
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();
    adminBulkRevokeAPIKeyModal.findUsernameInput().type('missing-user');
    adminBulkRevokeAPIKeyModal.findSearchButton().click();
    cy.wait('@tenantSearchByUsername')
      .its('request.body.data.filters.username')
      .should('eq', 'missing-user');
    adminBulkRevokeAPIKeyModal
      .findNoKeysAlert()
      .should('contain.text', 'No active API keys found for "missing-user"');
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.disabled');
  });
});
