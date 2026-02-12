/**
 * API functions for NVIDIA NIM Operator's NIMService custom resource.
 *
 * NIMService is the primary resource for deploying NIM models when the NIM Operator is enabled.
 * When a NIMService is created, the NIM Operator automatically creates an InferenceService.
 *
 * This replaces the need for creating ServingRuntime + InferenceService manually.
 */
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NIMServiceModel } from '#~/api/models';
import { NIMServiceKind, K8sAPIOptions, KnownLabels } from '#~/k8sTypes';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { Toleration } from '#~/types';

/**
 * List all NIMServices in a namespace
 */
export const listNIMServices = (
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind[]> =>
  k8sListResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        queryOptions: { ns: namespace },
      },
      opts,
    ),
  ).then((listResource) => listResource.items);

/**
 * Get a specific NIMService by name
 */
export const getNIMService = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind> =>
  k8sGetResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

/**
 * Parameters for creating a NIMService resource
 */
export type CreateNIMServiceParams = {
  /** Display name for the deployment */
  name: string;
  /** Kubernetes-safe name */
  k8sName: string;
  /** Target namespace */
  namespace: string;
  /** NIM container image repository (e.g., nvcr.io/nim/meta/llama-3.2-1b-instruct) */
  imageRepository: string;
  /** NIM container image tag */
  imageTag: string;
  /** Image pull secrets for NGC registry */
  imagePullSecrets: string[];
  /** Name of the secret containing NGC_API_KEY */
  authSecretName: string;
  /** PVC name for model storage */
  pvcName: string;
  /** Optional subpath within the PVC */
  pvcSubPath?: string;
  /** Number of replicas */
  replicas: number;
  /** Resource requirements */
  resources?: {
    limits?: Record<string, string>;
    requests?: Record<string, string>;
  };
  /** Service port (default: 8000) */
  servicePort?: number;
  /** Enable token authentication */
  tokenAuth?: boolean;
  /** Enable external route */
  externalRoute?: boolean;
  /** Custom environment variables */
  envVars?: { name: string; value: string }[];
  /** Node selector for pod scheduling */
  nodeSelector?: Record<string, string>;
  /** Tolerations for pod scheduling */
  tolerations?: Toleration[];
};

/**
 * Assemble a NIMService resource from parameters
 */
export const assembleNIMService = (
  params: CreateNIMServiceParams,
  existingNIMService?: NIMServiceKind,
): NIMServiceKind => {
  const {
    name,
    k8sName,
    namespace,
    imageRepository,
    imageTag,
    imagePullSecrets,
    authSecretName,
    pvcName,
    pvcSubPath,
    replicas,
    resources,
    servicePort = 8000,
    tokenAuth = false,
    externalRoute = false,
    envVars = [],
    nodeSelector,
    tolerations,
  } = params;

  const nimService: NIMServiceKind = existingNIMService
    ? structuredClone(existingNIMService)
    : {
        apiVersion: 'apps.nvidia.com/v1alpha1',
        kind: 'NIMService',
        metadata: {
          name: k8sName,
          namespace,
          annotations: {},
          labels: {},
        },
        spec: {
          inferencePlatform: 'kserve',
          image: {
            repository: imageRepository,
            tag: imageTag,
            pullPolicy: 'IfNotPresent',
            pullSecrets: imagePullSecrets,
          },
          authSecret: authSecretName,
        },
      };

  // Set annotations
  nimService.metadata.annotations = {
    ...nimService.metadata.annotations,
    'openshift.io/display-name': name.trim(),
    // Use Standard (RawDeployment) mode for KServe
    'serving.kserve.io/deploymentMode': 'Standard',
  };

  // Set labels
  nimService.metadata.labels = {
    ...nimService.metadata.labels,
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };

  // Set external route visibility
  if (externalRoute) {
    nimService.metadata.labels['networking.kserve.io/visibility'] = 'exposed';
  } else {
    delete nimService.metadata.labels['networking.kserve.io/visibility'];
  }

  // Set spec.annotations - these are propagated to the InferenceService by the NIM Operator
  // This is needed for token authentication to work correctly
  nimService.spec.annotations = {
    ...nimService.spec.annotations,
  };

  // Set token auth in spec.annotations so it's propagated to InferenceService
  // The NIM Operator propagates spec.annotations to the InferenceService it creates
  if (tokenAuth) {
    nimService.spec.annotations['security.opendatahub.io/enable-auth'] = 'true';
  } else {
    delete nimService.spec.annotations['security.opendatahub.io/enable-auth'];
  }

  // Update spec
  nimService.spec.inferencePlatform = 'kserve';
  nimService.spec.image = {
    repository: imageRepository,
    tag: imageTag,
    pullPolicy: 'IfNotPresent',
    pullSecrets: imagePullSecrets,
  };
  nimService.spec.authSecret = authSecretName;

  // Storage configuration
  nimService.spec.storage = {
    pvc: {
      name: pvcName,
      ...(pvcSubPath && { subPath: pvcSubPath }),
    },
  };

  // Replicas
  nimService.spec.replicas = replicas;

  // Resources
  if (resources) {
    nimService.spec.resources = resources;
  } else {
    delete nimService.spec.resources;
  }

  // Service exposure
  nimService.spec.expose = {
    service: {
      type: 'ClusterIP',
      port: servicePort,
    },
  };

  // Environment variables
  if (envVars.length > 0) {
    nimService.spec.env = envVars.map((ev) => ({
      name: ev.name,
      value: ev.value,
    }));
  } else {
    delete nimService.spec.env;
  }

  // Node selector
  if (nodeSelector && Object.keys(nodeSelector).length > 0) {
    nimService.spec.nodeSelector = nodeSelector;
  } else {
    delete nimService.spec.nodeSelector;
  }

  // Tolerations - pass through directly as the types are compatible
  if (tolerations && tolerations.length > 0) {
    nimService.spec.tolerations = tolerations;
  } else {
    delete nimService.spec.tolerations;
  }

  // Set spec.labels - these are propagated to the InferenceService by the NIM Operator
  // This is critical for the Dashboard to recognize and display the deployment
  nimService.spec.labels = {
    ...nimService.spec.labels,
    [KnownLabels.DASHBOARD_RESOURCE]: 'true',
  };

  // Set external route visibility in spec.labels so it's propagated to InferenceService
  // The NIM Operator propagates spec.labels to the InferenceService it creates
  if (externalRoute) {
    nimService.spec.labels['networking.kserve.io/visibility'] = 'exposed';
  } else {
    delete nimService.spec.labels['networking.kserve.io/visibility'];
  }

  return nimService;
};

/**
 * Create a new NIMService resource
 */
export const createNIMService = (
  params: CreateNIMServiceParams,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind> => {
  const nimService = assembleNIMService(params);
  return k8sCreateResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        resource: nimService,
      },
      opts,
    ),
  );
};

/**
 * Update an existing NIMService resource
 */
export const updateNIMService = (
  params: CreateNIMServiceParams,
  existingNIMService: NIMServiceKind,
  opts?: K8sAPIOptions,
): Promise<NIMServiceKind> => {
  const nimService = assembleNIMService(params, existingNIMService);
  return k8sUpdateResource<NIMServiceKind>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        resource: nimService,
      },
      opts,
    ),
  );
};

/**
 * Delete a NIMService resource
 */
export const deleteNIMService = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<NIMServiceKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: NIMServiceModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
