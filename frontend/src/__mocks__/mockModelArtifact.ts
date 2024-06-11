import { ModelArtifact } from '~/concepts/modelRegistry/types';

export const mockModelArtifact = (): ModelArtifact => ({
  createTimeSinceEpoch: '1712234877179',
  id: '1',
  lastUpdateTimeSinceEpoch: '1712234877179',
  name: 'fraud detection model version 1',
  description: 'Description of model version',
  artifactType: 'model-artifact',
  customProperties: {},
  storagePath: 'test path',
  uri: 'https://huggingface.io/mnist.onnx',
});
