import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { InferenceServiceModel } from '#~/api/models';
import {
  InferenceServiceAnnotations,
  InferenceServiceKind,
  K8sAPIOptions,
  KnownLabels,
} from '#~/k8sTypes';
import { CreatingInferenceServiceObject } from '#~/pages/modelServing/screens/types';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { getInferenceServiceDeploymentMode } from '#~/pages/modelServing/screens/projects/utils';
import { parseCommandLine } from '#~/api/k8s/utils';
import { ModelServingPodSpecOptions } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { getModelServingProjects } from './projects';

const applyAuthToInferenceService = (
  inferenceService: InferenceServiceKind,
  tokenAuth: boolean,
  isModelMesh?: boolean,
) => {
  const updateInferenceService = structuredClone(inferenceService);
  if (!updateInferenceService.metadata.annotations) {
    updateInferenceService.metadata.annotations = {};
  }
  delete updateInferenceService.metadata.annotations['security.opendatahub.io/enable-auth'];

  // KServe
  if (!isModelMesh && tokenAuth) {
    updateInferenceService.metadata.annotations['security.opendatahub.io/enable-auth'] = 'true';
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
  podSpecOptions?: ModelServingPodSpecOptions,
): InferenceServiceKind => {
  const {
    storage,
    format,
    servingRuntimeName,
    project,
    maxReplicas,
    minReplicas,
    imagePullSecrets,
    tokenAuth,
    externalRoute,
    servingRuntimeArgs,
    servingRuntimeEnvVars,
  } = data;
  const name = editName || data.k8sName;
  const { path, dataConnection, uri } = storage;
  const dataConnectionKey = secretKey || dataConnection;

  const nonEmptyArgs = servingRuntimeArgs?.filter(Boolean) || [];
  // Ensure that we properly handle separating args
  const splitArgs: string[] = nonEmptyArgs.flatMap(parseCommandLine);
  const nonEmptyEnvVars = servingRuntimeEnvVars?.filter((ev) => ev.name) || [];

  const annotations: InferenceServiceAnnotations = {
    'openshift.io/display-name': data.name.trim(),
    'serving.kserve.io/deploymentMode': getInferenceServiceDeploymentMode(
      !!isModelMesh,
      !!data.isKServeRawDeployment,
    ),
    ...(!isModelMesh &&
      !data.isKServeRawDeployment && {
        'serving.knative.openshift.io/enablePassthrough': 'true',
        'sidecar.istio.io/inject': 'true',
        'sidecar.istio.io/rewriteAppHTTPProbers': 'true',
      }),
  };

  const dashboardNamespace = data.dashboardNamespace ?? '';
  if (!isModelMesh && podSpecOptions && podSpecOptions.selectedHardwareProfile) {
    const isLegacyHardwareProfile =
      !!podSpecOptions.selectedAcceleratorProfile ||
      !podSpecOptions.selectedHardwareProfile.metadata.uid;
    if (!isLegacyHardwareProfile) {
      annotations['opendatahub.io/hardware-profile-name'] =
        podSpecOptions.selectedHardwareProfile.metadata.name;
    } else {
      const legacyName = podSpecOptions.selectedHardwareProfile.metadata.name;
      if (legacyName) {
        annotations['opendatahub.io/legacy-hardware-profile-name'] = legacyName;
      }
    }
    if (podSpecOptions.selectedHardwareProfile.metadata.namespace === project) {
      annotations['opendatahub.io/hardware-profile-namespace'] = project;
    } else {
      annotations['opendatahub.io/hardware-profile-namespace'] = dashboardNamespace;
    }
  }

  let updateInferenceService: InferenceServiceKind = inferenceService
    ? {
        ...inferenceService,
        metadata: {
          ...inferenceService.metadata,
          annotations: {
            ...inferenceService.metadata.annotations,
            ...annotations,
          },
          labels: {
            ...inferenceService.metadata.labels,
          },
        },
        spec: {
          predictor: {
            ...(!isModelMesh && { minReplicas }),
            ...(!isModelMesh && { maxReplicas }),
            ...(!isModelMesh && { imagePullSecrets }),
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
              args: splitArgs,
              env: nonEmptyEnvVars,
            },
          },
        },
      }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          annotations,
          labels: {
            [KnownLabels.DASHBOARD_RESOURCE]: 'true',
            ...data.labels,
          },
          name,
          namespace: project,
        },
        spec: {
          predictor: {
            ...(!isModelMesh && { minReplicas }),
            ...(!isModelMesh && { maxReplicas }),
            ...(!isModelMesh && { imagePullSecrets }),
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
              args: splitArgs,
              env: nonEmptyEnvVars,
            },
          },
        },
      };

  updateInferenceService = applyAuthToInferenceService(
    updateInferenceService,
    tokenAuth,
    isModelMesh,
  );
  updateInferenceService = applyRoutingToInferenceService(
    updateInferenceService,
    externalRoute,
    isModelMesh,
    data.isKServeRawDeployment,
  );

  // Only add resources for KServe, but not tolerations and nodeSelector
  if (!isModelMesh && podSpecOptions) {
    const { resources } = podSpecOptions;

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
  podSpecOptions?: ModelServingPodSpecOptions,
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
    podSpecOptions,
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
  podSpecOptions?: ModelServingPodSpecOptions,
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
    podSpecOptions,
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

export const patchInferenceServiceStoppedStatus = (
  inferenceService: InferenceServiceKind,
  stoppedStatus: 'true' | 'false',
): Promise<InferenceServiceKind> =>
  k8sPatchResource({
    model: InferenceServiceModel,
    queryOptions: {
      name: inferenceService.metadata.name,
      ns: inferenceService.metadata.namespace,
    },
    patches: [
      {
        op: 'add',
        path: '/metadata/annotations/serving.kserve.io~1stop',
        value: stoppedStatus,
      },
    ],
  });
