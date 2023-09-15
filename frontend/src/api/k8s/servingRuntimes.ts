import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '~/api/models';
import { K8sAPIOptions, ServingContainer, ServingRuntimeKind } from '~/k8sTypes';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { ContainerResources } from '~/types';
import { getModelServingRuntimeName } from '~/pages/modelServing/utils';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/pages/projects/utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { AcceleratorState } from '~/utilities/useAcceleratorState';
import { getModelServingProjects } from './projects';
import { assemblePodSpecOptions, getshmVolume, getshmVolumeMount } from './utils';

const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntime: ServingRuntimeKind,
  isCustomServingRuntimesEnabled: boolean,
  isEditing?: boolean,
  acceleratorState?: AcceleratorState,
): ServingRuntimeKind => {
  const { name: displayName, numReplicas, modelSize, externalRoute, tokenAuth } = data;
  const createName = isCustomServingRuntimesEnabled
    ? translateDisplayNameForK8s(displayName)
    : getModelServingRuntimeName(namespace);
  const updatedServingRuntime = { ...servingRuntime };

  // TODO: Enable GRPC
  if (!isEditing) {
    updatedServingRuntime.metadata = {
      ...updatedServingRuntime.metadata,
      name: createName,
      namespace,
      labels: {
        ...updatedServingRuntime.metadata.labels,
        name: createName,
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        ...updatedServingRuntime.metadata.annotations,
        'enable-route': externalRoute ? 'true' : 'false',
        'enable-auth': tokenAuth ? 'true' : 'false',
        ...(isCustomServingRuntimesEnabled && { 'openshift.io/display-name': displayName.trim() }),
        ...(isCustomServingRuntimesEnabled && {
          'opendatahub.io/template-name': servingRuntime.metadata.name,
        }),
        ...(isCustomServingRuntimesEnabled && {
          'opendatahub.io/template-display-name': getDisplayNameFromK8sResource(servingRuntime),
          'opendatahub.io/accelerator-name': acceleratorState?.accelerator?.metadata.name || '',
        }),
      },
    };
  } else {
    updatedServingRuntime.metadata = {
      ...updatedServingRuntime.metadata,
      annotations: {
        ...updatedServingRuntime.metadata.annotations,
        'enable-route': externalRoute ? 'true' : 'false',
        'enable-auth': tokenAuth ? 'true' : 'false',
        'opendatahub.io/accelerator-name': acceleratorState?.accelerator?.metadata.name || '',
        ...(isCustomServingRuntimesEnabled && { 'openshift.io/display-name': displayName.trim() }),
      },
    };
  }
  updatedServingRuntime.spec.replicas = numReplicas;

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

  const { affinity, tolerations, resources } = assemblePodSpecOptions(
    resourceSettings,
    acceleratorState,
    undefined,
    servingRuntime.spec.tolerations,
    undefined,
    updatedServingRuntime.spec.containers[0]?.resources,
  );

  const volumes = updatedServingRuntime.spec.volumes || [];
  if (!volumes.find((volume) => volume.name === 'shm')) {
    volumes.push(getshmVolume('2Gi'));
  }

  updatedServingRuntime.spec.volumes = volumes;
  updatedServingRuntime.spec.tolerations = tolerations;

  updatedServingRuntime.spec.containers = servingRuntime.spec.containers.map(
    (container): ServingContainer => {
      const volumeMounts = container.volumeMounts || [];
      if (!volumeMounts.find((volumeMount) => volumeMount.mountPath === '/dev/shm')) {
        volumeMounts.push(getshmVolumeMount());
      }

      return {
        ...container,
        resources,
        affinity,
        volumeMounts,
      };
    },
  );

  return updatedServingRuntime;
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

export const listScopedServingRuntimes = (labelSelector?: string): Promise<ServingRuntimeKind[]> =>
  getModelServingProjects().then((projects) =>
    Promise.all(
      projects.map((project) => listServingRuntimes(project.metadata.name, labelSelector)),
    ).then((listServingRuntimes) =>
      _.uniqBy(_.flatten(listServingRuntimes), (sr) => sr.metadata.name),
    ),
  );

export const getServingRuntimeContext = (
  namespace?: string,
  labelSelector?: string,
): Promise<ServingRuntimeKind[]> => {
  if (namespace) {
    return listServingRuntimes(namespace, labelSelector);
  }
  return listScopedServingRuntimes(labelSelector);
};

export const getServingRuntime = (name: string, namespace: string): Promise<ServingRuntimeKind> =>
  k8sGetResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });

export const updateServingRuntime = (options: {
  data: CreatingServingRuntimeObject;
  existingData: ServingRuntimeKind;
  isCustomServingRuntimesEnabled: boolean;
  opts?: K8sAPIOptions;
  acceleratorState?: AcceleratorState;
}): Promise<ServingRuntimeKind> => {
  const { data, existingData, isCustomServingRuntimesEnabled, opts, acceleratorState } = options;

  const updatedServingRuntime = assembleServingRuntime(
    data,
    existingData.metadata.namespace,
    existingData,
    isCustomServingRuntimesEnabled,
    true,
    acceleratorState,
  );

  return k8sUpdateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(opts, {
      model: ServingRuntimeModel,
      resource: updatedServingRuntime,
    }),
  );
};

export const createServingRuntime = (options: {
  data: CreatingServingRuntimeObject;
  namespace: string;
  servingRuntime: ServingRuntimeKind;
  isCustomServingRuntimesEnabled: boolean;
  opts?: K8sAPIOptions;
  acceleratorState?: AcceleratorState;
}): Promise<ServingRuntimeKind> => {
  const {
    data,
    namespace,
    servingRuntime,
    isCustomServingRuntimesEnabled,
    opts,
    acceleratorState,
  } = options;
  const assembledServingRuntime = assembleServingRuntime(
    data,
    namespace,
    servingRuntime,
    isCustomServingRuntimesEnabled,
    false,
    acceleratorState,
  );

  return k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(opts, {
      model: ServingRuntimeModel,
      resource: assembledServingRuntime,
    }),
  );
};

export const deleteServingRuntime = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> =>
  k8sDeleteResource<ServingRuntimeKind>(
    applyK8sAPIOptions(opts, {
      model: ServingRuntimeModel,
      queryOptions: { name, ns: namespace },
    }),
  );
