import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '~/api/models';
import { InferenceServiceKind, K8sAPIOptions, KnownLabels } from '~/k8sTypes';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { ContainerResources } from '~/types';
import { AcceleratorProfileFormData } from '~/utilities/useAcceleratorProfileFormState';
import { AcceleratorProfileState } from '~/utilities/useReadAcceleratorState';
import { getModelServingProjects } from './projects';
import { assemblePodSpecOptions } from './utils';

const applyAuthToInferenceService = (
  inferenceService: InferenceServiceKind,
  tokenAuth: boolean,
  isModelMesh?: boolean,
  isKServeRaw?: boolean,
) => {
  const updateInferenceService = structuredClone(inferenceService);
  if (!updateInferenceService.metadata.labels) {
    updateInferenceService.metadata.labels = {};
  }
  if (!updateInferenceService.metadata.annotations) {
    updateInferenceService.metadata.annotations = {};
  }
  delete updateInferenceService.metadata.annotations['security.opendatahub.io/enable-auth'];
  delete updateInferenceService.metadata.labels['security.opendatahub.io/enable-auth'];

  // KServe
  if (!isModelMesh && tokenAuth) {
    if (isKServeRaw) {
      updateInferenceService.metadata.labels['security.opendatahub.io/enable-auth'] = 'true';
    } else {
      // serverless
      updateInferenceService.metadata.annotations['security.opendatahub.io/enable-auth'] = 'true';
    }
  }

  return updateInferenceService;
};

const applyRoutingToInferenceService = (
  inferenceService: InferenceServiceKind,
  externalRoute: boolean,
  isModelMesh?: boolean,
  isKServeRaw?: boolean,
) => {
  const updateInferenceService = structuredClone(inferenceService);
  if (!updateInferenceService.metadata.labels) {
    updateInferenceService.metadata.labels = {};
  }
  delete updateInferenceService.metadata.labels['networking.knative.dev/visibility'];
  delete updateInferenceService.metadata.labels['networking.kserve.io/visibility'];

  // KServe
  if (!isModelMesh) {
    if (isKServeRaw && externalRoute) {
      updateInferenceService.metadata.labels['networking.kserve.io/visibility'] = 'exposed';
    } else if (!isKServeRaw && !externalRoute) {
      // serverless
      updateInferenceService.metadata.labels['networking.knative.dev/visibility'] = 'cluster-local';
    }
  }

  return updateInferenceService;
};

export const assembleInferenceService = (
  data: CreatingInferenceServiceObject,
  secretKey?: string,
  editName?: string,
  isModelMesh?: boolean,
  inferenceService?: InferenceServiceKind,
  isStorageNeeded?: boolean,
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileFormData,
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
    externalRoute,
    servingRuntimeArgs,
    servingRuntimeEnvVars,
  } = data;
  const name = editName || data.k8sName;
  const { path, dataConnection, uri } = storage;
  const dataConnectionKey = secretKey || dataConnection;

  const nonEmptyArgs = servingRuntimeArgs?.filter(Boolean) || [];
  const nonEmptyEnvVars = servingRuntimeEnvVars?.filter((ev) => ev.name) || [];

  let updateInferenceService: InferenceServiceKind = inferenceService
    ? {
        ...inferenceService,
        metadata: {
          ...inferenceService.metadata,
          annotations: {
            'openshift.io/display-name': data.name.trim(),
            ...(isModelMesh
              ? { 'serving.kserve.io/deploymentMode': 'ModelMesh' }
              : data.isKServeRawDeployment
              ? {
                  'serving.kserve.io/deploymentMode': 'RawDeployment',
                }
              : {
                  'serving.knative.openshift.io/enablePassthrough': 'true',
                  'sidecar.istio.io/inject': 'true',
                  'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
                }),
          },
          labels: {
            ...inferenceService.metadata.labels,
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
              ...(uri
                ? { storageUri: uri }
                : {
                    storage: {
                      key: dataConnectionKey,
                      path,
                    },
                  }),
              args: nonEmptyArgs,
              env: nonEmptyEnvVars,
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
          annotations: {
            'openshift.io/display-name': data.name.trim(),
            ...(isModelMesh
              ? { 'serving.kserve.io/deploymentMode': 'ModelMesh' }
              : data.isKServeRawDeployment
              ? {
                  'serving.kserve.io/deploymentMode': 'RawDeployment',
                }
              : {
                  'serving.knative.openshift.io/enablePassthrough': 'true',
                  'sidecar.istio.io/inject': 'true',
                  'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
                }),
          },
          labels: {
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
            ...data.labels,
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
              ...(uri
                ? { storageUri: uri }
                : {
                    storage: {
                      key: dataConnectionKey,
                      path,
                    },
                  }),
              args: nonEmptyArgs,
              env: nonEmptyEnvVars,
            },
          },
        },
      };

  updateInferenceService = applyAuthToInferenceService(
    updateInferenceService,
    tokenAuth,
    isModelMesh,
    data.isKServeRawDeployment,
  );
  updateInferenceService = applyRoutingToInferenceService(
    updateInferenceService,
    externalRoute,
    isModelMesh,
    data.isKServeRawDeployment,
  );

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

    const { tolerations, resources } = assemblePodSpecOptions(
      resourceSettings,
      initialAcceleratorProfile,
      selectedAcceleratorProfile,
    );

    if (tolerations.length !== 0) {
      updateInferenceService.spec.predictor.tolerations = tolerations;
    }

    updateInferenceService.spec.predictor.model = {
      ...updateInferenceService.spec.predictor.model,
      resources,
    };
  }

  // If storage is not needed, remove storage from the inference service
  if (isStorageNeeded !== undefined && !isStorageNeeded) {
    delete updateInferenceService.spec.predictor.model?.storage;
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
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileFormData,
  dryRun = false,
  isStorageNeeded?: boolean,
): Promise<InferenceServiceKind> => {
  const inferenceService = assembleInferenceService(
    data,
    secretKey,
    undefined,
    isModelMesh,
    undefined,
    isStorageNeeded,
    initialAcceleratorProfile,
    selectedAcceleratorProfile,
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
  initialAcceleratorProfile?: AcceleratorProfileState,
  selectedAcceleratorProfile?: AcceleratorProfileFormData,
  dryRun = false,
  isStorageNeeded?: boolean,
): Promise<InferenceServiceKind> => {
  const inferenceService = assembleInferenceService(
    data,
    secretKey,
    existingData.metadata.name,
    isModelMesh,
    existingData,
    isStorageNeeded,
    initialAcceleratorProfile,
    selectedAcceleratorProfile,
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
