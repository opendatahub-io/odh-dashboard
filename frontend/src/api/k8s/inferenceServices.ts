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
import { InferenceServiceModel, PodModel } from '#~/api/models';
import {
  InferenceServiceKind,
  K8sAPIOptions,
  KnownLabels,
  PodKind,
  DeploymentMode,
} from '#~/k8sTypes';
import { CreatingInferenceServiceObject } from '#~/pages/modelServing/screens/types';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { parseCommandLine } from '#~/api/k8s/utils';
import { ModelServingPodSpecOptions } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { getModelServingProjects } from '#~/api';

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
) => {
  const updateInferenceService = structuredClone(inferenceService);
  if (!updateInferenceService.metadata.labels) {
    updateInferenceService.metadata.labels = {};
  }
  delete updateInferenceService.metadata.labels['networking.knative.dev/visibility'];
  delete updateInferenceService.metadata.labels['networking.kserve.io/visibility'];

  // KServe
  if (!isModelMesh) {
    if (externalRoute) {
      updateInferenceService.metadata.labels['networking.kserve.io/visibility'] = 'exposed';
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

  let updatedInferenceService: InferenceServiceKind = inferenceService
    ? { ...inferenceService }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name,
          namespace: project,
          annotations: {},
          labels: {},
        },
        spec: {
          predictor: {
            model: {},
          },
        },
      };

  const annotations = { ...updatedInferenceService.metadata.annotations };

  annotations['openshift.io/display-name'] = data.name.trim();
  annotations['serving.kserve.io/deploymentMode'] = DeploymentMode.RawDeployment;

  const dashboardNamespace = data.dashboardNamespace ?? '';
  if (!isModelMesh && podSpecOptions && podSpecOptions.selectedHardwareProfile) {
    annotations['opendatahub.io/hardware-profile-name'] =
      podSpecOptions.selectedHardwareProfile.metadata.name;
    if (podSpecOptions.selectedHardwareProfile.metadata.namespace === project) {
      annotations['opendatahub.io/hardware-profile-namespace'] = project;
    } else {
      annotations['opendatahub.io/hardware-profile-namespace'] = dashboardNamespace;
    }
    annotations['opendatahub.io/hardware-profile-resource-version'] =
      podSpecOptions.selectedHardwareProfile.metadata.resourceVersion || '';
  }

  const labels = { ...updatedInferenceService.metadata.labels, ...data.labels };
  labels[KnownLabels.DASHBOARD_RESOURCE] = 'true';

  updatedInferenceService.metadata.annotations = annotations;
  updatedInferenceService.metadata.labels = labels;

  const spec = { ...updatedInferenceService.spec };
  const predictor = { ...spec.predictor };

  if (!isModelMesh) {
    predictor.minReplicas = minReplicas;
    predictor.maxReplicas = maxReplicas;
    predictor.imagePullSecrets = imagePullSecrets;
  }

  const model = { ...predictor.model };
  model.modelFormat = {
    name: format.name,
    ...(format.version && { version: format.version }),
  };
  model.runtime = servingRuntimeName;

  if (uri) {
    model.storageUri = uri;
    delete model.storage;
  } else {
    delete model.storageUri;
    model.storage = {
      key: dataConnectionKey,
      path,
    };
  }

  model.args = splitArgs;
  model.env = nonEmptyEnvVars;

  predictor.model = model;

  spec.predictor = predictor;

  updatedInferenceService.spec = spec;

  updatedInferenceService = applyAuthToInferenceService(
    updatedInferenceService,
    tokenAuth,
    isModelMesh,
  );
  updatedInferenceService = applyRoutingToInferenceService(
    updatedInferenceService,
    externalRoute,
    isModelMesh,
  );

  if (!isModelMesh && podSpecOptions) {
    const { tolerations, resources, nodeSelector } = podSpecOptions;
    if (!podSpecOptions.selectedHardwareProfile) {
      if (tolerations) {
        updatedInferenceService.spec.predictor.tolerations = tolerations;
      }
      if (nodeSelector) {
        updatedInferenceService.spec.predictor.nodeSelector = nodeSelector;
      }
    }
    updatedInferenceService.spec.predictor.model = {
      ...updatedInferenceService.spec.predictor.model,
      resources: {
        ...updatedInferenceService.spec.predictor.model?.resources,
        ...resources,
      },
    };
  }

  // If storage is not needed, remove storage from the inference service
  if (isStorageNeeded !== undefined && !isStorageNeeded) {
    delete updatedInferenceService.spec.predictor.model?.storage;
  }

  return updatedInferenceService;
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

export const getInferenceServicePods = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<PodKind[]> =>
  k8sListResource<PodKind>(
    applyK8sAPIOptions(
      {
        model: PodModel,
        queryOptions: {
          ns: namespace,
          queryParams: {
            labelSelector: `serving.kserve.io/inferenceservice=${name}`,
          },
        },
      },
      opts,
    ),
  ).then((listResource) => listResource.items);

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
