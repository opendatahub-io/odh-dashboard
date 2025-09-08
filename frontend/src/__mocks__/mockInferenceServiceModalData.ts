import {
  CreatingInferenceServiceObject,
  InferenceServiceStorageType,
} from '#~/pages/modelServing/screens/types';

type MockResourceConfigType = Partial<CreatingInferenceServiceObject>;

export const mockInferenceServiceModalData = ({
  name = 'my-inference-service',
  k8sName = 'my-inference-service-test',
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
  imagePullSecrets = undefined,
  externalRoute = false,
  tokenAuth = false,
  tokens = [],
  isKServeRawDeployment,
  dashboardNamespace = 'opendatahub',
  labels = undefined,
}: MockResourceConfigType): CreatingInferenceServiceObject => ({
  name,
  k8sName,
  project,
  servingRuntimeName,
  storage,
  format,
  minReplicas,
  maxReplicas,
  imagePullSecrets,
  externalRoute,
  tokenAuth,
  tokens,
  isKServeRawDeployment,
  dashboardNamespace,
  labels,
});
