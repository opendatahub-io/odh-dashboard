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
import { translateDisplayNameForK8s } from '~/pages/projects/utils';
import { getServingRuntimeFromTemplate } from '~/pages/modelServing/customServingRuntimes/utils';
import { getModelServingProjects } from './projects';

const assembleServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  servingRuntimeTeplate: ServingRuntimeKind,
  existingServingRuntime?: ServingRuntimeKind,
): ServingRuntimeKind => {
  // TODO: Re-enable GPU support
  const { numReplicas, modelSize, externalRoute, tokenAuth } = data;
  const name = existingServingRuntime?.metadata.name || translateDisplayNameForK8s(data.name);
  const servingRuntimeTemplateName = servingRuntimeTeplate.metadata.name;
  const updatedServingRuntime = { ...servingRuntimeTeplate };

  const metadata = _.merge(existingServingRuntime?.metadata || {}, servingRuntimeTeplate.metadata);

  updatedServingRuntime.metadata = {
    name,
    namespace,
    labels: {
      ...metadata.labels,
      name,
      'opendatahub.io/dashboard': 'true',
    },
    annotations: {
      ...metadata.annotations,
      ...(externalRoute && { 'enable-route': 'true' }),
      ...(tokenAuth && { 'enable-auth': 'true' }),
      'openshift.io/display-name': data.name,
      name: servingRuntimeTemplateName,
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

  // TODO: Re-enable GPU support changin 0 to gpus
  // const { affinity, tolerations, resources } = assemblePodSpecOptions(resourceSettings, 0);

  // updatedServingRuntime.spec.containers = servingRuntime.spec.containers.map((container) => ({
  //   ...container,
  //   resources,
  //   affinity,
  //   tolerations,
  // }));

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
  template: TemplateKind,
): Promise<ServingRuntimeKind> => {
  try {
    const servingRuntimeTemplate = getServingRuntimeFromTemplate(template);

    const servingRuntime = assembleServingRuntime(
      data,
      existingData.metadata.namespace,
      servingRuntimeTemplate,
      existingData,
    );

    if (!data.tokenAuth) {
      delete servingRuntime.metadata?.annotations?.['enable-auth'];
    }

    if (!data.externalRoute) {
      delete servingRuntime.metadata?.annotations?.['enable-route'];
    }

    return k8sUpdateResource<ServingRuntimeKind>({
      model: ServingRuntimeModel,
      resource: servingRuntime,
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

export const createServingRuntime = (
  data: CreatingServingRuntimeObject,
  namespace: string,
  template: TemplateKind,
): Promise<ServingRuntimeKind> => {
  try {
    const servingRuntimeTemplate = getServingRuntimeFromTemplate(template);

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
