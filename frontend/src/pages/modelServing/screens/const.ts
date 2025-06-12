import { ModelServingSize } from './types';

export const platformKeyMap = {
  single: 'kServe',
  multi: 'modelMesh',
} as const;

export const SERVING_RUNTIME_SCOPE = {
  Global: 'global',
  Project: 'project',
};

export const DEFAULT_MODEL_SERVER_SIZES: ModelServingSize[] = [
  {
    name: 'Small',
    resources: {
      limits: {
        cpu: '2',
        memory: '8Gi',
      },
      requests: {
        cpu: '1',
        memory: '4Gi',
      },
    },
  },
  {
    name: 'Medium',
    resources: {
      limits: {
        cpu: '8',
        memory: '10Gi',
      },
      requests: {
        cpu: '4',
        memory: '8Gi',
      },
    },
  },
  {
    name: 'Large',
    resources: {
      limits: {
        cpu: '10',
        memory: '20Gi',
      },
      requests: {
        cpu: '6',
        memory: '16Gi',
      },
    },
  },
];

export enum StorageKeys {
  ACCESS_KEY_ID = 'access_key_id',
  SECRET_ACCESS_KEY = 'secret_access_key',
  S3_ENDPOINT = 'endpoint_url',
  DEFAULT_BUCKET = 'default_bucket',
  DEFAULT_REGION = 'region',
  PATH = 'path',
}

export const DEPLOY_BUTTON_TOOLTIP = {
  ENABLE_SINGLE_MODEL_SERVING:
    'To deploy this model, an administrator must first enable single-model serving in the cluster settings.',
  ENABLE_MODEL_SERVING_PLATFORM:
    'To enable model serving, an administrator must first select a model serving platform in the cluster settings.',
};

export enum ScopedType {
  Project = 'Project-scoped',
  Global = 'Global-scoped',
}
