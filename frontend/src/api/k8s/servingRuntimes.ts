import * as _ from 'lodash-es';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '~/api/models';
import {
  K8sAPIOptions,
  ServingContainer,
  ServingRuntimeAnnotations,
  ServingRuntimeKind,
} from '~/k8sTypes';
import {
  CreatingServingRuntimeObject,
  SupportedModelFormatsInfo,
} from '~/pages/modelServing/screens/types';
import { getModelServingRuntimeName } from '~/pages/modelServing/utils';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/concepts/k8s/utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { getModelServingProjects } from '~/api/k8s/projects';
import { getshmVolume, getshmVolumeMount } from '~/api/k8s/utils';
import { ModelServingPodSpecOptions } from '~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';

export const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntime: ServingRuntimeKind,
  isCustomServingRuntimesEnabled: boolean,
  podSpecOptions: ModelServingPodSpecOptions,
  isEditing?: boolean,
  isModelMesh?: boolean,
): ServingRuntimeKind => {
  const {
    name: displayName,
    k8sName,
    numReplicas,
    externalRoute,
    tokenAuth,
    imageName,
    supportedModelFormatsInfo,
  } = data;
  const createName = isCustomServingRuntimesEnabled
    ? k8sName || translateDisplayNameForK8s(displayName)
    : getModelServingRuntimeName(namespace);
  const updatedServingRuntime = { ...servingRuntime };

  const annotations: ServingRuntimeAnnotations = {
    ...updatedServingRuntime.metadata.annotations,
  };

  if (externalRoute) {
    annotations['enable-route'] = 'true';
  } else {
    delete annotations['enable-route'];
  }
  if (tokenAuth) {
    annotations['enable-auth'] = 'true';
  } else {
    delete annotations['enable-auth'];
  }

  // TODO: Enable GRPC
  if (!isEditing) {
    updatedServingRuntime.metadata = {
      ...updatedServingRuntime.metadata,
      name: createName,
      namespace,
      labels: {
        ...updatedServingRuntime.metadata.labels,
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        ...annotations,
        ...(isCustomServingRuntimesEnabled && { 'openshift.io/display-name': displayName.trim() }),
        ...(isCustomServingRuntimesEnabled && {
          'opendatahub.io/template-name': servingRuntime.metadata.name,
        }),
        ...(isCustomServingRuntimesEnabled && {
          'opendatahub.io/template-display-name': getDisplayNameFromK8sResource(servingRuntime),
          'opendatahub.io/accelerator-name':
            podSpecOptions.selectedAcceleratorProfile?.metadata.name || '',
          'opendatahub.io/hardware-profile-name':
            podSpecOptions.selectedHardwareProfile?.metadata.name || '',
        }),
      },
    };
  } else {
    updatedServingRuntime.metadata = {
      ...updatedServingRuntime.metadata,
      annotations: {
        ...annotations,
        'opendatahub.io/accelerator-name':
          podSpecOptions.selectedAcceleratorProfile?.metadata.name || '',
        'opendatahub.io/hardware-profile-name':
          podSpecOptions.selectedHardwareProfile?.metadata.name || '',
        ...(isCustomServingRuntimesEnabled && { 'openshift.io/display-name': displayName.trim() }),
      },
    };
  }

  delete updatedServingRuntime.spec.replicas;
  if (isModelMesh) {
    updatedServingRuntime.spec.replicas = numReplicas;
  }

  const { tolerations, resources, nodeSelector } = podSpecOptions;

  updatedServingRuntime.spec.containers = servingRuntime.spec.containers.map(
    (container): ServingContainer => {
      const volumeMounts = container.volumeMounts || [];
      if (!volumeMounts.find((volumeMount) => volumeMount.mountPath === '/dev/shm')) {
        volumeMounts.push(getshmVolumeMount());
      }

      const updatedContainer = {
        ...container,
        ...(imageName && { image: imageName }),
      };

      const containerWithoutResources = _.omit(updatedContainer, 'resources');

      return {
        ...containerWithoutResources,
        ...(isModelMesh ? { resources } : {}),
        volumeMounts,
      };
    },
  );

  if (supportedModelFormatsInfo) {
    const supportedModelFormatsObj: SupportedModelFormatsInfo = {
      name: supportedModelFormatsInfo.name,
      version: supportedModelFormatsInfo.version,
      autoSelect: false,
      priority: 1,
    };

    updatedServingRuntime.spec.supportedModelFormats = [supportedModelFormatsObj];
  }

  if (isModelMesh) {
    if (tolerations) {
      updatedServingRuntime.spec.tolerations = tolerations;
    }
    if (nodeSelector) {
      updatedServingRuntime.spec.nodeSelector = nodeSelector;
    }
  }

  // Volume mount for /dev/shm
  const volumes = updatedServingRuntime.spec.volumes || [];
  if (!volumes.find((volume) => volume.name === 'shm')) {
    volumes.push(getshmVolume('2Gi'));
  }

  updatedServingRuntime.spec.volumes = volumes;

  return updatedServingRuntime;
};

export const listServingRuntimes = (
  namespace?: string,
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        queryOptions,
      },
      opts,
    ),
  ).then((listResource) => listResource.items);
};

export const listScopedServingRuntimes = (
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind[]> =>
  getModelServingProjects(opts).then((projects) =>
    Promise.all(
      projects.map((project) => listServingRuntimes(project.metadata.name, labelSelector, opts)),
    ).then((fetchedListServingRuntimes) =>
      _.uniqBy(_.flatten(fetchedListServingRuntimes), (sr) => sr.metadata.name),
    ),
  );

export const getServingRuntimeContext = (
  namespace?: string,
  labelSelector?: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind[]> => {
  if (namespace) {
    return listServingRuntimes(namespace, labelSelector, opts);
  }
  return listScopedServingRuntimes(labelSelector, opts);
};

export const getServingRuntime = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> =>
  k8sGetResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const updateServingRuntime = (options: {
  data: CreatingServingRuntimeObject;
  existingData: ServingRuntimeKind;
  isCustomServingRuntimesEnabled: boolean;
  opts?: K8sAPIOptions;
  podSpecOptions: ModelServingPodSpecOptions;
  isModelMesh?: boolean;
}): Promise<ServingRuntimeKind> => {
  const { data, existingData, isCustomServingRuntimesEnabled, opts, podSpecOptions, isModelMesh } =
    options;

  const updatedServingRuntime = assembleServingRuntime(
    data,
    existingData.metadata.namespace,
    existingData,
    isCustomServingRuntimesEnabled,
    podSpecOptions,
    true,
    isModelMesh,
  );

  return k8sUpdateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: updatedServingRuntime,
      },
      opts,
    ),
  );
};

export const createServingRuntime = (options: {
  data: CreatingServingRuntimeObject;
  namespace: string;
  servingRuntime: ServingRuntimeKind;
  isCustomServingRuntimesEnabled: boolean;
  opts?: K8sAPIOptions;
  podSpecOptions: ModelServingPodSpecOptions;
  isModelMesh?: boolean;
}): Promise<ServingRuntimeKind> => {
  const {
    data,
    namespace,
    servingRuntime,
    isCustomServingRuntimesEnabled,
    opts,
    podSpecOptions,
    isModelMesh,
  } = options;
  const assembledServingRuntime = assembleServingRuntime(
    data,
    namespace,
    servingRuntime,
    isCustomServingRuntimesEnabled,
    podSpecOptions,
    false,
    isModelMesh,
  );

  return k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: assembledServingRuntime,
      },
      opts,
    ),
  );
};

export const deleteServingRuntime = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> =>
  k8sDeleteResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );
