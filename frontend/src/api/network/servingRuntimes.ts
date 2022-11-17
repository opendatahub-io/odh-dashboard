import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '../models';
import { ServingRuntimeKind } from '../../k8sTypes';
import { CreatingServingRuntimeObject } from 'pages/modelServing/screens/types';
import { getModelServingRuntimeName } from 'pages/modelServing/utils';

const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
): ServingRuntimeKind => {
  const { numReplicas, modelSize, externalRoute, tokenAuth } = data;
  const name = getModelServingRuntimeName(namespace);

  return {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: {
      name,
      namespace,
      labels: {
        name,
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        ...(externalRoute && { 'enable-route': 'true' }),
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
          image: 'quay.io/modh/odh-openvino-servingruntime-container:v1.19.0-18',
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

export const listServingRuntimes = (
  namespace?: string,
  labelSelector?: string,
): Promise<ServingRuntimeKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};

export const getServingRuntime = (name: string, namespace: string): Promise<ServingRuntimeKind> => {
  return k8sGetResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });
};

export const updateServingRuntime = (
  data: CreatingServingRuntimeObject,
  existingData: ServingRuntimeKind,
): Promise<ServingRuntimeKind> => {
  const servingRuntime = assembleServingRuntime(data, existingData.metadata.namespace);
  const updatedServingRuntime = _.merge(existingData, servingRuntime);

  if (!data.tokenAuth) {
    delete updatedServingRuntime?.metadata?.annotations?.['enable-auth'];
  }

  if (!data.externalRoute) {
    delete updatedServingRuntime?.metadata?.annotations?.['enable-route'];
  }

  return k8sUpdateResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    resource: updatedServingRuntime,
  });
};

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  const servingRuntime = assembleServingRuntime(data, namespace);
  return k8sCreateResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    resource: servingRuntime,
  });
};

export const deleteServingRuntime = (
  name: string,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  return k8sDeleteResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });
};
