import { mockDashboardConfig, mockDscStatus } from '~/__mocks__';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { StackCapability, StackComponent } from '~/concepts/areas/types';
import { modelRegistrySettings } from '~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import { asProductAdminUser, asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/users';

const setupMocksForMRSettingAccess = () => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
    }),
  );
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      installedComponents: {
        [StackComponent.MODEL_REGISTRY]: true,
        [StackComponent.MODEL_MESH]: true,
      },
    }),
  );
  cy.interceptOdh(
    'GET /api/dsci/status',
    mockDsciStatus({
      requiredCapabilities: [StackCapability.SERVICE_MESH, StackCapability.SERVICE_MESH_AUTHZ],
    }),
  );
};

it('Model registry settings should not be available for non product admins', () => {
  asProjectAdminUser();
  modelRegistrySettings.visit(false);
  pageNotfound.findPage().should('exist');
  modelRegistrySettings.findNavItem().should('not.exist');
});

it('Model registry settings should be available for product admins with capabilities', () => {
  setupMocksForMRSettingAccess();
  // check page is accessible
  modelRegistrySettings.visit(true);
  // check nav item exists
  modelRegistrySettings.findNavItem().should('exist');
});

describe('CreateModal', () => {
  beforeEach(() => {
    setupMocksForMRSettingAccess();
  });

  it('should display error messages when form fields are invalid and not allow submit', () => {
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    // Fill in the form with invalid data
    cy.get('#mr-name').clear();
    cy.get('#mr-host').clear();
    cy.get('#mr-port').clear();
    cy.get('#mr-username').clear();
    cy.get('#mr-password').clear();
    cy.get('#mr-database').clear();
    cy.get('#mr-database').blur();
    // Assert the submit button is disabled
    cy.findByTestId('modal-submit-button').should('be.disabled');
    // Assert that error messages are displayed
    cy.findByTestId('mr-name-error')
      .should('be.visible')
      .contains(
        "Must consist of lower case alphanumeric characters or '-', and must start and end with an alphanumeric character",
      );
    cy.findByTestId('mr-host-error').should('be.visible').contains('Host cannot be empty');
    cy.findByTestId('mr-port-error').should('be.visible').contains('Port cannot be empty');
    cy.findByTestId('mr-username-error').should('be.visible').contains('Username cannot be empty');
    cy.findByTestId('mr-password-error').should('be.visible').contains('Password cannot be empty');
    cy.findByTestId('mr-database-error').scrollIntoView();
    cy.findByTestId('mr-database-error').should('be.visible').contains('Database cannot be empty');
  });

  it('should enable submit button if fields are valid', () => {
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    // Fill in the form with invalid data
    cy.get('#mr-name').type('valid-mr-name');
    cy.get('#mr-host').type('host');
    cy.get('#mr-port').type('1234');
    cy.get('#mr-username').type('validUser');
    cy.get('#mr-password').type('strongPassword');
    cy.get('#mr-database').type('myDatabase');
    cy.get('#mr-database').blur();
    // Assert the submit button is disabled
    cy.findByTestId('modal-submit-button').should('be.enabled');
    // Assert that error messages are not displayed
    cy.findByTestId('mr-name-error').should('not.exist');
    cy.findByTestId('mr-host-error').should('not.exist');
    cy.findByTestId('mr-port-error').should('not.exist');
    cy.findByTestId('mr-username-error').should('not.exist');
    cy.findByTestId('mr-password-error').should('not.exist');
    cy.findByTestId('mr-database-error').should('not.exist');
  });
});
