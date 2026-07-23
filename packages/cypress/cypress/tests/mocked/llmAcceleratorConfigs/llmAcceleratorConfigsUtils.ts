import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import {
  mockLLMInferenceServiceConfigK8sResource,
  MockConfigType,
} from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';

const llmAcceleratorConfigModel = {
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

export const llmAcceleratorConfigsInitialMock = [
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

export const llmAcceleratorConfigsIntercept = (): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ vLLMDeploymentOnMaaS: true }));
  cy.interceptK8sList(
    {
      model: llmAcceleratorConfigModel,
    },
    mockK8sResourceList(llmAcceleratorConfigsInitialMock),
  );
};

export const interceptLlmAcceleratorConfigPatch = (name: string): void => {
  cy.interceptK8s('PATCH', { model: llmAcceleratorConfigModel, name, ns: 'opendatahub' }, {}).as(
    'patchConfig',
  );
};

export const interceptLlmAcceleratorConfigCreate = (): void => {
  cy.interceptK8s(
    'POST',
    { model: llmAcceleratorConfigModel },
    mockLLMInferenceServiceConfigK8sResource({
      name: 'new-config',
      displayName: 'New Config',
      configType: MockConfigType.ACCELERATOR,
    }),
  ).as('createConfig');
};

export const interceptLlmAcceleratorConfigUpdate = (name: string): void => {
  cy.interceptK8s(
    'PUT',
    { model: llmAcceleratorConfigModel, name },
    mockLLMInferenceServiceConfigK8sResource({
      name,
      displayName: `Updated ${name}`,
      configType: MockConfigType.ACCELERATOR,
    }),
  ).as('updateConfig');
};

export const interceptLlmAcceleratorConfigDelete = (name: string): void => {
  cy.interceptK8s('DELETE', { model: llmAcceleratorConfigModel, name, ns: 'opendatahub' }, {}).as(
    'deleteConfig',
  );
};
