import { ServingRuntimeKind } from 'k8sTypes';
import { ServingRuntimeSize } from './types';

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

export const DEFAULT_MODEL_SERVING_TEAMPLATE: ServingRuntimeKind = {
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
          'registry.redhat.io/rhods/odh-openvino-servingruntime-rhel8@sha256:7ef272bc7be866257b8126620e139d6e915ee962304d3eceba9c9d50d4e79767',
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
