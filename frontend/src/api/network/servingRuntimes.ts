import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '~/api/models';
import { ConfigMapKind, ServingRuntimeKind } from '~/k8sTypes';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { getModelServingRuntimeName } from '~/pages/modelServing/utils';
import { ContainerResources } from '~/types';
import { getDefaultServingRuntime } from '~/pages/modelServing/screens/projects/utils';
import { DEFAULT_MODEL_SERVING_TEMPLATE } from '~/pages/modelServing/screens/const';
import { assemblePodSpecOptions } from './utils';
import { getModelServingProjects } from './projects';

const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntime: ServingRuntimeKind,
): ServingRuntimeKind => {
  const { numReplicas, modelSize, externalRoute, tokenAuth, gpus } = data;
  const name = getModelServingRuntimeName(namespace);
  const updatedServingRuntime = { ...servingRuntime };

  updatedServingRuntime.metadata = {
    name,
    namespace,
    labels: {
      ...servingRuntime.metadata.labels,
      name,
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {
      ...servingRuntime.metadata.annotations,
      ...(externalRoute && { 'enable-route': 'true' }),
      ...(tokenAuth && { 'enable-auth': 'true' }),
    },
  };
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
): Promise<ServingRuntimeKind> => {
  const servingRuntime = assembleServingRuntime(
    data,
    existingData.metadata.namespace,
    existingData,
  );

  const updatedServingRuntime = _.merge(existingData, servingRuntime);

  if (!data.tokenAuth) {
    delete updatedServingRuntime?.metadata?.annotations?.['enable-auth'];
  }

  if (!data.externalRoute) {
    delete updatedServingRuntime?.metadata?.annotations?.['enable-route'];
  }
  return k8sUpdateResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    resource: updatedServingRuntime,
  });
};

const getAssembledServingRuntime = (
  data: CreatingServingRuntimeObject,
  servingRuntimeConfig: ConfigMapKind | undefined,
  namespace: string,
): ServingRuntimeKind => {
  const servingRuntime = getDefaultServingRuntime(servingRuntimeConfig);

  try {
    return assembleServingRuntime(data, namespace, servingRuntime);
  } catch {
    return assembleServingRuntime(data, namespace, DEFAULT_MODEL_SERVING_TEMPLATE);
  }
};

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  servingRuntimeConfig: ConfigMapKind | undefined,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  const assembledServingRuntime = getAssembledServingRuntime(data, servingRuntimeConfig, namespace);

  return k8sCreateResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    resource: assembledServingRuntime,
  });
};

export const deleteServingRuntime = (
  name: string,
  namespace: string,
): Promise<ServingRuntimeKind> =>
  k8sDeleteResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });
