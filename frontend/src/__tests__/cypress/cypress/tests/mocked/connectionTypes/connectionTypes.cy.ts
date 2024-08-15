import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '~/__tests__/cypress/cypress/utils/mockUsers';
import { connectionTypesPage } from '~/__tests__/cypress/cypress/pages/connectionTypes';
import { mockDashboardConfig } from '~/__mocks__';
import { mockConnectionTypeConfigMap } from '~/__mocks__/mockConnectionType';

it('Connection types should not be available for non product admins', () => {
  asProjectAdminUser();
  cy.visitWithLogin('/connectionTypes');
  pageNotfound.findPage().should('exist');
  connectionTypesPage.findNavItem().should('not.exist');
});

it('Connection types should be hidden by feature flag', () => {
  asProductAdminUser();

  cy.visitWithLogin('/connectionTypes');
  connectionTypesPage.shouldReturnNotFound();

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableConnectionTypes: false,
    }),
  );

  connectionTypesPage.visit();
});

describe('Connection types', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableConnectionTypes: false,
      }),
    );
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({}),
      mockConnectionTypeConfigMap({
        name: 'no-display-name',
        displayName: '',
        description: 'description 2',
        enabled: false,
        preInstalled: true,
      }),
      mockConnectionTypeConfigMap({
        name: 'test-2',
        displayName: 'Test display name',
        description: 'Test description',
      }),
    ]);
  });

  it('should show the empty state when there are no results', () => {
    cy.interceptOdh('GET /api/connection-types', []);
    connectionTypesPage.visit();
    connectionTypesPage.shouldBeEmpty();
  });

  it('should show the correct column values', () => {
    connectionTypesPage.visit();

    const row = connectionTypesPage.getConnectionTypeRow('Test display name');
    row.shouldHaveDescription('Test description');
    row.shouldHaveCreator('dashboard-admin');
    row.shouldBeEnabled();

    const row2 = connectionTypesPage.getConnectionTypeRow('no-display-name');
    row2.shouldHaveDescription('description 2');
    row2.shouldShowPreInstalledLabel();
    row2.shouldBeDisabled();
  });
});
