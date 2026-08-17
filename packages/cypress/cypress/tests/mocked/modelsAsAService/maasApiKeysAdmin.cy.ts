import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { MODELS_AS_A_SERVICE_READY } from '@odh-dashboard/k8s-core';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockSearchResponse } from './maasApiKeysTestUtils';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { adminBulkRevokeAPIKeyModal, apiKeysPage } from '../../../pages/modelsAsAService';
import {
  mockAPIKeys,
  mockSubscriptionListItems,
  mockSubscriptions,
} from '../../../utils/maasUtils';

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
          [DataScienceStackComponent.OGX_OPERATOR]: { managementState: 'Managed' },
        },
        conditions: [{ type: MODELS_AS_A_SERVICE_READY, status: 'True', reason: 'Ready' }],
      }),
    );
    cy.interceptOdh('POST /maas/api/v1/api-keys/search', mockSearchResponse(mockAPIKeys())).as(
      'initialSearch',
    );
    cy.interceptOdh('GET /maas/api/v1/subscriptions', {
      data: mockSubscriptionListItems(),
    }).as('getSubscriptions');
    cy.interceptOdh('GET /maas/api/v1/all-subscriptions', {
      data: mockSubscriptions(),
    }).as('getAllSubscriptions');
    apiKeysPage.visit();
    cy.wait('@initialSearch');
  });

  it('should show admin revoke action label', () => {
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().should('contain.text', 'Revoke user API keys');
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
