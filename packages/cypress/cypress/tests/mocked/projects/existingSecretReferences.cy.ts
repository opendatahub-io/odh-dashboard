import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockStorageClassList,
} from '@odh-dashboard/internal/__mocks__';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockNotebookK8sResource } from '@odh-dashboard/internal/__mocks__/mockNotebookK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/internal/__mocks__/mockPVCK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockCustomSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { mockRouteK8sResource } from '@odh-dashboard/internal/__mocks__/mockRouteK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import {
  ImageStreamModel,
  NotebookModel,
  PVCModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
  HardwareProfileModel,
} from '../../../utils/models';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { createSpawnerPage, workbenchPage, workbenchActions } from '../../../pages/workbench';

const mockEligibleSecret = (name: string, data: Record<string, string>) =>
  mockCustomSecretK8sResource({
    name,
    namespace: 'test-project',
    data,
    labels: {},
    annotations: {},
  });

const initBaseIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({}));
  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({ name: 'test-image', displayName: 'Test image' }),
    ]),
  );
  cy.interceptK8sList(HardwareProfileModel, mockK8sResourceList(mockGlobalScopedHardwareProfiles));
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-project-storage' })]),
  );
};

const interceptEligibleSecrets = (secrets: ReturnType<typeof mockEligibleSecret>[]) => {
  cy.interceptK8sList(SecretModel, mockK8sResourceList(secrets));
};

const setupNotebookWithSecretKeyRefs = (
  additionalEnvs: { name: string; valueFrom: { secretKeyRef: { name: string; key: string } } }[],
) => {
  const notebook = mockNotebookK8sResource({
    name: 'test-notebook',
    displayName: 'Test Notebook',
    envFrom: [],
    additionalEnvs,
  });
  cy.interceptK8sList(NotebookModel, mockK8sResourceList([notebook]));
  cy.interceptK8s(NotebookModel, notebook);
  cy.interceptK8sList(
    PodModel,
    mockK8sResourceList([mockPodK8sResource({ name: 'test-notebook' })]),
  );
  cy.interceptK8sList(
    RouteModel,
    mockK8sResourceList([mockRouteK8sResource({ name: 'test-notebook' })]),
  );
};

describe('Existing Secret References - RHOAIENG-60680', () => {
  beforeEach(() => {
    asProductAdminUser();
    initBaseIntercepts();
  });

  describe('Create flow', () => {
    beforeEach(() => {
      interceptEligibleSecrets([
        mockEligibleSecret('db-credentials', {
          DB_HOST: 'bG9jYWxob3N0',
          DB_PASSWORD: 'cGFzcw==',
          DB_PORT: 'NTQzMg==',
        }),
        mockEligibleSecret('api-token', { API_KEY: 'dG9rZW4=' }),
      ]);
      cy.interceptK8sList(NotebookModel, mockK8sResourceList([]));
    });

    it('should display eligible secrets in typeahead dropdown', () => {
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-toggle').click();
      cy.findByTestId('env-existing-secret-option-db-credentials').should('exist');
      cy.findByTestId('env-existing-secret-option-api-token').should('exist');
    });

    it('should select a secret and show key picker with all keys checked', () => {
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-toggle').click();
      cy.findByTestId('env-existing-secret-option-db-credentials').click();

      cy.findByTestId('existing-secret-key-picker').should('exist');
      cy.findByTestId('secret-key-section-db-credentials').should('exist');
      cy.findByTestId('key-checkbox-db-credentials-DB_HOST').should('be.checked');
      cy.findByTestId('key-checkbox-db-credentials-DB_PASSWORD').should('be.checked');
      cy.findByTestId('key-checkbox-db-credentials-DB_PORT').should('be.checked');
    });

    it('should filter secrets via typeahead search', () => {
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-toggle').click();
      cy.findByTestId('env-existing-secret-search').type('api');
      cy.findByTestId('env-existing-secret-option-db-credentials').should('not.exist');
      cy.findByTestId('env-existing-secret-option-api-token').should('exist');
    });

    it('should show empty state when no eligible secrets exist', () => {
      interceptEligibleSecrets([]);
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-empty-message').should('exist');
    });

    it('should allow deselecting individual keys', () => {
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-toggle').click();
      cy.findByTestId('env-existing-secret-option-db-credentials').click();

      cy.findByTestId('key-checkbox-db-credentials-DB_PORT').click();
      cy.findByTestId('key-checkbox-db-credentials-DB_PORT').should('not.be.checked');
      cy.findByTestId('key-count-badge-db-credentials').should('contain.text', '2 of 3');
    });
  });

  describe('Edit flow', () => {
    it('should load pre-existing secretKeyRef entries as Existing secret refs', () => {
      interceptEligibleSecrets([
        mockEligibleSecret('db-credentials', {
          DB_HOST: 'bG9jYWxob3N0',
          DB_PASSWORD: 'cGFzcw==',
        }),
      ]);
      setupNotebookWithSecretKeyRefs([
        {
          name: 'DB_HOST',
          valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_HOST' } },
        },
        {
          name: 'DB_PASSWORD',
          valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_PASSWORD' } },
        },
      ]);

      workbenchPage.visit('test-project');
      workbenchPage.findNotebookTable().should('exist');
      const row = workbenchPage.getNotebookRow('Test Notebook');
      row.findKebab().click();
      workbenchActions.findEditWorkbenchAction().click();

      cy.findByTestId('secret-key-section-db-credentials').should('exist');
      cy.findByTestId('key-checkbox-db-credentials-DB_HOST').should('be.checked');
      cy.findByTestId('key-checkbox-db-credentials-DB_PASSWORD').should('be.checked');
    });

    it('should show deleted secret alert when secret no longer exists', () => {
      interceptEligibleSecrets([]);
      setupNotebookWithSecretKeyRefs([
        { name: 'OLD_KEY', valueFrom: { secretKeyRef: { name: 'gone-secret', key: 'OLD_KEY' } } },
      ]);

      workbenchPage.visit('test-project');
      const row = workbenchPage.getNotebookRow('Test Notebook');
      row.findKebab().click();
      workbenchActions.findEditWorkbenchAction().click();

      cy.findByTestId('env-deleted-secret-alert-gone-secret').should('exist');
      cy.findByTestId('remove-deleted-ref-gone-secret').should('exist');
    });

    it('should show missing keys alert when keys are removed from the secret', () => {
      interceptEligibleSecrets([mockEligibleSecret('db-credentials', { DB_HOST: 'bG9jYWxob3N0' })]);
      setupNotebookWithSecretKeyRefs([
        {
          name: 'DB_HOST',
          valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'DB_HOST' } },
        },
        {
          name: 'REMOVED_KEY',
          valueFrom: { secretKeyRef: { name: 'db-credentials', key: 'REMOVED_KEY' } },
        },
      ]);

      workbenchPage.visit('test-project');
      const row = workbenchPage.getNotebookRow('Test Notebook');
      row.findKebab().click();
      workbenchActions.findEditWorkbenchAction().click();

      cy.findByTestId('env-missing-keys-alert-db-credentials').should('exist');
      cy.findByTestId('remove-missing-keys-db-credentials').should('exist');
    });
  });

  describe('Collision warnings', () => {
    beforeEach(() => {
      interceptEligibleSecrets([
        mockEligibleSecret('secret-a', { SHARED_KEY: 'YQ==', UNIQUE_A: 'YQ==' }),
        mockEligibleSecret('secret-b', { SHARED_KEY: 'Yg==', UNIQUE_B: 'Yg==' }),
      ]);
      cy.interceptK8sList(NotebookModel, mockK8sResourceList([]));
    });

    it('should show collision warning when same key is selected from two secrets', () => {
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-toggle').click();
      cy.findByTestId('env-existing-secret-option-secret-a').click();
      cy.findByTestId('env-existing-secret-option-secret-b').click();

      cy.findByTestId('env-collision-warning').should('exist');
      cy.findByTestId('env-collision-warning').should('contain.text', 'SHARED_KEY');
      cy.findByTestId('collision-icon-secret-a-SHARED_KEY').should('exist');
      cy.findByTestId('collision-icon-secret-b-SHARED_KEY').should('exist');
    });

    it('should resolve collision when conflicting key is deselected', () => {
      cy.visitWithLogin('/projects/test-project/spawner');
      createSpawnerPage.findAddVariableButton().click();

      const envField = createSpawnerPage.getEnvironmentVariableTypeField(0);
      envField.selectEnvironmentVariableType('Secret');
      envField.selectEnvDataType('Existing secret');

      cy.findByTestId('env-existing-secret-toggle').click();
      cy.findByTestId('env-existing-secret-option-secret-a').click();
      cy.findByTestId('env-existing-secret-option-secret-b').click();

      cy.findByTestId('env-collision-warning').should('exist');

      cy.findByTestId('key-checkbox-secret-b-SHARED_KEY').click();
      cy.findByTestId('env-collision-warning').should('not.exist');
    });
  });
});
