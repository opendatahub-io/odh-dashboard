import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '~/api/models';
import { InferenceServiceKind, K8sAPIOptions, KnownLabels } from '~/k8sTypes';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { AcceleratorProfileState } from '~/utilities/useAcceleratorProfileState';
import { ContainerResources } from '~/types';
import { getModelServingProjects } from './projects';
import { assemblePodSpecOptions } from './utils';

export const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  secretKey?: string,
  editName?: string,
  isModelMesh?: boolean,
  inferenceService?: InferenceServiceKind,
  acceleratorState?: AcceleratorProfileState,
): InferenceServiceKind => {
  const {
    storage,
    format,
    servingRuntimeName,
    project,
    modelSize,
    maxReplicas,
    minReplicas,
    tokenAuth,
  } = data;
  const name = editName || translateDisplayNameForK8s(data.name);
  const { path, dataConnection } = storage;
  const dataConnectionKey = secretKey || dataConnection;

  const updateInferenceService: InferenceServiceKind = inferenceService
    ? {
        ...inferenceService,
        metadata: {
          ...inferenceService.metadata,
          annotations: {
            'openshift.io/display-name': data.name.trim(),
            ...(isModelMesh
              ? { 'serving.kserve.io/deploymentMode': 'ModelMesh' }
              : {
                  'serving.knative.openshift.io/enablePassthrough': 'true',
                  'sidecar.istio.io/inject': 'true',
                  'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
                  ...(tokenAuth && { 'security.opendatahub.io/enable-auth': 'true' }),
                }),
          },
        },
        spec: {
          predictor: {
            ...(!isModelMesh && { minReplicas }),
            ...(!isModelMesh && { maxReplicas }),
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
      }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name,
          namespace: project,
          labels: {
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
          },
          annotations: {
            'openshift.io/display-name': data.name.trim(),
            ...(isModelMesh
              ? { 'serving.kserve.io/deploymentMode': 'ModelMesh' }
              : {
                  'serving.knative.openshift.io/enablePassthrough': 'true',
                  'sidecar.istio.io/inject': 'true',
                  'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
                  ...(tokenAuth && { 'security.opendatahub.io/enable-auth': 'true' }),
                }),
          },
        },
        spec: {
          predictor: {
            ...(!isModelMesh && { minReplicas }),
            ...(!isModelMesh && { maxReplicas }),
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

  if (!tokenAuth && updateInferenceService.metadata.annotations) {
    delete updateInferenceService.metadata.annotations['serving.knative.openshift.io/token-auth'];
  }

  // Resource and Accelerator support for KServe
  if (!isModelMesh) {
    const resourceSettings: ContainerResources = {
      requests: {
        cpu: modelSize.resources.requests?.cpu,
        memory: modelSize.resources.requests?.memory,
      },
      limits: {
        cpu: modelSize.resources.limits?.cpu,
        memory: modelSize.resources.limits?.memory,
      },
    };

    const { tolerations, resources } = assemblePodSpecOptions(resourceSettings, acceleratorState);

    if (tolerations.length !== 0) {
      updateInferenceService.spec.predictor.tolerations = tolerations;
    }

    updateInferenceService.spec.predictor.model.resources = resources;
  }

  return updateInferenceService;
};

export const listInferenceService = (
  namespace?: string,
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        queryOptions,
      },
      opts,
    ),
  ).then((listResource) => listResource.items);
};

export const listScopedInferenceService = (
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind[]> =>
  getModelServingProjects(opts).then((projects) =>
    Promise.all(
      projects.map((project) => listInferenceService(project.metadata.name, labelSelector, opts)),
    ).then((fetchedListInferenceService) =>
      _.flatten(
        fetchedListInferenceService.map((projectInferenceServices) =>
          _.uniqBy(projectInferenceServices, (is) => is.metadata.name),
        ),
      ),
    ),
  );

export const getInferenceServiceContext = (
  namespace?: string,
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind[]> => {
  if (namespace) {
    return listInferenceService(namespace, labelSelector, opts);
  }
  return listScopedInferenceService(labelSelector, opts);
};

export const getInferenceService = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> =>
  k8sGetResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const createInferenceService = (
  data: CreatingInferenceServiceObject,
  secretKey?: string,
  isModelMesh?: boolean,
  acceleratorState?: AcceleratorProfileState,
  dryRun = false,
): Promise<InferenceServiceKind> => {
  const inferenceService = assembleInferenceService(
    data,
    secretKey,
    undefined,
    isModelMesh,
    undefined,
    acceleratorState,
  );
  return k8sCreateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: inferenceService,
      },
      { dryRun },
    ),
  );
};

export const updateInferenceService = (
  data: CreatingInferenceServiceObject,
  existingData: InferenceServiceKind,
  secretKey?: string,
  isModelMesh?: boolean,
  acceleratorState?: AcceleratorProfileState,
  dryRun = false,
): Promise<InferenceServiceKind> => {
  const inferenceService = assembleInferenceService(
    data,
    secretKey,
    existingData.metadata.name,
    isModelMesh,
    existingData,
    acceleratorState,
  );

  return k8sUpdateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: inferenceService,
      },
      { dryRun },
    ),
  );
};

export const deleteInferenceService = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<InferenceServiceKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
