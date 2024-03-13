import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
} from '~/pages/modelServing/screens/types';

type MockResourceConfigType = Partial<CreatingInferenceServiceObject>;

export const mockInferenceServiceModalData = ({
  name = 'my-inference-service',
  project = 'caikit-example',
  servingRuntimeName = 'caikit',
  storage = {
    type: InferenceServiceStorageType.NEW_STORAGE,
    path: '/caikit-llama',
    dataConnection: 'aws-data-connection',
    awsData: [],
  },
  format = {
    name: 'caikit',
    version: '1.0.0',
  },
  minReplicas = 1,
  maxReplicas = 1,
  externalRoute = false,
  tokenAuth = false,
  tokens = [],
}: MockResourceConfigType): CreatingInferenceServiceObject => ({
  name,
  project,
  servingRuntimeName,
  storage,
  format,
  minReplicas,
  maxReplicas,
  externalRoute,
  tokenAuth,
  tokens,
});
