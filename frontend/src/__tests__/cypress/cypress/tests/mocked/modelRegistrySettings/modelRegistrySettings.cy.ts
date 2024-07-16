import { mockDashboardConfig, mockDscStatus, mockK8sResourceList } from '~/__mocks__';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { StackCapability, StackComponent } from '~/concepts/areas/types';
import {
  FormFieldSelector,
  modelRegistrySettings,
  DatabaseDetailsTestId,
} from '~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import { asProductAdminUser, asProjectAdminUser } from '~/__tests__/cypress/cypress/utils/users';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';

const setupMocksForMRSettingAccess = ({
  hasModelRegistries = true,
}: {
  hasModelRegistries?: boolean;
}) => {
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
  cy.interceptOdh(
    'GET /api/modelRegistries',
    mockK8sResourceList(
      hasModelRegistries
        ? [
            mockModelRegistry({ name: 'test-registry-1' }),
            mockModelRegistry({ name: 'test-registry-2' }),
            mockModelRegistry({ name: 'test-registry-3' }),
          ]
        : [],
    ),
  );
  cy.interceptOdh(
    'GET /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-1' },
    },
    {
      modelRegistry: mockModelRegistry({ name: 'test-registry-1' }),
      databasePassword: 'test-password',
    },
  );
  cy.interceptOdh(
    'GET /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-2' },
    },
    (req) => {
      req.reply(500); // Something went wrong on the backend when decoding the secret
    },
  );
};

it('Model registry settings should not be available for non product admins', () => {
  asProjectAdminUser();
  modelRegistrySettings.visit(false);
  pageNotfound.findPage().should('exist');
  modelRegistrySettings.findNavItem().should('not.exist');
});

it('Model registry settings should be available for product admins with capabilities', () => {
  setupMocksForMRSettingAccess({});
  // check page is accessible
  modelRegistrySettings.visit(true);
  // check nav item exists
  modelRegistrySettings.findNavItem().should('exist');
});

it('Shows empty state when there are no registries', () => {
  setupMocksForMRSettingAccess({ hasModelRegistries: false });
  modelRegistrySettings.visit(true);
  modelRegistrySettings.findEmptyState().should('exist');
});

describe('CreateModal', () => {
  beforeEach(() => {
    setupMocksForMRSettingAccess({});
  });

  it('should display error messages when form fields are invalid and not allow submit', () => {
    modelRegistrySettings.visit(true);
    modelRegistrySettings.findCreateButton().click();
    modelRegistrySettings.findSubmitButton().should('be.disabled');
    modelRegistrySettings.clearFormFields();
    modelRegistrySettings.findSubmitButton().should('be.disabled');
    modelRegistrySettings.shouldHaveAllErrors();
  });

  it('should enable submit button if fields are valid', () => {
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).blur();
    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.shouldHaveNoErrors();
  });
});

describe('ModelRegistriesTable', () => {
  it('Shows table when there are registries', () => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings.findEmptyState().should('not.exist');
    modelRegistrySettings.findTable().should('exist');
    modelRegistrySettings.findModelRegistryRow('test-registry-1').should('exist');
  });
});

describe('ViewDatabaseConfigModal', () => {
  it('Shows database details for a registry', () => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findKebabAction('View database configuration')
      .click();
    modelRegistrySettings
      .findDatabaseDetail(DatabaseDetailsTestId.HOST)
      .should('contain.text', 'model-registry-db');
    modelRegistrySettings
      .findDatabaseDetail(DatabaseDetailsTestId.PORT)
      .should('contain.text', '5432');
    modelRegistrySettings
      .findDatabaseDetail(DatabaseDetailsTestId.USERNAME)
      .should('contain.text', 'mlmduser');
    modelRegistrySettings.findDatabasePasswordHiddenButton().click();
    modelRegistrySettings
      .findDatabaseDetail(DatabaseDetailsTestId.PASSWORD)
      .should('contain.text', 'test-password');
    modelRegistrySettings
      .findDatabaseDetail(DatabaseDetailsTestId.DATABASE)
      .should('contain.text', 'model-registry');
  });

  it('Shows error loading password when secret fails to decode', () => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-2')
      .findKebabAction('View database configuration')
      .click();
    cy.findByText('Error loading password').should('exist');
  });
});

describe('ManagePermissionsModal', () => {
  beforeEach(() => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findByText('Manage permissions')
      .click();
  });
});

describe('DeleteModelRegistryModal', () => {
  beforeEach(() => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findKebabAction('Delete model registry')
      .click();
  });

  it('disables confirm button before name is typed', () => {
    modelRegistrySettings.findSubmitButton().should('be.disabled');
  });

  it('enables confirm button after name is typed', () => {
    modelRegistrySettings.findConfirmDeleteNameInput().type('test-registry-1');
    modelRegistrySettings.findSubmitButton().should('be.enabled');
  });
});
