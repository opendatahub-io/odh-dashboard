import type { TemplateKind } from '@odh-dashboard/k8s-core';
import { GENERAL_SETTINGS_PATH } from './const';
import type { PlaceholderRuntimeImageActionData } from './placeholder-types';
import { ServingRuntimeAPIProtocol, ServingRuntimeModelType } from '../../shared';

/**
 * TODO this is a temporary data structure for the initial implementation of the runtime image install flow on the model-serving side.
 * It is structured in a natural way to prefill to the existing add SR/LLMISVCC form state, and it is subject to change when the real extension point is implemented.
 * We will replace it and adapt to the real data structure in https://redhat.atlassian.net/browse/RHOAIENG-96642.
 * Once production scaffolding no longer consumes it and it is needed only by tests, this file can move to src/__mocks__.
 */
export const mockRuntimeImageActionData = (): PlaceholderRuntimeImageActionData => {
  return {
    runtimeImageId: 'preview-vllm-0-6-0',
    runtimeImageName: 'vLLM 0.6.0',
    cancelReturnRoute: GENERAL_SETTINGS_PATH,
    deploymentResources: {
      servingRuntimeTemplate: JSON.stringify({
        apiVersion: 'template.openshift.io/v1',
        kind: 'Template',
        metadata: {
          name: 'template-vllm-0-6-0',
          namespace: 'opendatahub',
          annotations: {
            'opendatahub.io/apiProtocol': ServingRuntimeAPIProtocol.REST,
            'opendatahub.io/model-type': JSON.stringify([ServingRuntimeModelType.GENERATIVE]),
          },
        },
        objects: [
          {
            apiVersion: 'serving.kserve.io/v1alpha1',
            kind: 'ServingRuntime',
            metadata: { name: 'vllm-0-6-0' },
            spec: {
              containers: [{ name: 'vllm', image: 'quay.io/example/vllm:0.6.0' }],
              supportedModelFormats: [{ name: 'vllm' }],
            },
          },
        ],
        parameters: [],
      } satisfies TemplateKind),
      llmAcceleratorConfiguration: {
        displayName: 'vLLM 0.6.0',
        configYaml: 'apiVersion: serving.kserve.io/v1alpha1\nkind: LLMInferenceServiceConfig\n',
      },
    },
  };
};
