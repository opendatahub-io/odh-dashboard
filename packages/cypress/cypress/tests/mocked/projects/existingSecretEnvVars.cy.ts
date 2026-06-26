import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockStorageClassList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/internal/__mocks__/mockPVCK8sResource';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockCustomSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { KnownLabels } from '@odh-dashboard/internal/k8sTypes';
import {
  ImageStreamModel,
  PVCModel,
  ProjectModel,
  SecretModel,
  StorageClassModel,
  HardwareProfileModel,
} from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { createSpawnerPage } from '../../../pages/workbench';

const mockOpaqueSecret = (name: string, keys: string[]) => {
  const secret = mockCustomSecretK8sResource({
    name,
    namespace: 'test-project',
    data: Object.fromEntries(keys.map((k) => [k, btoa(`${k}-value`)])),
    type: 'Opaque',
  });
  delete secret.metadata.labels;
  return secret;
};

const mockConnectionSecret = (name: string, annotationKey: string) =>
  mockCustomSecretK8sResource({
    name,
    namespace: 'test-project',
    data: { ENDPOINT: btoa('https://example.com') },
    type: 'Opaque',
    annotations: { [annotationKey]: 's3' },
  });

const mockSATokenSecret = () =>
  mockCustomSecretK8sResource({
    name: 'sa-token-secret',
    namespace: 'test-project',
    data: { token: btoa('tok'), 'ca.crt': btoa('cert') },
    type: 'kubernetes.io/service-account-token',
  });

const mockDashboardManagedSecret = () =>
  mockCustomSecretK8sResource({
    name: 'secret-abc123',
    namespace: 'test-project',
    data: { MY_VAR: btoa('my-value') },
    type: 'Opaque',
    labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
  });

describe('Existing Secret Environment Variables — RHOAIENG-69120/69121/69122', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
    cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
    cy.interceptK8sList(
      ImageStreamModel,
      mockK8sResourceList([
        mockImageStreamK8sResource({ name: 'test-image', displayName: 'Test image' }),
      ]),
    );
    cy.interceptK8sList(
      HardwareProfileModel,
      mockK8sResourceList(mockGlobalScopedHardwareProfiles),
    );
    cy.interceptK8sList(StorageClassModel, mockStorageClassList());
    cy.interceptK8sList(
      PVCModel,
      mockK8sResourceList([mockPVCK8sResource({ name: 'test-project-storage' })]),
    );

    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList([
        mockOpaqueSecret('db-credentials', ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD']),
        mockOpaqueSecret('api-config', ['API_KEY', 'API_URL', 'API_VERSION']),
        mockConnectionSecret('conn-protocol', 'opendatahub.io/connection-type-protocol'),
        mockConnectionSecret('conn-ref', 'opendatahub.io/connection-type-ref'),
        mockSATokenSecret(),
        mockDashboardManagedSecret(),
      ]),
    );
  });

  it('should show "Existing secret" as a third option in the env var type dropdown', () => {
    createSpawnerPage.visitSpawner('test-project');
    createSpawnerPage.findAddVariableButton().click();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField
      .find()
      .findByTestId('environment-variable-type-select')
      .findByRole('button', { name: 'Options menu' })
      .click();

    cy.findByRole('option', { name: 'Config Map' }).should('exist');
    cy.findByRole('option', { name: 'Secret' }).should('exist');
    cy.findByRole('option', { name: 'Existing secret' }).should('exist');
  });

  it('should list only non-connection Opaque secrets and filter out connections and SA tokens', () => {
    createSpawnerPage.visitSpawner('test-project');
    createSpawnerPage.findAddVariableButton().click();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.selectEnvironmentVariableType('Existing secret');

    envField.findExistingSecretSelect(0).click();

    cy.findByTestId('select-multi-typeahead-db-credentials').should('exist');
    cy.findByTestId('select-multi-typeahead-api-config').should('exist');
    cy.findByTestId('select-multi-typeahead-conn-protocol').should('not.exist');
    cy.findByTestId('select-multi-typeahead-conn-ref').should('not.exist');
    cy.findByTestId('select-multi-typeahead-sa-token-secret').should('not.exist');
    cy.findByTestId('select-multi-typeahead-secret-abc123').should('not.exist');
  });

  it('should show all key checkboxes when a secret is selected', () => {
    createSpawnerPage.visitSpawner('test-project');
    createSpawnerPage.findAddVariableButton().click();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.selectEnvironmentVariableType('Existing secret');
    envField.selectExistingSecret(0, 'db-credentials');

    envField.findExistingSecretKeyCheckbox(0, 'db-credentials', 'DB_HOST').should('exist');
    envField.findExistingSecretKeyCheckbox(0, 'db-credentials', 'DB_PORT').should('exist');
    envField.findExistingSecretKeyCheckbox(0, 'db-credentials', 'DB_USER').should('exist');
    envField.findExistingSecretKeyCheckbox(0, 'db-credentials', 'DB_PASSWORD').should('exist');
  });

  it('should allow deselecting individual keys', () => {
    createSpawnerPage.visitSpawner('test-project');
    createSpawnerPage.findAddVariableButton().click();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.selectEnvironmentVariableType('Existing secret');
    envField.selectExistingSecret(0, 'api-config');

    envField.findExistingSecretKeyCheckbox(0, 'api-config', 'API_VERSION').click();

    envField.findExistingSecretKeyCheckbox(0, 'api-config', 'API_KEY').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'api-config', 'API_URL').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'api-config', 'API_VERSION').should('not.be.checked');
  });
});
