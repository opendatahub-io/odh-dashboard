import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { apiKeysPage, revokeAPIKeyModal, copyApiKeyModal, createApiKeyModal } from '../../../pages/modelsAsAService';
import { mockAPIKeys, mockCreateAPIKeyResponse } from '../../../utils/maasUtils';

describe('API Keys Page', () => {
  beforeEach(() => {
    asProductAdminUser();
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        modelAsService: true,
        genAiStudio: true,
        maasApiKeys: true,
      }),
    );

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.LLAMA_STACK_OPERATOR]: { managementState: 'Managed' },
        },
      }),
    );

    cy.interceptOdh('GET /maas/api/v1/api-keys', {
      data: mockAPIKeys(),
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
  });

  it('should revoke api keys', () => {
    apiKeysPage.findTitle().should('contain.text', 'API Keys');
    apiKeysPage.findActionsToggle().click();
    apiKeysPage.findRevokeAllAPIKeysAction().click();

    revokeAPIKeyModal.shouldBeOpen();
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().type('incorrect');
    revokeAPIKeyModal.findRevokeButton().should('be.disabled');
    revokeAPIKeyModal.findRevokeConfirmationInput().clear().type('revoke');
    revokeAPIKeyModal.findRevokeButton().should('be.enabled');

    cy.interceptOdh('DELETE /maas/api/v1/api-keys', { data: null }).as('deleteAllApiKeys');
    cy.interceptOdh('GET /maas/api/v1/api-keys', {
      data: [],
    }).as('getApiKeysAfterDelete');

    revokeAPIKeyModal.findRevokeButton().click();
    apiKeysPage.findEmptyState().should('exist');

    cy.wait('@deleteAllApiKeys').then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
    });
    cy.wait('@getApiKeysAfterDelete');
  });

  it('should create a new API key', () => {
    const now = new Date(2026, 0, 14).getTime(); // January 14, 2026
    // Set the clock to the same day every time so the expiration date is always the same
    cy.clock(now);

    cy.interceptOdh('POST /maas/api/v1/api-key', {
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
        description: 'Production API key for backend service',
        expiration: '4h',
        expiresAt: 1769544565,
      });
    });

    copyApiKeyModal.shouldBeOpen();
    // Verify the token is displayed correctly in the ClipboardCopy input
    copyApiKeyModal.findApiKeyTokenInput().should('have.value', mockCreateAPIKeyResponse().token);
    copyApiKeyModal.findApiKeyName().should('contain.text', 'production-backend');
    copyApiKeyModal.findApiKeyExpirationDate().should('contain.text', '2026-01-20');
  });
});
