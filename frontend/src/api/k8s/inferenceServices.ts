import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '~/api/models';
import { InferenceServiceKind, K8sAPIOptions, K8sStatus, KnownLabels } from '~/k8sTypes';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { getModelServingProjects } from './projects';

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
        [KnownLabels.DASHBOARD_RESOURCE]: 'true',
      },
      annotations: {
        'openshift.io/display-name': data.name.trim(),
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

export const listInferenceService = (
  namespace?: string,
  labelSelector?: string,
): Promise<InferenceServiceKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};

export const listScopedInferenceService = (
  labelSelector?: string,
): Promise<InferenceServiceKind[]> =>
  getModelServingProjects().then((projects) =>
    Promise.all(
      projects.map((project) => listInferenceService(project.metadata.name, labelSelector)),
    ).then((listInferenceService) =>
      _.flatten(
        listInferenceService.map((projectInferenceServices) =>
          _.uniqBy(projectInferenceServices, (is) => is.metadata.name),
        ),
      ),
    ),
  );

export const getInferenceServiceContext = (
  namespace?: string,
  labelSelector?: string,
): Promise<InferenceServiceKind[]> => {
  if (namespace) {
    return listInferenceService(namespace, labelSelector);
  }
  return listScopedInferenceService(labelSelector);
};

export const getInferenceService = (
  name: string,
  namespace: string,
): Promise<InferenceServiceKind> =>
  k8sGetResource<InferenceServiceKind>({
    model: InferenceServiceModel,
    queryOptions: { name, ns: namespace },
  });

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

export const deleteInferenceService = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<InferenceServiceKind, K8sStatus>(
    applyK8sAPIOptions(opts, {
      model: InferenceServiceModel,
      queryOptions: { name, ns: namespace },
    }),
  );
