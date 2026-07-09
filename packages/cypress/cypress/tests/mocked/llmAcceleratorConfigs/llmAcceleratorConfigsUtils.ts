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
];

export const llmAcceleratorConfigsIntercept = (): void => {
  cy.interceptK8sList(
    {
      model: llmAcceleratorConfigModel,
    },
    mockK8sResourceList(llmAcceleratorConfigsInitialMock),
  );
};

export const interceptLlmAcceleratorConfigCreate = (): void => {
  cy.interceptK8s(
    {
      model: llmAcceleratorConfigModel,
      method: 'POST',
    },
    mockLLMInferenceServiceConfigK8sResource({
      name: 'new-config',
      displayName: 'New Config',
      configType: MockConfigType.ACCELERATOR,
    }),
  ).as('createConfig');
};

export const interceptLlmAcceleratorConfigUpdate = (name: string): void => {
  cy.interceptK8s(
    {
      model: llmAcceleratorConfigModel,
      name,
      method: 'PUT',
    },
    mockLLMInferenceServiceConfigK8sResource({
      name,
      displayName: `Updated ${name}`,
      configType: MockConfigType.ACCELERATOR,
    }),
  ).as('updateConfig');
};

export const interceptLlmAcceleratorConfigDelete = (name: string): void => {
  cy.interceptK8s(
    {
      model: llmAcceleratorConfigModel,
      name,
      method: 'DELETE',
    },
    {},
  ).as('deleteConfig');
};
