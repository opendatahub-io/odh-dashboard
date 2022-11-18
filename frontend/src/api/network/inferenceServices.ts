import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from 'api/models';
import { InferenceServiceKind, K8sStatus } from 'k8sTypes';
import { CreatingInferenceServiceObject } from 'pages/modelServing/screens/types';
import { translateDisplayNameForK8s } from 'pages/projects/utils';

const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  secretKey?: string,
  editName?: string,
): InferenceServiceKind => {
  const { storage, format, servingRuntimeName, project } = data;
  const name = editName || translateDisplayNameForK8s(data.name);
  const { path, dataConnection } = storage;
  const dataConnectionKey = secretKey || dataConnection;

  return {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: {
      name,
      namespace: project,
      labels: {
        name,
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        'openshift.io/display-name': data.name,
        'serving.kserve.io/deploymentMode': 'ModelMesh',
      },
    },
    spec: {
      predictor: {
        model: {
          modelFormat: {
            name: format.name,
            ...(format.version && { version: format.version }),
          },
          runtime: servingRuntimeName,
          storage: {
            key: dataConnectionKey,
            path,
          },
        },
      },
    },
  };
};

export const listInferenceService = (namespace?: string): Promise<InferenceServiceKind[]> => {
  return k8sListResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    ...(namespace && { queryOptions: { ns: namespace } }),
  }).then((listResource) => listResource.items);
};

export const getInferenceService = (
  name: string,
  namespace: string,
): Promise<InferenceServiceKind> => {
  return k8sGetResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });
};

export const createInferenceService = (
  data: CreatingInferenceServiceObject,
  secretKey?: string,
): Promise<InferenceServiceKind> => {
  const inferenceService = assembleInferenceService(data, secretKey);
  return k8sCreateResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    resource: inferenceService,
  });
};

export const updateInferenceService = (
  data: CreatingInferenceServiceObject,
  existingData: InferenceServiceKind,
  secretKey?: string,
): Promise<InferenceServiceKind> => {
  const inferenceService = assembleInferenceService(data, secretKey, existingData.metadata.name);

  return k8sUpdateResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    resource: _.merge({}, existingData, inferenceService),
  });
};

export const deleteInferenceService = (name: string, namespace: string): Promise<K8sStatus> => {
  return k8sDeleteResource<InferenceServiceKind, K8sStatus>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });
};
