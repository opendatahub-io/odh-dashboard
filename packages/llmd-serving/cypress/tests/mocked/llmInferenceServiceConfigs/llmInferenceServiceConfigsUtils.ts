import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import {
  mockLLMInferenceServiceConfigK8sResource,
  MockConfigType,
} from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';

const llmInferenceServiceConfigModel = {
  apiVersion: 'v1alpha2',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceServiceConfig',
  plural: 'llminferenceserviceconfigs',
};

const mockVllmGaudi = mockLLMInferenceServiceConfigK8sResource({
  name: 'vllm-gaudi',
  displayName: 'vLLM Gaudi Accelerator',
  configType: MockConfigType.ACCELERATOR,
  unsupported: true,
  disabled: true,
});
mockVllmGaudi.metadata.annotations = {
  ...mockVllmGaudi.metadata.annotations,
  'opendatahub.io/unsupported-status-accepted': 'true',
};

export const llmInferenceServiceConfigsInitialMock = [
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-cuda',
    displayName: 'vLLM CUDA Accelerator',
    configType: MockConfigType.ACCELERATOR,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-rocm',
    displayName: 'vLLM ROCm Accelerator',
    configType: MockConfigType.ACCELERATOR,
    preInstalled: true,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-cpu',
    displayName: 'vLLM CPU Accelerator',
    configType: MockConfigType.ACCELERATOR,
    disabled: true,
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-tpu',
    displayName: 'vLLM TPU Accelerator',
    configType: MockConfigType.ACCELERATOR,
    unsupported: true,
  }),
  mockVllmGaudi,
];

export const llmInferenceServiceConfigsIntercept = (): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ vLLMDeploymentOnMaaS: true }));
  cy.interceptK8sList(
    {
      model: llmInferenceServiceConfigModel,
    },
    mockK8sResourceList(llmInferenceServiceConfigsInitialMock),
  );
};

export const interceptLlmInferenceServiceConfigPatch = (name: string): void => {
  cy.interceptK8s(
    'PATCH',
    { model: llmInferenceServiceConfigModel, name, ns: 'opendatahub' },
    {},
  ).as('patchConfig');
};

export const interceptLlmInferenceServiceConfigCreate = (): void => {
  cy.interceptK8s(
    'POST',
    { model: llmInferenceServiceConfigModel },
    mockLLMInferenceServiceConfigK8sResource({
      name: 'new-config',
      displayName: 'New Config',
      configType: MockConfigType.ACCELERATOR,
    }),
  ).as('createConfig');
};

export const interceptLlmInferenceServiceConfigUpdate = (name: string): void => {
  cy.interceptK8s(
    'PUT',
    { model: llmInferenceServiceConfigModel, name },
    mockLLMInferenceServiceConfigK8sResource({
      name,
      displayName: `Updated ${name}`,
      configType: MockConfigType.ACCELERATOR,
    }),
  ).as('updateConfig');
};

export const interceptLlmInferenceServiceConfigDelete = (name: string): void => {
  cy.interceptK8s(
    'DELETE',
    { model: llmInferenceServiceConfigModel, name, ns: 'opendatahub' },
    {},
  ).as('deleteConfig');
};
