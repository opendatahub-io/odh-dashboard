import { aiAssetsPage } from '@odh-dashboard/gen-ai/testing/pages';
import {
  apiKeysPage,
  createApiKeyModal,
  copyApiKeyModal,
  revokeAPIKeyModal,
} from '@odh-dashboard/cypress/cypress/pages/modelsAsAService';
import {
  mockAPIKeys,
  mockCreateAPIKeyResponse,
} from '@odh-dashboard/cypress/cypress/__mocks__/maasFixtures';
import { portal } from '../../pages/portal';
import { maasApi, portalPath, setupPortalMocks } from '../../support/portal';

describe('MaaS portal composition', () => {
  it('redirects the root to AI assets and retains the portal prefix during navigation and reload', () => {
    setupPortalMocks();
    portal.visit();
    cy.location('pathname').should('eq', portalPath('/gen-ai-studio/assets'));
    aiAssetsPage.findTitle().should('be.visible').and('have.text', 'AI asset endpoints');
    aiAssetsPage.findMCPServersTab().should('not.exist');
    portal.findNavLink('API keys').click();
    cy.wait('@searchKeys');
    cy.location('pathname').should('eq', portalPath('/maas/keys-and-subs'));
    cy.reload();
    apiKeysPage.findTitle().should('contain.text', 'API keys');
    cy.location('pathname').should('eq', portalPath('/maas/keys-and-subs'));
  });

  for (const isMaaSAdmin of [false, true]) {
    it(`shows governance only when MaaS admin access is ${isMaaSAdmin}`, () => {
      setupPortalMocks({ isMaaSAdmin });
      portal.visit('/maas/keys-and-subs');
      cy.wait('@admin');
      apiKeysPage.findTitle().should('contain.text', 'API keys');
      portal.findNavLink('MaaS governance').should(isMaaSAdmin ? 'be.visible' : 'not.exist');
    });
  }

  for (const response of [
    { name: 'fails', statusCode: 500, body: {} },
    { name: 'returns malformed data', statusCode: 200, body: { data: { allowed: 'true' } } },
  ]) {
    it(`hides governance when authorization ${response.name}`, () => {
      setupPortalMocks();
      cy.intercept('GET', maasApi('/is-maas-admin'), {
        statusCode: response.statusCode,
        body: response.body,
      }).as('authorization');
      portal.visit('/maas/keys-and-subs');
      cy.wait('@authorization');
      apiKeysPage.findTitle().should('contain.text', 'API keys');
      portal.findNavLink('MaaS governance').should('not.exist');
    });
  }
});

describe('Portal API keys', () => {
  beforeEach(() => setupPortalMocks());

  it('renders shared MaaS fixtures through the portal and passes accessibility checks', () => {
    portal.visit('/maas/keys-and-subs');
    cy.wait('@searchKeys');
    apiKeysPage.findTable().should('contain.text', 'production-backend');
    cy.injectAxe();
    cy.checkA11y(undefined, { includedImpacts: ['critical', 'serious'] });
  });

  it('shows an empty state when the user has no API keys', () => {
    cy.intercept('POST', maasApi('/api-keys/search'), {
      // eslint-disable-next-line camelcase
      data: { object: 'list', data: [], has_more: false },
    }).as('emptyKeys');
    portal.visit('/maas/keys-and-subs');
    cy.wait('@emptyKeys');
    apiKeysPage.findEmptyState().should('contain.text', 'No API keys');
    apiKeysPage.findCreateApiKeyButton().should('be.enabled');
  });

  it('shows API errors within the portal shell', () => {
    cy.intercept('POST', maasApi('/api-keys/search'), {
      statusCode: 500,
      body: { error: { code: '500', message: 'Portal API keys unavailable' } },
    }).as('searchKeysFailure');
    portal.visit('/maas/keys-and-subs');
    cy.wait('@searchKeysFailure');
    apiKeysPage.findErrorState().should('contain.text', 'Portal API keys unavailable');
    portal.findNavLink('AI asset endpoints').should('be.visible');
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
    cy.intercept('POST', maasApi('/api-keys/search'), (request) => {
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
});
