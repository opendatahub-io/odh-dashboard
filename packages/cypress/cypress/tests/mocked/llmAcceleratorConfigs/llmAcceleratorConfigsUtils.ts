import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import {
  mockLLMInferenceServiceConfigK8sResource,
  MockConfigType,
} from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';

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
      model: {
        apiVersion: 'v1alpha2',
        apiGroup: 'serving.kserve.io',
        kind: 'LLMInferenceServiceConfig',
        plural: 'llminferenceserviceconfigs',
      },
    },
    mockK8sResourceList(llmAcceleratorConfigsInitialMock),
  );
};
