import { type LLMInferenceServiceConfigKind } from '@odh-dashboard/llmd-serving/types';

type MockLLMInferenceServiceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  configType?: 'accelerator' | string;
  recommendedAccelerators?: string;
  runtimeVersion?: string;
  modelUri?: string;
  modelName?: string;
  templateName?: string;
  disabled?: boolean;
};

export const mockLLMInferenceServiceConfigK8sResource = ({
  name = 'test-vllm-config',
  namespace = 'opendatahub',
  displayName = 'Test vLLM Config',
  configType = 'accelerator',
  recommendedAccelerators,
  runtimeVersion = 'v0.9.1',
  modelUri = 'hf://test/model',
  modelName = 'test-model',
  templateName,
  disabled,
}: MockLLMInferenceServiceConfigType): LLMInferenceServiceConfigKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'LLMInferenceServiceConfig',
  metadata: {
    name,
    namespace,
    annotations: {
      'openshift.io/display-name': displayName,
      'opendatahub.io/runtime-version': runtimeVersion,
      ...(recommendedAccelerators
        ? { 'opendatahub.io/recommended-accelerators': recommendedAccelerators }
        : {}),
      ...(templateName ? { 'opendatahub.io/template-name': templateName } : {}),
      ...(disabled ? { 'opendatahub.io/disabled': 'true' as const } : {}),
    },
    labels: {
      'opendatahub.io/config-type': configType,
    },
  },
  spec: {
    model: {
      uri: modelUri,
      name: modelName,
    },
    template: {
      containers: [
        {
          name: 'main',
          resources: {
            limits: { cpu: '4', memory: '16Gi' },
            requests: { cpu: '2', memory: '8Gi' },
          },
        },
      ],
    },
  },
});
