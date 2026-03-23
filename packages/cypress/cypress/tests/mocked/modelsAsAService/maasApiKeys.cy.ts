import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import {
  apiKeysPage,
  bulkRevokeAPIKeyModal,
  revokeAPIKeyModal,
  copyApiKeyModal,
  createApiKeyModal,
} from '../../../pages/modelsAsAService';
import { mockAPIKeys, mockCreateAPIKeyResponse } from '../../../utils/maasUtils';

describe('API Keys Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
      }),
    );

    cy.interceptOdh('GET /maas/api/v1/user', {
      data: { userId: 'test-user', clusterAdmin: false },
    });
    cy.interceptOdh('GET /maas/api/v1/namespaces', { data: [] });

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );

    cy.interceptOdh('POST /maas/api/v1/api-keys/search', {
      data: {
        object: 'list',
        data: mockAPIKeys(),
        // eslint-disable-next-line camelcase
        has_more: false,
      },
    });
    apiKeysPage.visit();
  });

  it('should display the API keys table page', () => {
    apiKeysPage.findTitle().should('contain.text', 'API Keys');
    apiKeysPage
      .findDescription()
      .should(
        'contain.text',
        'Manage personal API keys that can be used to access AI asset endpoints.',
      );

    apiKeysPage.findTable().should('exist');
    apiKeysPage.findRows().should('have.length', 4);

    const ciPipelineRow = apiKeysPage.getRow('ci-pipeline');
    ciPipelineRow.findName().should('contain.text', 'ci-pipeline');
    ciPipelineRow.findDescription().should('contain.text', 'API key for CI/CD pipeline automation');
    ciPipelineRow.findStatus().should('contain.text', 'Active');
    ciPipelineRow.findCreationDate().should('contain.text', 'Jan 11, 2026');
    ciPipelineRow.findExpirationDate().should('contain.text', 'Jan 18, 2026');
    apiKeysPage.findTable().should('exist');
    apiKeysPage.findRows().should('have.length', 4);
  });

  it('should revoke all my API keys', () => {
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

    revokeAPIKeyModal.findRevokeAllButton().click();

    cy.wait('@deleteAllApiKeys').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
  });

  it('should revoke a specific API key', () => {
    apiKeysPage.findTitle().should('contain.text', 'API Keys');
    apiKeysPage.getRow('ci-pipeline').findKebabAction('Revoke API key').click();

    revokeAPIKeyModal.shouldBeOpen();
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().type('incorrect');
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().clear().type('ci-pipeline');
    revokeAPIKeyModal.findRevokeButton().should('be.enabled');

    cy.interceptOdh(
      'DELETE /maas/api/v1/api-keys/:id',
      { path: { id: 'key-ci-pipeline-003' } },
      {
        data: {
          id: 'key-ci-pipeline-003',
          name: 'ci-pipeline',
          description: 'API key for CI/CD pipeline automation',
          status: 'revoked',
          creationDate: '2026-01-11T11:54:34.521671447-05:00',
        },
      },
    ).as('deleteApiKey');

    revokeAPIKeyModal.findRevokeButton().click();

    cy.wait('@deleteApiKey').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
  });

  it('should create a new API key', () => {
    const now = new Date(2026, 0, 14).getTime(); // January 14, 2026
    // Set the clock to the same day every time so the expiration date is always the same
    cy.clock(now);

    cy.interceptOdh('POST /maas/api/v1/api-keys', {
      data: mockCreateAPIKeyResponse(),
    }).as('createApiKey');

    apiKeysPage.findCreateApiKeyButton().click();
    createApiKeyModal.shouldBeOpen();
    createApiKeyModal.findNameInput().type('production-backend');
    createApiKeyModal.findDescriptionInput().type('Production API key for backend service');
    createApiKeyModal.findExpirationDateInput().type('2026-01-20');
    createApiKeyModal.findCreateButton().click();
    cy.wait('@createApiKey').then((interception) => {
      expect(interception.response?.body?.data).to.include({
        name: 'production-backend',
        expiresAt: '2026-01-20T11:54:34.521671447-05:00',
      });
    });

    copyApiKeyModal.shouldBeOpen();
    // Verify the token is displayed correctly in the ClipboardCopy input
    copyApiKeyModal.findApiKeyTokenInput().should('have.value', mockCreateAPIKeyResponse().key);
    copyApiKeyModal.findApiKeyName().should('contain.text', 'production-backend');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '2026-01-20');
  });
});
