import { mockDashboardConfig, mockDscStatus } from '@odh-dashboard/internal/__mocks__';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { apiKeysPage } from '../../../pages/modelsAsAService';
import { mockAPIKeys } from '../../../utils/maasUtils';

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
});
