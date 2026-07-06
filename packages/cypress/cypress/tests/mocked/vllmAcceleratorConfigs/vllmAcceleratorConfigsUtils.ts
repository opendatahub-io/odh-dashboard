import { mockK8sResourceList } from '@odh-dashboard/internal/__mocks__/mockK8sResourceList';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { ConfigType } from '@odh-dashboard/llmd-serving/types';

export const vllmAcceleratorConfigsInitialMock = [
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-cuda',
    displayName: 'vLLM CUDA Accelerator',
    labels: {
      'opendatahub.io/config-type': ConfigType.ACCELERATOR,
    },
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-rocm',
    displayName: 'vLLM ROCm Accelerator',
    annotations: {
      'serving.kserve.io/well-known-config': 'true',
    },
    labels: {
      'opendatahub.io/config-type': ConfigType.ACCELERATOR,
    },
    ownerReferences: [
      {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        name: 'kserve-controller-manager',
        uid: 'some-uid',
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-cpu',
    displayName: 'vLLM CPU Accelerator',
    annotations: {
      'opendatahub.io/disabled': 'true',
    },
    labels: {
      'opendatahub.io/config-type': ConfigType.ACCELERATOR,
    },
  }),
  mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-tpu',
    displayName: 'vLLM TPU Accelerator',
    annotations: {
      'opendatahub.io/support-status': 'unsupported',
    },
    labels: {
      'opendatahub.io/config-type': ConfigType.ACCELERATOR,
    },
  }),
];

export const vllmAcceleratorConfigsIntercept = (): void => {
  cy.interceptK8sList(
    {
      model: {
        apiVersion: 'v1alpha2',
        apiGroup: 'serving.kserve.io',
        kind: 'LLMInferenceServiceConfig',
        plural: 'llminferenceserviceconfigs',
      },
    },
    mockK8sResourceList(vllmAcceleratorConfigsInitialMock),
  );
};
