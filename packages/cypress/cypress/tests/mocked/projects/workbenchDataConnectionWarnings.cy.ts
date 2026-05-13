import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockNotebookK8sResource,
  mockPodK8sResource,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSecretK8sResource,
  mockStorageClassList,
} from '@odh-dashboard/internal/__mocks__';
import { mockConnectionTypeConfigMap } from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import { mock404Error } from '@odh-dashboard/internal/__mocks__/mockK8sStatus';
import { mockImageStreamK8sResource } from '@odh-dashboard/internal/__mocks__/mockImageStreamK8sResource';
import { mockPVCK8sResource } from '@odh-dashboard/internal/__mocks__/mockPVCK8sResource';
import { mockGlobalScopedHardwareProfiles } from '@odh-dashboard/internal/__mocks__/mockHardwareProfile';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/internal/concepts/areas/types';
import {
  ConfigMapModel,
  ImageStreamModel,
  NotebookModel,
  PodModel,
  ProjectModel,
  RouteModel,
  SecretModel,
  StorageClassModel,
  PVCModel,
  HardwareProfileModel,
} from '../../../utils/models';
import { editSpawnerPage } from '../../../pages/workbench';
import { asProductAdminUser } from '../../../utils/mockUsers';

type HandlersProps = {
  connectionNames?: string[];
  hasValidConnections?: boolean;
  envFrom?: Array<{ secretRef?: { name: string }; configMapRef?: { name: string } }>;
  isEmpty?: boolean;
};

const initIntercepts = ({
  connectionNames = [],
  hasValidConnections = true,
  envFrom = [],
  isEmpty = false,
}: HandlersProps = {}) => {
  cy.interceptK8sList(StorageClassModel, mockStorageClassList());
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableConnectionTypes: false }));
  cy.interceptK8sList(ProjectModel, mockK8sResourceList([mockProjectK8sResource({})]));
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({}));
  cy.interceptK8sList(PodModel, mockK8sResourceList([mockPodK8sResource({})]));

  // Mock connection types
  cy.interceptOdh('GET /api/connection-types', [mockConnectionTypeConfigMap({})]);

  // Mock workbench form dependencies
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.WORKBENCHES]: { managementState: 'Managed' },
      },
    }),
  );
  cy.interceptK8sList(
    ImageStreamModel,
    mockK8sResourceList([
      mockImageStreamK8sResource({
        namespace: 'opendatahub',
        name: 'test-9',
        displayName: 'Test image',
      }),
    ]),
  );
  cy.interceptK8sList(HardwareProfileModel, mockK8sResourceList(mockGlobalScopedHardwareProfiles));
  cy.interceptK8sList(
    PVCModel,
    mockK8sResourceList([mockPVCK8sResource({ name: 'test-project-storage' })]),
  );

  // Build annotation string for attached connections
  const connectionsAnnotation =
    connectionNames.length > 0
      ? connectionNames.map((name) => `test-project/${name}`).join(',')
      : undefined;

  // Mock notebook with connections (only for edit flow, not create flow)
  if (!isEmpty) {
    const notebook = mockNotebookK8sResource({
      name: 'test-notebook',
      displayName: 'Test Notebook',
      envFrom,
      opts: {
        metadata: {
          annotations: {
            ...(connectionsAnnotation && {
              'opendatahub.io/connections': connectionsAnnotation,
            }),
          },
        },
      },
    });

    cy.interceptK8sList(
      { model: NotebookModel, ns: 'test-project' },
      mockK8sResourceList([notebook]),
    );

    cy.interceptK8s(NotebookModel, notebook);
  } else {
    // Empty list for create flow
    cy.interceptK8sList({ model: NotebookModel, ns: 'test-project' }, mockK8sResourceList([]));
  }

  // Mock connections as secrets
  if (hasValidConnections) {
    const connections = connectionNames.map((name) =>
      mockSecretK8sResource({
        name,
        namespace: 'test-project',
        displayName: name,
        connectionType: 's3',
      }),
    );

    cy.interceptK8sList(
      { model: SecretModel, ns: 'test-project' },
      mockK8sResourceList(connections),
    );

    // Mock individual connection GET requests
    connectionNames.forEach((name) => {
      cy.interceptK8s(
        { model: SecretModel, ns: 'test-project', name },
        mockSecretK8sResource({
          name,
          namespace: 'test-project',
          displayName: name,
          connectionType: 's3',
        }),
      );
    });
  } else {
    // Mock 404 responses for missing connections
    cy.interceptK8sList({ model: SecretModel, ns: 'test-project' }, mockK8sResourceList([]));

    connectionNames.forEach((name) => {
      cy.interceptK8s(
        { model: SecretModel, ns: 'test-project', name },
        {
          statusCode: 404,
          body: mock404Error({}),
        },
      );
    });
  }

  cy.interceptK8s('PATCH', NotebookModel, mockNotebookK8sResource({})).as('updateWorkbench');
  cy.interceptK8s(RouteModel, mockRouteK8sResource({ notebookName: 'test-notebook' }));
};

describe('Workbench Data Connection Warnings', () => {
  beforeEach(() => {
    asProductAdminUser();
  });

  describe('Environment Variable Validation (RHOAIENG-15228)', () => {
    it('should NOT show warnings when data connections are annotation-based only', () => {
      // Data connections attached via annotations (not envFrom) should never trigger
      // environment variable warnings — this is the key RHOAIENG-15228 scenario.
      initIntercepts({
        connectionNames: ['data-connection-1', 'data-connection-2'],
        hasValidConnections: true,
        envFrom: [],
      });

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
    });

    it('should show warnings only for missing envFrom references, not data connections', () => {
      // Missing envFrom secret → warning; missing data connection → no warning
      initIntercepts({
        connectionNames: ['missing-data-connection'],
        hasValidConnections: false,
        envFrom: [{ secretRef: { name: 'missing-env-var' } }],
      });

      cy.interceptK8s(
        { model: SecretModel, ns: 'test-project', name: 'missing-env-var' },
        { statusCode: 404, body: mock404Error({}) },
      );

      editSpawnerPage.visit('test-notebook');

      editSpawnerPage.findAlertMessage().should('exist');
      editSpawnerPage.findAlertMessage().should('contain.text', 'missing-env-var');
      editSpawnerPage.findAlertMessage().should('not.contain.text', 'missing-data-connection');
    });

    it('should show warning for missing ConfigMap environment variables', () => {
      initIntercepts({
        connectionNames: [],
        envFrom: [{ configMapRef: { name: 'missing-configmap' } }],
      });

      cy.interceptK8s(
        { model: ConfigMapModel, ns: 'test-project', name: 'missing-configmap' },
        { statusCode: 404, body: mock404Error({}) },
      );

      editSpawnerPage.visit('test-notebook');

      editSpawnerPage.findAlertMessage().should('exist');
      editSpawnerPage.findAlertMessage().should('contain.text', 'missing-configmap');
    });
  });

  describe('Connection Error States', () => {
    it('should handle deleted connections and multiple types without env var warnings', () => {
      // Deleted data connections should not trigger warnings
      initIntercepts({
        connectionNames: ['deleted-connection'],
        hasValidConnections: false,
      });

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');

      // Multiple connection types (s3, postgres, mysql) should also not trigger warnings
      initIntercepts({
        connectionNames: ['s3-connection', 'postgres-connection', 'mysql-connection'],
        hasValidConnections: true,
      });

      cy.interceptK8sList(
        { model: SecretModel, ns: 'test-project' },
        mockK8sResourceList([
          mockSecretK8sResource({
            name: 's3-connection',
            namespace: 'test-project',
            displayName: 's3-connection',
            connectionType: 's3',
          }),
          mockSecretK8sResource({
            name: 'postgres-connection',
            namespace: 'test-project',
            displayName: 'postgres-connection',
            connectionType: 'postgres',
          }),
          mockSecretK8sResource({
            name: 'mysql-connection',
            namespace: 'test-project',
            displayName: 'mysql-connection',
            connectionType: 'mysql',
          }),
        ]),
      );

      editSpawnerPage.visit('test-notebook');
      editSpawnerPage.findAlertMessage().should('not.exist');
    });

    it('should warn only for missing envFrom references among mixed references', () => {
      initIntercepts({
        connectionNames: ['valid-data-connection'],
        hasValidConnections: true,
        envFrom: [
          { secretRef: { name: 'missing-secret' } },
          { configMapRef: { name: 'valid-configmap' } },
        ],
      });

      cy.interceptK8s(
        { model: SecretModel, ns: 'test-project', name: 'missing-secret' },
        { statusCode: 404, body: mock404Error({}) },
      );

      cy.interceptK8s(
        { model: ConfigMapModel, ns: 'test-project', name: 'valid-configmap' },
        {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: { name: 'valid-configmap', namespace: 'test-project' },
          data: {},
        },
      );

      editSpawnerPage.visit('test-notebook');

      editSpawnerPage.findAlertMessage().should('exist');
      editSpawnerPage.findAlertMessage().should('contain.text', 'missing-secret');
      editSpawnerPage.findAlertMessage().should('not.contain.text', 'valid-data-connection');
      editSpawnerPage.findAlertMessage().should('not.contain.text', 'valid-configmap');
    });
  });
});
