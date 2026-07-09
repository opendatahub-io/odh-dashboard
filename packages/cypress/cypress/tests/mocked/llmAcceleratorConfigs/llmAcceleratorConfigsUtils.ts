import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import {
  mockLLMInferenceServiceConfigK8sResource,
  MockConfigType,
} from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';

const llmInferenceServiceConfigModel = {
  apiVersion: 'v1alpha2',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceServiceConfig',
  plural: 'llminferenceserviceconfigs',
};

const unsupportedAcceptedConfig = mockLLMInferenceServiceConfigK8sResource({
  name: 'vllm-gaudi',
  displayName: 'vLLM Gaudi Accelerator',
  configType: MockConfigType.ACCELERATOR,
  unsupported: true,
  disabled: true,
});
unsupportedAcceptedConfig.metadata.annotations = {
  ...unsupportedAcceptedConfig.metadata.annotations,
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
  unsupportedAcceptedConfig,
];

export const llmAcceleratorConfigsIntercept = (): void => {
  cy.interceptK8sList(
    { model: llmInferenceServiceConfigModel },
    mockK8sResourceList(llmAcceleratorConfigsInitialMock),
  );
  cy.intercept(
    { method: 'PATCH', pathname: new RegExp('/apis/serving.kserve.io/v1alpha2/.*') },
    {},
  ).as('patchConfig');
};
