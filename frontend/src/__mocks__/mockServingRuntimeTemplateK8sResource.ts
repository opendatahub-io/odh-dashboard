import { TemplateKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
};

export const mockTemplateK8sResource = ({
  name = 'test-model',
  namespace = 'opendatahub',
}: MockResourceConfigType): TemplateKind => ({
  apiVersion: 'template.openshift.io/v1',
  kind: 'Template',
  metadata: {
    name: 'template-ar2pcc',
    namespace,
    uid: '31277020-b60a-40c9-91bc-5ee3e2bb25ec',
    resourceVersion: '164740435',
    creationTimestamp: '2023-05-03T21:58:17Z',
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {
      tags: 'new-one,servingruntime',
    },
  },
  objects: [
    {
      apiVersion: 'serving.kserve.io/v1alpha1',
      kind: 'ServingRuntime',
      metadata: {
        name,
        annotations: {
          'openshift.io/display-name': 'New OVMS Server',
        },
        labels: {
          'opendatahub.io/dashboard': 'true',
        },
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
              '--target_device=NVIDIA',
            ],
            image:
              'quay.io/modh/openvino-model-server@sha256:c89f76386bc8b59f0748cf173868e5beef21ac7d2f78dada69089c4d37c44116',
            name: 'ovms',
            resources: {
              limits: {
                cpu: '0',
                memory: '0Gi',
              },
              requests: {
                cpu: '0',
                memory: '0Gi',
              },
            },
          },
        ],
        grpcDataEndpoint: 'port:8001',
        grpcEndpoint: 'port:8085',
        multiModel: true,
        protocolVersions: ['grpc-v1'],
        replicas: 1,
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
    },
  ],
  parameters: [],
});
