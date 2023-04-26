import YAML from 'yaml';
import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sListResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { ServingRuntimeModel, TemplateModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
} from '~/pages/projects/utils';

export const assembleTemplate = (body: string, namespace: string): TemplateKind => {
  const servingRuntime = YAML.parse(body);

  const name = servingRuntime.metadata?.name;
  const displayName = getDisplayNameFromK8sResource(servingRuntime);
  const description = getDescriptionFromK8sResource(servingRuntime);

  if (!name) {
    throw new Error('Serving runtime name is required');
  }

  return {
    kind: 'Template',
    apiVersion: 'template.openshift.io/v1',
    metadata: {
      name, // TODO: generate a random template name?
      // user could change the template with a new serving runtime
      // and create an other template with the old serving runtime
      // if we keep the name, there could be a conflict
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        'openshift.io/description': description,
        'opendatahub.io/template-enabled': 'true',
        'openshift.io/display-name': displayName,
        tags: `${name},servingruntime`,
      },
    },
    objects: [servingRuntime],
    parameters: [],
  };
};

export const listTemplates = async (
  namespace?: string,
  labelSelector?: string,
): Promise<TemplateKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<TemplateKind>({
    model: TemplateModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};

export const toggleTemplateEnabledStatus = (
  name: string,
  namespace: string,
  enable: boolean,
): Promise<TemplateKind> =>
  k8sPatchResource<TemplateKind>({
    model: TemplateModel,
    queryOptions: { name, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/metadata/annotations/opendatahub.io~1template-enabled',
        value: enable ? 'true' : 'false',
      },
    ],
  });

const dryRunServingRuntimeForTemplateCreation = (
  template: TemplateKind,
  namespace: string,
): Promise<ServingRuntimeKind> => {
  const servingRuntime = template.objects[0] as ServingRuntimeKind;
  return k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      { dryRun: true },
      {
        model: ServingRuntimeModel,
        resource: { ...servingRuntime, metadata: { ...servingRuntime.metadata, namespace } },
      },
    ),
  );
};

export const createServingRuntimeTemplate = (
  body: string,
  namespace: string,
): Promise<TemplateKind> => {
  try {
    const template = assembleTemplate(body, namespace);
    return dryRunServingRuntimeForTemplateCreation(template, namespace).then(() =>
      k8sCreateResource<TemplateKind>({
        model: TemplateModel,
        resource: template,
      }),
    );
  } catch (e) {
    return Promise.reject(e);
  }
};

export const updateServingRuntimeTemplate = (
  name: string,
  body: string,
  namespace: string,
): Promise<TemplateKind> => {
  try {
    const template = assembleTemplate(body, namespace);
    return dryRunServingRuntimeForTemplateCreation(template, namespace).then(() =>
      k8sPatchResource({
        model: TemplateModel,
        queryOptions: { name, ns: namespace },
        patches: [
          {
            op: 'replace',
            path: '/metadata/annotations/openshift.io~1description',
            value: getDescriptionFromK8sResource(template),
          },
          {
            op: 'replace',
            path: '/metadata/annotations/openshift.io~1display-name',
            value: getDisplayNameFromK8sResource(template),
          },
          {
            op: 'replace',
            path: '/objects/0',
            value: template.objects[0],
          },
        ],
      }),
    );
  } catch (e) {
    return Promise.reject(e);
  }
};

export const deleteTemplate = (name: string, namespace: string): Promise<TemplateKind> =>
  k8sDeleteResource<TemplateKind>({
    model: TemplateModel,
    queryOptions: { name, ns: namespace },
  });
