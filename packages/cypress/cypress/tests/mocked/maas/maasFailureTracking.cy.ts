import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockSearchResponse, mockSubscriptionDetails } from './maasApiKeysTestUtils';
import { asProjectAdminUser, asProductAdminUser } from '../../../utils/mockUsers';
import {
  apiKeysPage,
  createApiKeyModal,
  revokeAPIKeyModal,
  bulkRevokeAPIKeyModal,
  adminBulkRevokeAPIKeyModal,
} from '../../../pages/modelsAsAService';
import {
  mockAPIKeys,
  mockSubscriptionListItems,
  mockSubscriptions,
} from '../../../utils/maasUtils';
import { captureTracking, expectSafeTracking } from '../../../utils/analytics';

describe('MaaS failure tracking', () => {
  const message = 'Private API key diagnostic 95482';
  const failure = () => ({ statusCode: 500, body: { error: { code: '500', message } } });

  beforeEach(() => {
    asProjectAdminUser();
    cy.interceptOdh('GET /api/config', mockDashboardConfig({ modelAsService: true }));
    cy.interceptOdh('GET /maas/api/v1/user', {
      data: { userId: 'test-user', clusterAdmin: false },
    });
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: false } });
    cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });
    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: { [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' } },
        conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
      }),
    );
    cy.interceptOdh(
      'POST /maas/api/v1/api-keys/search',
      mockSearchResponse(
        mockAPIKeys().filter((key) => key.status === 'active'),
        mockSubscriptionDetails,
      ),
    );
    cy.interceptOdh('GET /maas/api/v1/subscriptions', { data: mockSubscriptionListItems() });
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', { data: mockSubscriptions() });
    cy.interceptOdh('GET /maas/api/v1/api-keys-config', {
      // eslint-disable-next-line camelcase
      data: { max_expiration_days: 365, ephemeral_max_expiration: '1h' },
    });
    cy.interceptOdh('GET /maas/api/v1/gateway-url', {
      data: { url: 'https://example.invalid/maas-api' },
    });
  });

  it('should keep create diagnostics out of telemetry', () => {
    cy.intercept('POST', '/maas/api/v1/api-keys', failure()).as('failure');
    apiKeysPage.visit();
    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.findSubscriptionToggle().click();
    createApiKeyModal.findSubscriptionOption('premium-team-sub').click();
    createApiKeyModal.findNameInput().type('test-key');
    captureTracking();
    createApiKeyModal.findSubmitButton().click();
    cy.wait('@failure');
    createApiKeyModal.findErrorAlert().should('contain.text', message);
    expectSafeTracking('API Key Created', { success: false, error: 'unknown_error' }, message);
  });

  it('should keep single-key revoke diagnostics out of telemetry', () => {
    cy.intercept('DELETE', '/maas/api/v1/api-keys/key-dev-testing-002', failure()).as('failure');
    apiKeysPage.visit();
    apiKeysPage.getRow('development-testing').findKebabAction('Revoke').click();
    revokeAPIKeyModal.findRevokeConfirmationInput().type('development-testing');
    captureTracking();
    revokeAPIKeyModal.findRevokeButton().click();
    cy.wait('@failure');
    revokeAPIKeyModal.find().should('contain.text', message);
    expectSafeTracking('API Key Revoked', { success: false, error: 'unknown_error' }, message);
  });

  it('should keep self-service bulk revoke diagnostics out of telemetry', () => {
    cy.intercept('POST', '/maas/api/v1/api-keys/bulk-revoke', failure()).as('failure');
    apiKeysPage.visit();
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();
    bulkRevokeAPIKeyModal.findRevokeConfirmationInput().type('test-user');
    captureTracking();
    bulkRevokeAPIKeyModal.findRevokeButton().click();
    cy.wait('@failure');
    bulkRevokeAPIKeyModal.find().should('contain.text', message);
    expectSafeTracking(
      'API Keys Bulk Revoked',
      { success: false, error: 'unknown_error' },
      message,
    );
  });

  it('should keep administrator bulk revoke diagnostics out of telemetry', () => {
    asProductAdminUser();
    cy.interceptOdh('GET /maas/api/v1/is-maas-admin', { data: { allowed: true } });
    cy.intercept('POST', '/maas/api/v1/api-keys/bulk-revoke', failure()).as('failure');
    apiKeysPage.visit();
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();
    adminBulkRevokeAPIKeyModal.findUsernameInput().type('alice');
    adminBulkRevokeAPIKeyModal.findSearchButton().click();
    adminBulkRevokeAPIKeyModal.findRevokeButton().should('be.enabled');
    captureTracking();
    adminBulkRevokeAPIKeyModal.findRevokeButton().click();
    cy.wait('@failure');
    adminBulkRevokeAPIKeyModal.findRevokeError().should('contain.text', message);
    expectSafeTracking(
      'API Keys Bulk Revoked',
      { success: false, error: 'unknown_error' },
      message,
    );
  });
});
