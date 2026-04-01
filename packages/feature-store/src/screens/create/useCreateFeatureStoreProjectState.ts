import useGenericObjectState, {
  GenericObjectState,
} from '@odh-dashboard/internal/utilities/useGenericObjectState';
import {
  FeatureStoreFormData,
  RegistryType,
  PersistenceType,
  AuthzType,
  ProjectDirType,
  RemoteRegistryType,
  ScalingMode,
} from './types';

export const DEFAULT_FEATURE_STORE_FORM_DATA: FeatureStoreFormData = {
  feastProject: '',
  namespace: '',

  projectDirType: ProjectDirType.NONE,
  feastProjectDir: undefined,

  registryType: RegistryType.LOCAL,
  services: {
    registry: {
      local: {
        server: {
          restAPI: true,
          grpc: true,
        },
      },
    },
  },

  authzType: AuthzType.NONE,
  authz: undefined,

  cronJob: undefined,
  replicas: 1,

  offlinePersistenceType: PersistenceType.FILE,
  onlinePersistenceType: PersistenceType.FILE,
  registryPersistenceType: PersistenceType.FILE,

  remoteRegistryType: RemoteRegistryType.FEAST_REF,

  offlineStoreEnabled: false,

  registrySecretName: '',
  onlineStoreSecretName: '',
  offlineStoreSecretName: '',

  scalingEnabled: false,
  scalingMode: ScalingMode.STATIC,
  hpaMinReplicas: 1,
  hpaMaxReplicas: 3,

  batchEngineEnabled: false,
  batchEngineConfigMapName: '',
  batchEngineConfigMapKey: '',

  gitSecretName: '',
};

const useCreateFeatureStoreProjectState = (): GenericObjectState<FeatureStoreFormData> =>
  useGenericObjectState<FeatureStoreFormData>(DEFAULT_FEATURE_STORE_FORM_DATA);

export default useCreateFeatureStoreProjectState;
