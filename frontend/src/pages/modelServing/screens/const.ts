import { ServingRuntimeSize, TimeframeStepType, TimeframeTimeType, TimeframeTitle } from './types';

export const DEFAULT_MODEL_SERVER_SIZES: ServingRuntimeSize[] = [
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

export enum STORAGE_KEYS {
  ACCESS_KEY_ID = 'access_key_id',
  SECRET_ACCESS_KEY = 'secret_access_key',
  S3_ENDPOINT = 'endpoint_url',
  DEFAULT_BUCKET = 'default_bucket',
  DEFAULT_REGION = 'region',
  PATH = 'path',
}

export const STORAGE_KEYS_REQUIRED: STORAGE_KEYS[] = [
  STORAGE_KEYS.ACCESS_KEY_ID,
  STORAGE_KEYS.SECRET_ACCESS_KEY,
  STORAGE_KEYS.S3_ENDPOINT,
];

// unit: seconds
export const TimeframeTime: TimeframeTimeType = {
  [TimeframeTitle.FIVE_MINUTES]: 5 * 60,
  [TimeframeTitle.ONE_HOUR]: 60 * 60,
  [TimeframeTitle.ONE_DAY]: 24 * 60 * 60,
  [TimeframeTitle.ONE_WEEK]: 7 * 24 * 60 * 60,
};

// make sure we always get ~300 data points
export const TimeframeStep: TimeframeStepType = {
  [TimeframeTitle.FIVE_MINUTES]: 1,
  [TimeframeTitle.ONE_HOUR]: 12,
  [TimeframeTitle.ONE_DAY]: 24 * 12,
  [TimeframeTitle.ONE_WEEK]: 7 * 24 * 12,
};
