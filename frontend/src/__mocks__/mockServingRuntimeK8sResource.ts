import { ServingRuntimeKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  replicas?: number;
};

export const mockServingRuntimeK8sResource = ({
  name = 'test-model',
  namespace = 'test-project',
  replicas = 0,
}: MockResourceConfigType): ServingRuntimeKind => ({
  apiVersion: 'serving.kserve.io/v1alpha1',
  kind: 'ServingRuntime',
  metadata: {
    creationTimestamp: '2023-03-17T16:05:55Z',
    labels: {
      name: name,
      'opendatahub.io/dashboard': 'true',
    },
    name: name,
    namespace: namespace,
  },
  spec: {
    builtInAdapter: {
      memBufferBytes: 134217728,
      modelLoadingTimeoutMillis: 90000,
      runtimeManagementPort: 8888,
      serverType: 'ovms',
    },
    containers: [
      {
        args: [
          '--port=8001',
          '--rest_port=8888',
          '--config_path=/models/model_config_list.json',
          '--file_system_poll_wait_seconds=0',
          '--grpc_bind_address=127.0.0.1',
          '--rest_bind_address=127.0.0.1',
        ],
        image:
          'registry.redhat.io/rhods/odh-openvino-servingruntime-rhel8@sha256:8af20e48bb480a7ba1ee1268a3cf0a507e05b256c5fcf988f8e4a3de8b87edc6',
        name: 'ovms',
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
    ],
    grpcDataEndpoint: 'port:8001',
    grpcEndpoint: 'port:8085',
    multiModel: true,
    protocolVersions: ['grpc-v1'],
    replicas: replicas,
    supportedModelFormats: [
      {
        autoSelect: true,
        name: 'openvino_ir',
        version: 'opset1',
      },
      {
        autoSelect: true,
        name: 'onnx',
        version: '1',
      },
    ],
  },
});
