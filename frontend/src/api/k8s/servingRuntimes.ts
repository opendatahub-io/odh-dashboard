import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '~/api/models';
import { K8sAPIOptions, ServingRuntimeKind } from '~/k8sTypes';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { ContainerResources } from '~/types';
import { getModelServingRuntimeName } from '~/pages/modelServing/utils';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/pages/projects/utils';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import { getModelServingProjects } from './projects';
import { assemblePodSpecOptions } from './utils';

const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntime: ServingRuntimeKind,
  isCustomServingRuntimesEnabled: boolean,
  isEditing?: boolean,
): ServingRuntimeKind => {
  const { name: displayName, numReplicas, modelSize, externalRoute, tokenAuth, gpus } = data;
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

  const { affinity, tolerations, resources } = assemblePodSpecOptions(resourceSettings, gpus);

  updatedServingRuntime.spec.containers = servingRuntime.spec.containers.map((container) => ({
    ...container,
    resources,
    affinity,
    tolerations,
  }));

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

export const updateServingRuntime = (
  data: CreatingServingRuntimeObject,
  existingData: ServingRuntimeKind,
  isCustomServingRuntimesEnabled: boolean,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> => {
  const updatedServingRuntime = assembleServingRuntime(
    data,
    existingData.metadata.namespace,
    existingData,
    isCustomServingRuntimesEnabled,
    true,
  );

  return k8sUpdateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(opts, {
      model: ServingRuntimeModel,
      resource: updatedServingRuntime,
    }),
  );
};

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntime: ServingRuntimeKind,
  isCustomServingRuntimesEnabled: boolean,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> => {
  const assembledServingRuntime = assembleServingRuntime(
    data,
    namespace,
    servingRuntime,
    isCustomServingRuntimesEnabled,
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
