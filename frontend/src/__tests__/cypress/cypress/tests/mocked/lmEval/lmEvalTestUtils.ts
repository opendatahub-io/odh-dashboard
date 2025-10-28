import { mockDashboardConfig } from '#~/__mocks__';
import { mockLMEvaluation } from '#~/__mocks__/mockLMEvaluation';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '#~/__mocks__/mockProjectK8sResource';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import { mockDscStatus } from '#~/__mocks__/mockDscStatus';
import { mockConfigMap } from '#~/__mocks__/mockConfigMap';
import { LMEvalModel, ProjectModel, ConfigMapModel } from '#~/api/models';
import { DataScienceStackComponent } from '#~/concepts/areas/types';

export const createVLLMInferenceService = (
  name: string,
  namespace: string,
  displayName: string,
  url?: string,
): ReturnType<typeof mockInferenceServiceK8sResource> => ({
  ...mockInferenceServiceK8sResource({ name, namespace, displayName }),
  spec: {
    ...mockInferenceServiceK8sResource({ name, namespace, displayName }).spec,
    predictor: {
      ...mockInferenceServiceK8sResource({ name, namespace, displayName }).spec.predictor,
      model: {
        ...mockInferenceServiceK8sResource({ name, namespace, displayName }).spec.predictor.model,
        modelFormat: { name: 'vLLM', version: '1' },
      },
    },
  },
  status: {
    ...mockInferenceServiceK8sResource({ name, namespace, displayName }).status,
    url: url || `https://${name}-${namespace}.example.com/v1/models/${name}`,
  },
});

export const setupBasicMocks = (namespace: string): void => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.TRUSTY_AI]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disableLMEval: false }));

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([mockProjectK8sResource({ k8sName: namespace })]),
  );
  cy.interceptK8s(ProjectModel, mockProjectK8sResource({ k8sName: namespace }));
  cy.interceptK8sList(
    { model: LMEvalModel, ns: namespace },
    mockK8sResourceList([mockLMEvaluation({ namespace })]),
  );

  // Mock TrustyAI ConfigMap for security section
  cy.interceptK8s(
    { model: ConfigMapModel, ns: 'opendatahub' },
    mockConfigMap({
      name: 'trustyai-service-operator-config',
      namespace: 'opendatahub',
      data: { 'lmes-allow-online': 'true', 'lmes-allow-code-execution': 'true' },
    }),
  );
};
