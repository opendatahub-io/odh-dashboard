import { ServingRuntimeKind } from '~/k8sTypes';
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

export const DEFAULT_MODEL_SERVING_TEMPLATE: ServingRuntimeKind = {
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: {
    name: '',
    namespace: '',
    labels: {
      name: '',
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {},
  },
  spec: {
    supportedModelFormats: [
      {
        name: 'openvino_ir',
        version: 'opset1',
        autoSelect: true,
      },
      {
        name: 'onnx',
        version: '1',
        autoSelect: true,
      },
    ],
    replicas: 1,
    protocolVersions: ['grpc-v1'],
    multiModel: true,
    grpcEndpoint: 'port:8085',
    grpcDataEndpoint: 'port:8001',
    containers: [
      {
        name: 'ovms',
        image:
          'quay.io/modh/openvino-model-server@sha256:c89f76386bc8b59f0748cf173868e5beef21ac7d2f78dada69089c4d37c44116',
        args: [
          '--port=8001',
          '--rest_port=8888',
          '--config_path=/models/model_config_list.json',
          '--file_system_poll_wait_seconds=0',
          '--grpc_bind_address=127.0.0.1',
          '--rest_bind_address=127.0.0.1',
        ],
        resources: {
          requests: {
            cpu: '0',
            memory: '0',
          },
          limits: {
            cpu: '0',
            memory: '0',
          },
        },
      },
    ],
    builtInAdapter: {
      serverType: 'ovms',
      runtimeManagementPort: 8888,
      memBufferBytes: 134217728,
      modelLoadingTimeoutMillis: 90000,
    },
  },
};

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
