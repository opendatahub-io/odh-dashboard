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
  NotebookModel,
  PVCModel,
  ProjectModel,
  SecretModel,
  StorageClassModel,
  HardwareProfileModel,
} from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { createSpawnerPage } from '../../../pages/workbench';

const mockOpaqueSecret = (name: string, keys: string[]) =>
  mockCustomSecretK8sResource({
    name,
    namespace: 'test-project',
    data: Object.fromEntries(keys.map((k) => [k, btoa(`${k}-value`)])),
    type: 'Opaque',
  });

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

    cy.interceptK8s('POST', NotebookModel, { statusCode: 200, body: {} }).as('createNotebook');
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

    cy.findByRole('option', { name: 'db-credentials' }).should('exist');
    cy.findByRole('option', { name: 'api-config' }).should('exist');
    cy.findByRole('option', { name: 'conn-protocol' }).should('not.exist');
    cy.findByRole('option', { name: 'conn-ref' }).should('not.exist');
    cy.findByRole('option', { name: 'sa-token-secret' }).should('not.exist');
    cy.findByRole('option', { name: 'secret-abc123' }).should('not.exist');
  });

  it('should select all keys by default and write secretKeyRef entries for each key on save', () => {
    createSpawnerPage.visitSpawner('test-project');

    createSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('test-wb');
    createSpawnerPage.findAddVariableButton().click();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.selectEnvironmentVariableType('Existing secret');
    envField.selectExistingSecret(0, 'db-credentials');

    envField.findExistingSecretAllKeysCheckbox(0).should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'DB_HOST').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'DB_PORT').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'DB_USER').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'DB_PASSWORD').should('be.checked');

    createSpawnerPage.findSubmitButton().click();

    cy.wait('@createNotebook').then((interception) => {
      const { env } = interception.request.body.spec.template.spec.containers[0];
      const secretKeyRefs = env.filter(
        (e: Record<string, unknown>) => e.valueFrom && typeof e.valueFrom === 'object',
      );
      expect(secretKeyRefs).to.have.length(4);

      const refNames = secretKeyRefs.map(
        (e: { valueFrom: { secretKeyRef: { key: string } } }) => e.valueFrom.secretKeyRef.key,
      );
      expect(refNames).to.include.members(['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD']);

      secretKeyRefs.forEach((e: { valueFrom: { secretKeyRef: { name: string } } }) =>
        expect(e.valueFrom.secretKeyRef.name).to.eq('db-credentials'),
      );
    });
  });

  it('should write secretKeyRef entries for only selected keys when specific keys are chosen', () => {
    createSpawnerPage.visitSpawner('test-project');

    createSpawnerPage.k8sNameDescription.findDisplayNameInput().fill('test-wb');
    createSpawnerPage.findAddVariableButton().click();

    const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
    envField.selectEnvironmentVariableType('Existing secret');
    envField.selectExistingSecret(0, 'api-config');

    envField.findExistingSecretKeyCheckbox(0, 'API_VERSION').click();

    envField.findExistingSecretAllKeysCheckbox(0).should('not.be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'API_KEY').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'API_URL').should('be.checked');
    envField.findExistingSecretKeyCheckbox(0, 'API_VERSION').should('not.be.checked');

    createSpawnerPage.findSubmitButton().click();

    cy.wait('@createNotebook').then((interception) => {
      const { env } = interception.request.body.spec.template.spec.containers[0];
      const secretKeyRefs = env.filter(
        (e: Record<string, unknown>) => e.valueFrom && typeof e.valueFrom === 'object',
      );
      expect(secretKeyRefs).to.have.length(2);

      const refKeys = secretKeyRefs.map(
        (e: { valueFrom: { secretKeyRef: { key: string } } }) => e.valueFrom.secretKeyRef.key,
      );
      expect(refKeys).to.include.members(['API_KEY', 'API_URL']);
      expect(refKeys).to.not.include('API_VERSION');
    });
  });
});
