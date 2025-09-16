import {
  mockConfigMapsSecrets,
  mockDashboardConfig,
  mockDscStatus,
  mockK8sResourceList,
} from '#~/__mocks__';
import { mockDsciStatus } from '#~/__mocks__/mockDsciStatus';
import { StackComponent } from '#~/concepts/areas/types';
import {
  FormFieldSelector,
  modelRegistrySettings,
} from '#~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import { pageNotfound } from '#~/__tests__/cypress/cypress/pages/pageNotFound';
import {
  asProductAdminUser,
  asProjectAdminUser,
} from '#~/__tests__/cypress/cypress/utils/mockUsers';
import { mockModelRegistry } from '#~/__mocks__/mockModelRegistry';
import type { ConfigSecretItem, RoleBindingSubject } from '#~/k8sTypes';
import { mockRoleBindingK8sResource } from '#~/__mocks__/mockRoleBindingK8sResource';
import { verifyRelativeURL } from '#~/__tests__/cypress/cypress/utils/url';

const groupSubjects: RoleBindingSubject[] = [
  {
    kind: 'Group',
    apiGroup: 'rbac.authorization.k8s.io',
    name: 'example-mr-users',
  },
];

const sampleCertificatePath = './cypress/tests/mocked/modelRegistrySettings/mockCertificate.pem';
const unSupportedFilePath = './cypress/tests/mocked/modelRegistrySettings/unSupportedFile.txt';

const setupMocksForMRSettingAccess = ({
  hasModelRegistries = true,
  hasDatabasePassword = true,
  disableModelRegistrySecureDB = true,
  secrets = [{ name: 'sampleSecret', keys: ['foo.crt', 'bar.crt'] }],
  configMaps = [{ name: 'foo-bar', keys: ['bar.crt'] }],
  failedToLoadCertificates = false,
}: {
  hasModelRegistries?: boolean;
  hasDatabasePassword?: boolean;
  disableModelRegistrySecureDB?: boolean;
  secrets?: ConfigSecretItem[];
  configMaps?: ConfigSecretItem[];
  failedToLoadCertificates?: boolean;
}) => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
      disableModelRegistrySecureDB,
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
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptOdh('POST /api/modelRegistries', mockModelRegistry({})).as('createModelRegistry');
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
            mockModelRegistry({
              name: 'test-registry-4',
              sslRootCertificateConfigMap: { name: 'odh-trusted-ca-bundle', key: 'ca-bundle.crt' },
            }),
            mockModelRegistry({
              name: 'test-registry-5',
              sslRootCertificateConfigMap: {
                name: 'odh-trusted-ca-bundle',
                key: 'odh-ca-bundle.crt',
              },
            }),
            mockModelRegistry({
              name: 'test-registry-7',
              sslRootCertificateSecret: { name: 'sampleSecret', key: 'foo.crt' },
            }),
            mockModelRegistry({
              name: 'test-registry-8',
              sslRootCertificateConfigMap: { name: 'new-certificate-db-credential', key: 'ca.crt' },
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
    'GET /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-4' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-4',
        sslRootCertificateConfigMap: { name: 'odh-trusted-ca-bundle', key: 'ca-bundle.crt' },
      }),
      databasePassword: hasDatabasePassword ? 'test-password' : undefined,
    },
  );
  cy.interceptOdh(
    'GET /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-5' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-5',
        sslRootCertificateConfigMap: { name: 'odh-trusted-ca-bundle', key: 'odh-ca-bundle.crt' },
      }),
      databasePassword: hasDatabasePassword ? 'test-password' : undefined,
    },
  );

  cy.interceptOdh(
    'GET /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-7' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-7',
        sslRootCertificateSecret: { name: 'sampleSecret', key: 'foo.crt' },
      }),
      databasePassword: hasDatabasePassword ? 'test-password' : undefined,
    },
  );
  cy.interceptOdh(
    'GET /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-8' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-8',
        sslRootCertificateConfigMap: { name: 'new-certificate-db-credential', key: 'ca.crt' },
      }),
      databasePassword: hasDatabasePassword ? 'test-password' : undefined,
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
  ).as('updateModelRegistry');

  cy.interceptOdh(
    'PATCH /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-4' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-4',
        sslRootCertificateConfigMap: { name: 'odh-trusted-ca-bundle', key: 'odh-ca-bundle.crt' },
      }),
      databasePassword: 'test-password',
    },
  ).as('updateTestRegistry-4');

  cy.interceptOdh(
    'PATCH /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-5' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-5',
        sslRootCertificateConfigMap: { name: 'foo-bar', key: 'bar.crt' },
      }),
      databasePassword: 'test-password',
    },
  ).as('updateTestRegistry-5');

  cy.interceptOdh(
    'PATCH /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-7' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-7',
        sslRootCertificateConfigMap: { name: 'foo-bar', key: 'bar.crt' },
      }),
      databasePassword: 'test-password',
    },
  ).as('updateTestRegistry-7');

  cy.interceptOdh(
    'PATCH /api/modelRegistries/:modelRegistryName',
    {
      path: { modelRegistryName: 'test-registry-8' },
    },
    {
      modelRegistry: mockModelRegistry({
        name: 'test-registry-8',
        sslRootCertificateConfigMap: { name: 'foo-bar', key: 'bar.crt' },
      }),
      databasePassword: 'test-password',
    },
  ).as('updateTestRegistry-8');

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
      mockRoleBindingK8sResource({
        namespace: 'odh-model-registries',
        name: 'test-registry-4-user',
        subjects: groupSubjects,
        roleRefName: 'registry-user-test-registry-4',
        modelRegistryName: 'test-registry-4',
      }),
      mockRoleBindingK8sResource({
        namespace: 'odh-model-registries',
        name: 'test-registry-8-user',
        subjects: groupSubjects,
        roleRefName: 'registry-user-test-registry-8',
        modelRegistryName: 'test-registry-8',
      }),
      mockRoleBindingK8sResource({
        namespace: 'odh-model-registries',
        name: 'test-registry-5-user',
        subjects: groupSubjects,
        roleRefName: 'registry-user-test-registry-5',
        modelRegistryName: 'test-registry-5',
      }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/modelRegistryCertificates',
    failedToLoadCertificates
      ? (req) => {
          req.reply(500); // Something went wrong
        }
      : mockConfigMapsSecrets({ secrets, configMaps }),
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
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@createModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            name: 'image',
            namespace: 'odh-model-registries',
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'valid-mr-name',
            },
          },
          spec: {
            mysql: {
              host: 'host',
              port: 1234,
              database: 'myDatabase',
              username: 'validUser',
              skipDBCreation: false,
            },
          },
        },
        databasePassword: 'strongPassword',
      });
    });
  });

  it('show error when certificates fails to load', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      failedToLoadCertificates: true,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findErrorFetchingResourceAlert().should('exist');
    modelRegistrySettings
      .findErrorFetchingResourceAlert()
      .should('have.text', 'Danger alert:Error fetching config maps and secrets');
    modelRegistrySettings.findSubmitButton().should('be.disabled');
  });

  it('checks whether the secure DB section exists, both first and second radio options are disabled and third option is checked', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();

    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findClusterWideCARadio().should('be.disabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.disabled');
    modelRegistrySettings.findSubmitButton().should('be.disabled');
    modelRegistrySettings.findExistingCARadio().should('be.checked');
  });

  it('when Use cluster-wide CA bundle is disabled, it should check Use Open Data Hub CA bundle', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['odh-ca-bundle.crt'] }],
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');

    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findClusterWideCARadio().should('be.disabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.enabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');
  });

  it('both first and second radio options are enabled', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['ca-bundle.crt', 'odh-ca-bundle.crt'] }],
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');

    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findClusterWideCARadio().should('be.enabled');
    modelRegistrySettings.findClusterWideCARadio().should('be.checked');
    modelRegistrySettings.findOpenshiftCARadio().should('be.enabled');
    modelRegistrySettings.findSubmitButton().should('be.enabled');
  });

  it('create a model registry with Use cluster-wide CA bundle option', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['ca-bundle.crt'] }],
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findClusterWideCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@createModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            name: 'valid-mr-name',
            namespace: 'odh-model-registries',
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'valid-mr-name',
            },
          },
          spec: {
            mysql: {
              host: 'host',
              port: 1234,
              database: 'myDatabase',
              username: 'validUser',
              skipDBCreation: false,
              sslRootCertificateConfigMap: { name: 'odh-trusted-ca-bundle', key: 'ca-bundle.crt' },
            },
          },
        },
        databasePassword: 'strongPassword',
      });
    });
  });

  it('create a model registry with Use Open Data Hub CA bundle option', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['odh-ca-bundle.crt'] }],
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findClusterWideCARadio().should('be.disabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.enabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@createModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            name: 'valid-mr-name',
            namespace: 'odh-model-registries',
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'valid-mr-name',
            },
          },
          spec: {
            mysql: {
              host: 'host',
              port: 1234,
              database: 'myDatabase',
              username: 'validUser',
              skipDBCreation: false,
              sslRootCertificateConfigMap: {
                name: 'odh-trusted-ca-bundle',
                key: 'odh-ca-bundle.crt',
              },
            },
          },
        },
        databasePassword: 'strongPassword',
      });
    });
  });

  it('create a model registry with Choose from existing certificates option - secret', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findClusterWideCARadio().should('be.disabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.disabled');
    modelRegistrySettings.findExistingCARadio().should('be.enabled');
    modelRegistrySettings.findExistingCARadio().should('be.checked');

    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.disabled');
    modelRegistrySettings.findExistingCAResourceInputToggle().should('be.enabled');
    modelRegistrySettings.resourceNameSelect.openAndSelectItem('sampleSecret', true);
    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.enabled');
    modelRegistrySettings.keySelect.openAndSelectItem('bar.crt', true);
    modelRegistrySettings.resourceNameSelect.findToggleButton().click();
    cy.contains('ConfigMaps').should('be.visible');
    cy.contains('Secrets').should('be.visible');

    modelRegistrySettings.resourceNameSelect
      .findSearchInput()
      .should('be.visible')
      .type('sampleSecret');

    cy.contains('Secrets').should('be.visible');
    cy.get('body').should('not.contain', 'ConfigMaps');

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@createModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            name: 'valid-mr-name',
            namespace: 'odh-model-registries',
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'valid-mr-name',
            },
          },
          spec: {
            mysql: {
              host: 'host',
              port: 1234,
              database: 'myDatabase',
              username: 'validUser',
              skipDBCreation: false,
              sslRootCertificateSecret: { name: 'sampleSecret', key: 'bar.crt' },
            },
          },
        },
        databasePassword: 'strongPassword',
      });
    });
  });

  it('create a model registry with Choose from existing certificates - config map', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findExistingCARadio().should('be.enabled');

    modelRegistrySettings.findClusterWideCARadio().should('be.disabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.disabled');
    modelRegistrySettings.findExistingCARadio().should('be.checked');

    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.disabled');
    modelRegistrySettings.findExistingCAResourceInputToggle().should('be.enabled');
    modelRegistrySettings.resourceNameSelect.openAndSelectItem('foo-bar', true);
    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.enabled');
    modelRegistrySettings.keySelect.openAndSelectItem('bar.crt', true);

    modelRegistrySettings.resourceNameSelect.findToggleButton().click();
    cy.contains('ConfigMaps').should('be.visible');
    cy.contains('Secrets').should('be.visible');

    modelRegistrySettings.resourceNameSelect.findSearchInput().should('be.visible').type('foo-bar');

    cy.contains('ConfigMaps').should('be.visible');
    cy.get('body').should('not.contain', 'Secrets');

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@createModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            name: 'valid-mr-name',
            namespace: 'odh-model-registries',
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'valid-mr-name',
            },
          },
          spec: {
            mysql: {
              host: 'host',
              port: 1234,
              database: 'myDatabase',
              username: 'validUser',
              skipDBCreation: false,
              sslRootCertificateConfigMap: { name: 'foo-bar', key: 'bar.crt' },
            },
          },
        },
        databasePassword: 'strongPassword',
      });
    });
  });

  it('shows "No results found" when searching for non-existent value in both ConfigMaps and Secrets', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findExistingCARadio().should('be.enabled');

    modelRegistrySettings.findClusterWideCARadio().should('be.disabled');
    modelRegistrySettings.findOpenshiftCARadio().should('be.disabled');
    modelRegistrySettings.findExistingCARadio().should('be.checked');

    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.disabled');
    modelRegistrySettings.findExistingCAResourceInputToggle().should('be.enabled');

    modelRegistrySettings.resourceNameSelect.findToggleButton().click();

    modelRegistrySettings.resourceNameSelect
      .findSearchInput()
      .should('be.visible')
      .type('non-existent-value');

    cy.contains('No results found').should('be.visible');

    cy.contains('ConfigMaps').should('not.exist');
    cy.contains('Secrets').should('not.exist');
  });

  it('create a model registry with Upload new certificate option', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findUploadNewCertificateRadio().check();
    const certificateUploadSection = modelRegistrySettings.getNewCertificateUpload();
    certificateUploadSection.uploadPemFile(sampleCertificatePath);
    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@createModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            name: 'valid-mr-name',
            namespace: 'odh-model-registries',
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'valid-mr-name',
            },
          },
          spec: {
            mysql: {
              host: 'host',
              port: 1234,
              database: 'myDatabase',
              username: 'validUser',
              skipDBCreation: false,
              sslRootCertificateConfigMap: { name: 'valid-mr-name-db-credential', key: '' },
            },
          },
        },
        databasePassword: 'strongPassword',
        newDatabaseCACertificate: 'sample certificate',
      });
    });
  });

  it('Show error when creating a model registry with Upload new certificate option with unsupported file', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    cy.findByText('Create model registry').click();
    modelRegistrySettings.findFormField(FormFieldSelector.NAME).type('valid-mr-name');
    modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('host');
    modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('1234');
    modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('validUser');
    modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('strongPassword');
    modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('myDatabase');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();
    modelRegistrySettings.findUploadNewCertificateRadio().check();
    modelRegistrySettings.findCertificateNote().should('exist');
    const certificateUploadSection = modelRegistrySettings.getNewCertificateUpload();
    certificateUploadSection.uploadPemFile(unSupportedFilePath);
    certificateUploadSection.findRestrictedFileUploadHelptext().should('exist');
    certificateUploadSection
      .findRestrictedFileUploadHelptext()
      .should('have.text', 'Must be a PEM file: error status;');
    modelRegistrySettings.findSubmitButton().should('be.disabled');
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

    cy.wait('@updateModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({});
    });
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

  it('Edit model registry(without CA certificate) to add CA certificate with Use cluster-wide CA bundle option', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['ca-bundle.crt'] }],
    });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-1')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('exist');
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('not.be.checked');
    modelRegistrySettings.findAddSecureDbMRCheckbox().check();

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@updateModelRegistry').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'test-registry-1',
            },
          },
          spec: {
            mysql: {
              host: 'model-registry-db',
              port: 5432,
              database: 'model-registry',
              username: 'mlmduser',
              sslRootCertificateConfigMap: { name: 'odh-trusted-ca-bundle', key: 'ca-bundle.crt' },
              sslRootCertificateSecret: null,
            },
          },
        },
        databasePassword: 'test-password',
      });
    });
  });

  it('Edit model registry with Use cluster-wide CA bundle option selected to add CA certificate with Open Data Hub CA bundle option', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['ca-bundle.crt', 'odh-ca-bundle.crt'] }],
    });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-4')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('be.checked');
    modelRegistrySettings.findClusterWideCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');

    modelRegistrySettings.findOpenshiftCARadio().should('be.enabled');
    modelRegistrySettings.findOpenshiftCARadio().check();

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@updateTestRegistry-4').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'test-registry-4',
            },
          },
          spec: {
            mysql: {
              host: 'model-registry-db',
              port: 5432,
              database: 'model-registry',
              username: 'mlmduser',
              sslRootCertificateConfigMap: {
                name: 'odh-trusted-ca-bundle',
                key: 'odh-ca-bundle.crt',
              },
              sslRootCertificateSecret: null,
            },
          },
        },
        databasePassword: 'test-password',
      });
    });
  });

  it('Edit model registry with Open Data Hub CA bundle option selected to add CA certificate with Choose from existing certificates option - secret', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [{ name: 'odh-trusted-ca-bundle', keys: ['odh-ca-bundle.crt'] }],
      secrets: [{ name: 'sampleSecret', keys: ['bar.crt'] }],
    });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-5')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('be.checked');
    modelRegistrySettings.findOpenshiftCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');

    modelRegistrySettings.findExistingCARadio().should('be.enabled');
    modelRegistrySettings.findExistingCARadio().click();

    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.disabled');
    modelRegistrySettings.findExistingCAResourceInputToggle().should('be.enabled');
    modelRegistrySettings.resourceNameSelect.openAndSelectItem('sampleSecret', true);
    modelRegistrySettings.findExistingCAKeyInputToggle().should('be.enabled');
    modelRegistrySettings.keySelect.openAndSelectItem('bar.crt', true);

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@updateTestRegistry-5').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'test-registry-5',
            },
          },
          spec: {
            mysql: {
              host: 'model-registry-db',
              port: 5432,
              database: 'model-registry',
              username: 'mlmduser',
              sslRootCertificateSecret: { name: 'sampleSecret', key: 'bar.crt' },
              sslRootCertificateConfigMap: null,
            },
          },
        },
        databasePassword: 'test-password',
      });
    });
  });

  it('Edit model registry with Secrets selected to add CA certificate with Choose from existing certificates option - secret', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      secrets: [
        { name: 'sampleSecret', keys: ['foo.crt'] },
        { name: 'new-secret', keys: ['ca.crt'] },
      ],
    });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-7')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('be.checked');

    modelRegistrySettings.findSubmitButton().should('be.enabled');

    modelRegistrySettings.resourceNameSelect.openAndSelectItem('new-secret', true);
    modelRegistrySettings.keySelect.openAndSelectItem('ca.crt', true);

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@updateTestRegistry-7').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'test-registry-7',
            },
          },
          spec: {
            mysql: {
              host: 'model-registry-db',
              port: 5432,
              database: 'model-registry',
              username: 'mlmduser',
              sslRootCertificateConfigMap: null,
              sslRootCertificateSecret: { name: 'new-secret', key: 'ca.crt' },
            },
          },
        },
        databasePassword: 'test-password',
      });
    });
  });

  it('Edit model registry with Upload new certificate option selected to add CA certificate with Choose from existing certificates option - config map', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
      configMaps: [
        { name: 'foo-bar', keys: ['bar.crt'] },
        { name: 'new-certificate-db-credentilas', keys: ['ca.crt'] },
      ],
    });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-8')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('be.checked');

    // checking the MR form should naturally change to show that they are using "Choose from existing certificates" with the right configmap/key selected
    modelRegistrySettings.findExistingCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');

    modelRegistrySettings.resourceNameSelect.openAndSelectItem('foo-bar', true);
    modelRegistrySettings.keySelect.openAndSelectItem('bar.crt', true);

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@updateTestRegistry-8').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'test-registry-8',
            },
          },
          spec: {
            mysql: {
              host: 'model-registry-db',
              port: 5432,
              database: 'model-registry',
              username: 'mlmduser',
              sslRootCertificateConfigMap: { name: 'foo-bar', key: 'bar.crt' },
              sslRootCertificateSecret: null,
            },
          },
        },
        databasePassword: 'test-password',
      });
    });
  });

  it('Edit model registry with Upload new certificate option selected to add CA certificate with Choose from existing certificates option - secret', () => {
    setupMocksForMRSettingAccess({
      disableModelRegistrySecureDB: false,
    });
    modelRegistrySettings.visit(true);
    modelRegistrySettings
      .findModelRegistryRow('test-registry-8')
      .findKebabAction('Edit model registry')
      .click();
    modelRegistrySettings.findAddSecureDbMRCheckbox().should('be.checked');

    // checking the MR form should naturally change to show that they are using "Choose from existing certificates" with the right configmap/key selected
    modelRegistrySettings.findExistingCARadio().should('be.checked');
    modelRegistrySettings.findSubmitButton().should('be.enabled');

    modelRegistrySettings.resourceNameSelect.openAndSelectItem('sampleSecret', true);
    modelRegistrySettings.keySelect.openAndSelectItem('foo.crt', true);

    modelRegistrySettings.findSubmitButton().should('be.enabled');
    modelRegistrySettings.findSubmitButton().click();

    cy.wait('@updateTestRegistry-8').then((interception) => {
      expect(interception.request.body).to.containSubset({
        modelRegistry: {
          metadata: {
            annotations: {
              'openshift.io/description': '',
              'openshift.io/display-name': 'test-registry-8',
            },
          },
          spec: {
            mysql: {
              host: 'model-registry-db',
              port: 5432,
              database: 'model-registry',
              username: 'mlmduser',
              sslRootCertificateSecret: { name: 'sampleSecret', key: 'foo.crt' },
              sslRootCertificateConfigMap: null,
            },
          },
        },
        databasePassword: 'test-password',
      });
    });
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
    verifyRelativeURL(
      '/settings/model-resources-operations/model-registry/permissions/test-registry-1',
    );
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
