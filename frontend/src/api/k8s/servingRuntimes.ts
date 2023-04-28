import * as _ from 'lodash';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeModel } from '~/api/models';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { ContainerResources } from '~/types';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '~/pages/projects/utils';
import { getServingRuntimeFromTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import { DEFAULT_MODEL_SERVING_TEMPLATE } from '~/pages/modelServing/screens/const';
import { getModelServingProjects } from './projects';
import { assemblePodSpecOptions } from './utils';

const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntime: ServingRuntimeKind,
): ServingRuntimeKind => {
  const { name: dataName, numReplicas, modelSize, externalRoute, tokenAuth, gpus } = data;
  const name = translateDisplayNameForK8s(dataName);
  const servingRuntimeTemplateName = getDisplayNameFromK8sResource(servingRuntime);
  const updatedServingRuntime = { ...servingRuntime };

  updatedServingRuntime.metadata = {
    name,
    namespace,
    labels: {
      ...updatedServingRuntime.metadata.labels,
      name,
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {
      ...updatedServingRuntime.metadata.annotations,
      ...(externalRoute && { 'enable-route': 'true' }),
      ...(tokenAuth && { 'enable-auth': 'true' }),
      'openshift.io/display-name': data.name,
      'opendatahub.io/template-name': servingRuntimeTemplateName,
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

  updatedServingRuntime.spec.containers.map(
    (container) => (container.resources = resourceSettings),
  );

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
    delete updatedServingRuntime.metadata?.annotations?.['enable-auth'];
  }

  //TODO: Add support for GRPC
  if (!data.externalRoute) {
    delete updatedServingRuntime.metadata?.annotations?.['enable-route'];
  }

  return k8sUpdateResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    resource: updatedServingRuntime,
  });
};

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  template?: TemplateKind,
): Promise<ServingRuntimeKind> => {
  try {
    const servingRuntimeTemplate = template
      ? getServingRuntimeFromTemplate(template)
      : DEFAULT_MODEL_SERVING_TEMPLATE;

    const assembledServingRuntime = assembleServingRuntime(data, namespace, servingRuntimeTemplate);

    return k8sCreateResource<ServingRuntimeKind>({
      model: ServingRuntimeModel,
      resource: assembledServingRuntime,
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

export const deleteServingRuntime = (
  name: string,
  namespace: string,
): Promise<ServingRuntimeKind> =>
  k8sDeleteResource<ServingRuntimeKind>({
    model: ServingRuntimeModel,
    queryOptions: { name, ns: namespace },
  });
