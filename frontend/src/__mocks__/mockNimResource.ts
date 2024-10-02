import { ConfigMapKind, InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { mockConfigMap } from './mockConfigMap';
import { mockServingRuntimeK8sResource } from './mockServingRuntimeK8sResource';
import { mockInferenceServiceK8sResource } from './mockInferenceServiceK8sResource';

export const mockNimImages = (): ConfigMapKind =>
  mockConfigMap({
    name: 'nvidia-nim-images-data',
    namespace: 'opendatahub',
    data: {
      alphafold2:
        '{' +
        '   "name": "alphafold2",' +
        '   "displayName": "AlphaFold2",' +
        '   "shortDescription": "A widely used model for predicting the 3D structures of proteins from their amino acid sequences.",' +
        '   "namespace": "nim/deepmind",' +
        '   "tags": [' +
        '   "1.0.0"' +
        '   ],' +
        '   "latestTag": "1.0.0",' +
        '   "updatedDate": "2024-08-27T01:51:55.642Z"' +
        '  }',
      'arctic-embed-l':
        '{' +
        '   "name": "arctic-embed-l",' +
        '   "displayName": "Snowflake Arctic Embed Large Embedding",' +
        '   "shortDescription": "NVIDIA NIM for GPU accelerated Snowflake Arctic Embed Large Embedding inference",' +
        '   "namespace": "nim/snowflake",' +
        '   "tags": [' +
        '   "1.0.1",' +
        '   "1.0.0"' +
        '   ],' +
        '   "latestTag": "1.0.1",' +
        '   "updatedDate": "2024-07-27T00:38:40.927Z"' +
        '  }',
    },
  });

export const mockNimInferenceService = (): InferenceServiceKind => {
  const inferenceService = mockInferenceServiceK8sResource({
    name: 'test-name',
    modelName: 'alphafold2',
    displayName: 'Test Name',
    isModelMesh: true,
  });
  return inferenceService;
};

export const mockNimServingRuntime = (): ServingRuntimeKind => {
  const servingRuntime = mockServingRuntimeK8sResource({
    name: 'test-name',
    displayName: 'Test Name',
  });
  if (servingRuntime.metadata.annotations) {
    servingRuntime.metadata.annotations['opendatahub.io/template-display-name'] = 'NVIDIA NIM';
    servingRuntime.metadata.annotations['opendatahub.io/template-name'] = 'nvidia-nim-runtime';
  }

  return servingRuntime;
};
