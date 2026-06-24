import {
  type LLMInferenceServiceConfigKind,
  type TopologyType,
  type RoutingType,
} from '@odh-dashboard/llmd-serving/types';

type MockLLMInferenceServiceConfigType = {
  name?: string;
  namespace?: string;
  displayName?: string;
  configType?: TopologyType | 'router' | 'accelerator';
  topologyType?: TopologyType;
  routingType?: RoutingType;
  supportedTopologies?: TopologyType[];
  recommendedAccelerators?: string;
  runtimeVersion?: string;
  modelUri?: string;
  modelName?: string;
  templateName?: string;
  disabled?: boolean;
  preInstalled?: boolean;
};

export const mockLLMInferenceServiceConfigK8sResource = ({
  name = 'test-vllm-config',
  namespace = 'opendatahub',
  displayName = 'Test vLLM Config',
  configType = 'accelerator',
  topologyType,
  routingType,
  supportedTopologies,
  recommendedAccelerators,
  runtimeVersion = 'v0.9.1',
  modelUri = 'hf://test/model',
  modelName = 'test-model',
  templateName,
  disabled,
  preInstalled,
}: MockLLMInferenceServiceConfigType): LLMInferenceServiceConfigKind => ({
  apiVersion: 'serving.kserve.io/v1alpha2',
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
      ...(routingType ? { 'opendatahub.io/routing-type': routingType } : {}),
      ...(supportedTopologies
        ? { 'opendatahub.io/supported-topologies': JSON.stringify(supportedTopologies) }
        : {}),
      ...(preInstalled ? { 'serving.kserve.io/well-known-config': 'true' as const } : {}),
    },
    labels: {
      'opendatahub.io/config-type': topologyType ?? configType,
      ...(!preInstalled ? { 'opendatahub.io/dashboard': 'true' as const } : {}),
    },
    ...(preInstalled
      ? {
          ownerReferences: [
            {
              apiVersion: 'operator.kserve.io/v1alpha1',
              kind: 'KServe',
              name: 'default',
              uid: 'test-uid-kserve',
            },
          ],
        }
      : {}),
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
