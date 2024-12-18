import { mockDashboardConfig, mockDscStatus, mockK8sResourceList } from '~/__mocks__';
import { mockDsciStatus } from '~/__mocks__/mockDsciStatus';
import { StackCapability, StackComponent } from '~/concepts/areas/types';
import {
  FormFieldSelector,
  modelRegistrySettings,
} from '~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '~/__tests__/cypress/cypress/utils/mockUsers';
import { mockModelRegistry } from '~/__mocks__/mockModelRegistry';
import type { RoleBindingSubject } from '~/k8sTypes';
import { mockRoleBindingK8sResource } from '~/__mocks__/mockRoleBindingK8sResource';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';

const groupSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'example-mr-users',
  },
];

const setupMocksForMRSettingAccess = ({
  hasModelRegistries = true,
  hasDatabasePassword = true,
}: {
  hasModelRegistries?: boolean;
  hasDatabasePassword?: boolean;
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
            mockModelRegistry({
              name: 'test-registry-3',
              conditions: [
                {
                  lastTransitionTime: '2024-03-22T09:30:02Z',
                  message:
                    'Deployment for custom resource modelregistry-sample was successfully created',
                  reason: 'CreatedDeployment',
                  status: 'True',
                  type: 'Progressing',
                },
              ],
            }),
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
      databasePassword: hasDatabasePassword ? 'test-password' : undefined,
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

  cy.interceptOdh(
    'PATCH /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-1' },
    },
    {
      modelRegistry: mockModelRegistry({ name: 'test-registry-1' }),
      databasePassword: 'test-password',
    },
  );

  cy.interceptOdh(
    'GET /api/modelRegistryRoleBindings',
    mockK8sResourceList([
      mockRoleBindingK8sResource({
        namespace: 'odh-model-registries',
        name: 'test-registry-1-user',
        subjects: groupSubjects,
        roleRefName: 'registry-user-test-registry-1',
        modelRegistryName: 'test-registry-1',
      }),
      mockRoleBindingK8sResource({
        namespace: 'odh-model-registries',
        name: 'test-registry-2-user',
        subjects: groupSubjects,
        roleRefName: 'registry-user-test-registry-2',
        modelRegistryName: 'test-registry-2',
      }),
    ]),
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

    // test resource name validation
    modelRegistrySettings.k8sNameDescription.findResourceEditLink().click();
    modelRegistrySettings.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'false');
    // Invalid character k8s names fail
    modelRegistrySettings.k8sNameDescription.findResourceNameInput().clear().type('InVaLiD vAlUe!');
    modelRegistrySettings.k8sNameDescription
      .findResourceNameInput()
      .should('have.attr', 'aria-invalid', 'true');
    modelRegistrySettings.findSubmitButton().should('be.disabled');
    modelRegistrySettings.k8sNameDescription.findResourceNameInput().clear().type('image');

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

describe('EditModelRegistry', () => {
  it('Update model registry', () => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings
      .findFormField(FormFieldSelector.NAME)
      .should('have.value', 'test-registry-1');
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).clear().type('test-2');
    modelRegistrySettings
      .findFormField(FormFieldSelector.HOST)
      .should('have.value', 'model-registry-db');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).should('have.value', '5432');
    modelRegistrySettings
      .findFormField(FormFieldSelector.USERNAME)
      .should('have.value', 'mlmduser');
    modelRegistrySettings
      .findFormField(FormFieldSelector.PASSWORD)
      .should('have.value', 'test-password');
    modelRegistrySettings
      .findFormField(FormFieldSelector.DATABASE)
      .should('have.value', 'model-registry');
    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();
  });

  it('Shows skeleton, when password is loading', () => {
    setupMocksForMRSettingAccess({ hasDatabasePassword: false });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings
      .findFormField(FormFieldSelector.NAME)
      .should('have.value', 'test-registry-1');
    modelRegistrySettings
      .findFormField(FormFieldSelector.HOST)
      .should('have.value', 'model-registry-db');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).should('have.value', '5432');
    modelRegistrySettings
      .findFormField(FormFieldSelector.USERNAME)
      .should('have.value', 'mlmduser');
    modelRegistrySettings
      .findFormField(FormFieldSelector.DATABASE)
      .should('have.value', 'model-registry');
    modelRegistrySettings.findSubmitButton().should('be.disabled');
  });

  it('Shows erros, when password fails to load', () => {
    setupMocksForMRSettingAccess({ hasDatabasePassword: false });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-2')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings
      .findFormField(FormFieldSelector.NAME)
      .should('have.value', 'test-registry-2');
    modelRegistrySettings
      .findFormField(FormFieldSelector.HOST)
      .should('have.value', 'model-registry-db');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).should('have.value', '5432');
    modelRegistrySettings
      .findFormField(FormFieldSelector.USERNAME)
      .should('have.value', 'mlmduser');
    cy.findByText('Failed to load the password. The Secret file is missing.').should('exist');
    modelRegistrySettings
      .findFormField(FormFieldSelector.DATABASE)
      .should('have.value', 'model-registry');
    modelRegistrySettings.findSubmitButton().should('be.disabled');
  });
});

describe('ManagePermissions', () => {
  it('Manage permission is enabled, when there is a rolebinding', () => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findByText('Manage permissions')
      .click();
    verifyRelativeURL('/modelRegistrySettings/permissions/test-registry-1');
  });

  it('Manage permission is disabled, when there is no rolebinding', () => {
    setupMocksForMRSettingAccess({});
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-3')
      .findByText('Manage permissions')
      .trigger('mouseenter');
    modelRegistrySettings.findManagePermissionsTooltip().should('be.visible');
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
