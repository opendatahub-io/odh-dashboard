import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/internal/__mocks__/mockDscStatus';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/internal/__mocks__/mockProjectK8sResource';
import { mockSecretK8sResource } from '@odh-dashboard/internal/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/internal/__mocks__/mockServingRuntimeK8sResource';
import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  mockConnectionTypeConfigMap,
  mockModelServingFields,
} from '@odh-dashboard/internal/__mocks__/mockConnectionType';
import { modelServingGlobal, modelServingSection } from '../../../pages/modelServing';
import {
  InferenceServiceModel,
  ProjectModel,
  SecretModel,
  ServingRuntimeModel,
} from '../../../utils/models';
import { asClusterAdminUser } from '../../../utils/mockUsers';

const mockNIMOwnedInferenceService = (): InferenceServiceKind => {
  const base = mockInferenceServiceK8sResource({
    name: 'nim-managed-is',
    displayName: 'NIM Managed Model',
    namespace: 'test-project',
  });
  return {
    ...base,
    metadata: {
      ...base.metadata,
      ownerReferences: [
        {
          apiVersion: 'apps.nvidia.com/v1alpha1',
          kind: 'NIMService',
          name: 'my-nim-service',
          uid: '046c2db8-68cf-449e-b7cb-45ee7b2de60a',
          blockOwnerDeletion: true,
          controller: true,
        },
      ],
      labels: {
        ...base.metadata.labels,
        'app.kubernetes.io/managed-by': 'k8s-nim-operator',
      },
    },
  };
};

describe('NIM InferenceService Exclusion from KServe', () => {
  beforeEach(() => {
    asClusterAdminUser();

    cy.interceptOdh(
      'GET /api/dsc/status',
      mockDscStatus({
        components: {
          [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        },
      }),
    );
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableKServe: false,
        disableNIMModelServing: false,
        nimWizard: true,
      }),
    );
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({
          k8sName: 'test-project',
          displayName: 'Test Project',
          enableKServe: true,
        }),
      ]),
    );
    cy.interceptK8sList(SecretModel, mockK8sResourceList([mockSecretK8sResource({})]));
    cy.interceptOdh('GET /api/connection-types', [
      mockConnectionTypeConfigMap({
        name: 's3',
        displayName: 'S3 compatible object storage - v1',
        fields: mockModelServingFields,
      }),
    ]);
  });

  it('should not show NIM-owned InferenceServices in the KServe deployments table', () => {
    const kserveIS = mockInferenceServiceK8sResource({
      name: 'kserve-model',
      displayName: 'KServe Model',
      namespace: 'test-project',
    });
    const nimOwnedIS = mockNIMOwnedInferenceService();

    cy.interceptK8sList(
      { model: InferenceServiceModel, ns: 'test-project' },
      mockK8sResourceList([kserveIS, nimOwnedIS]),
    );
    cy.interceptK8sList(
      { model: ServingRuntimeModel, ns: 'test-project' },
      mockK8sResourceList([mockServingRuntimeK8sResource({})]),
    );

    modelServingGlobal.visit('test-project');

    modelServingSection.findDeploymentsTable().should('exist');
    modelServingSection.getDeploymentRow('KServe Model').find().should('exist');
    cy.findByTestId('deployments-table').find('tbody tr').should('have.length', 1);
  });
});
