import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '../models';
import { ServingRuntimeKind } from '../../k8sTypes';
import { CreatingServingRuntimeObject } from 'pages/modelServing/screens/types';
import { getModelServingRuntimeName } from 'pages/modelServing/utils';
import { getModelServingProjects } from './projects';
import { getConfigMap } from './configMaps';
import { DEFAULT_MODEL_SERVING_TEMPLATE } from 'pages/modelServing/screens/const';
import YAML from 'yaml';
import { assemblePodSpecOptions } from './utils';
import { ContainerResources } from '../../types';

const fetchServingRuntime = (
  data: CreatingServingRuntimeObject,
  configNamespace: string,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  //TODO: remove fetch servingruntimes-config here and pass in the previously fetched valued.
  // Leaving it in for now to keep the original behavior when no GPU is configured.
  return getConfigMap(configNamespace, 'servingruntimes-config')
    .then((configmap) => {
      const overrideServingRuntime = YAML.parse(configmap.data?.['override-config'] || '');
      if (overrideServingRuntime) {
        return assembleServingRuntime(data, namespace, overrideServingRuntime);
      }
      const defaultServingRuntime = YAML.parse(configmap.data?.['default-config'] || '');
      if (defaultServingRuntime === null) {
        throw new Error(
          'servingruntimes-config is misconfigured or key might be missing from the ConfigMap',
        );
      }
      return assembleServingRuntime(data, namespace, defaultServingRuntime);
    })
    .catch((e) => {
      console.error(`${e}, using default config.`);
      const servingRuntime = DEFAULT_MODEL_SERVING_TEMPLATE;
      return assembleServingRuntime(data, namespace, servingRuntime);
    });
};

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

  updatedServingRuntime.spec.containers = servingRuntime.spec.containers.map((container) => {
    return {
      ...container,
      resources,
      affinity,
      tolerations,
    };
  });
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

export const listScopedServingRuntimes = (
  labelSelector?: string,
): Promise<ServingRuntimeKind[]> => {
  return getModelServingProjects().then((projects) => {
    return Promise.all(
      projects.map((project) => listServingRuntimes(project.metadata.name, labelSelector)),
    ).then((listServingRuntimes) =>
      _.uniqBy(_.flatten(listServingRuntimes), (sr) => sr.metadata.name),
    );
  });
};

export const getServingRuntimeContext = (
  namespace?: string,
  labelSelector?: string,
): Promise<ServingRuntimeKind[]> => {
  if (namespace) {
    return listServingRuntimes(namespace, labelSelector);
  } else {
    return listScopedServingRuntimes(labelSelector);
  }
};

export const getServingRuntime = (name: string, namespace: string): Promise<ServingRuntimeKind> => {
  return k8sGetResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });
};

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

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  configNamespace: string,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  return fetchServingRuntime(data, configNamespace, namespace).then((servingRuntime) => {
    return k8sCreateResource<ServingRuntimeKind>({
      model: ServingRuntimeModel,
      resource: servingRuntime,
    });
  });
};

export const deleteServingRuntime = (
  name: string,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  return k8sDeleteResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });
};
