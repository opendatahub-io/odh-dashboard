import type { K8sDSGResource, TemplateKind } from '@odh-dashboard/k8s-core';
import type { RuntimeImageInstallActionData } from '@mf/modelRegistry/extension-points';
import { RUNTIME_IMAGE_LIBRARY_PATH } from '../components/runtimeImageInstall/const';
import { ServingRuntimeAPIProtocol, ServingRuntimeModelType } from '../shared';

/** Representative full-resource payload for runtime image install tests. */
export const mockRuntimeImageActionData = (): RuntimeImageInstallActionData => {
  return {
    runtimeImageId: 'preview-vllm-0-6-0',
    runtimeImageName: 'vLLM 0.6.0',
    cancelReturnRoute: `${RUNTIME_IMAGE_LIBRARY_PATH}/preview-vllm-0-6-0`,
    libraryReturnRoute: RUNTIME_IMAGE_LIBRARY_PATH,
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
      llmInferenceServiceConfig: JSON.stringify({
        apiVersion: 'serving.kserve.io/v1alpha2',
        kind: 'LLMInferenceServiceConfig',
        metadata: {
          name: 'vllm-0-6-0',
          annotations: {
            'openshift.io/display-name': 'vLLM 0.6.0',
            'opendatahub.io/runtime-version': '0.6.0',
          },
        },
        spec: {
          template: {
            containers: [{ name: 'main', image: 'quay.io/example/vllm:0.6.0' }],
          },
        },
      } satisfies K8sDSGResource),
    },
  };
};
