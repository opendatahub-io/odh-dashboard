import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ModelServerModel } from 'api/models';
import { ModelServerKind } from 'k8sTypes';
import { CreatingModelServerObject } from 'pages/modelServing/screens/types';

const assembleModelServer = (
  data: CreatingModelServerObject,
  namespace: string,
): ModelServerKind => {
  const { numReplicas, modelSize, externalRoute, tokenAuth } = data;

  return {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: {
      name: `modelmesh-server-${namespace}`,
      namespace,
      labels: {
        name: `modelmesh-server-${namespace}`,
      },
      annotations: {
        ...(externalRoute && { 'create-route': 'true' }),
        ...(tokenAuth && { 'enable-auth': 'true' }),
      },
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
      replicas: numReplicas,
      protocolVersions: ['grpc-v1'],
      multiModel: true,
      grpcEndpoint: 'port:8085',
      grpcDataEndpoint: 'port:8001',
      containers: [
        {
          name: 'ovms',
          image: 'openvino/model_server:2022.2',
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
              cpu: modelSize.resources.requests.cpu,
              memory: modelSize.resources.requests.memory,
            },
            limits: {
              cpu: modelSize.resources.limits.cpu,
              memory: modelSize.resources.limits.memory,
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
};

export const getModelServers = (namespace: string): Promise<ModelServerKind[]> => {
  return k8sListResource<ModelServerKind>({
    model: ModelServerModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);
};

export const getModelServer = (name: string, namespace: string): Promise<ModelServerKind> => {
  return k8sGetResource<ModelServerKind>({
    model: ModelServerModel,
    queryOptions: { name, ns: namespace },
  });
};

export const createModelServer = (
  data: CreatingModelServerObject,
  namespace: string,
): Promise<ModelServerKind> => {
  const modelServer = assembleModelServer(data, namespace);
  console.log(modelServer);

  return k8sCreateResource<ModelServerKind>({
    model: ModelServerModel,
    resource: modelServer,
  });
};

export const deleteModelServer = (name: string, namespace: string): Promise<ModelServerKind> => {
  return k8sDeleteResource<ModelServerKind>({
    model: ModelServerModel,
    queryOptions: { name, ns: namespace },
  });
};
