import { ModelServingSize } from './types';

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

export const STORAGE_KEYS_REQUIRED: StorageKeys[] = [
  StorageKeys.ACCESS_KEY_ID,
  StorageKeys.SECRET_ACCESS_KEY,
  StorageKeys.S3_ENDPOINT,
];
