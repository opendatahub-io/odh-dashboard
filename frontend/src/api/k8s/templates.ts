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
import { genRandomChars } from '~/utilities/string';
import { ServingRuntimePlatform } from '~/types';

export const assembleServingRuntimeTemplate = (
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
  templateName?: string,
): TemplateKind & { objects: ServingRuntimeKind[] } => {
  const servingRuntime: ServingRuntimeKind = YAML.parse(body);
  const name = `template-${genRandomChars()}`;
  const servingRuntimeName = servingRuntime.metadata.name;

  if (!servingRuntimeName) {
    throw new Error('Serving runtime name is required');
  }

  return {
    kind: 'Template',
    apiVersion: 'template.openshift.io/v1',
    metadata: {
      name: templateName || name,
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        'opendatahub.io/modelServingSupport': JSON.stringify(platforms),
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
  servingRuntime: ServingRuntimeKind,
  namespace: string,
): Promise<ServingRuntimeKind> =>
  k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      { dryRun: true },
      {
        model: ServingRuntimeModel,
        resource: { ...servingRuntime, metadata: { ...servingRuntime.metadata, namespace } },
      },
    ),
  );

export const createServingRuntimeTemplate = async (
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
): Promise<TemplateKind> => {
  try {
    const template = assembleServingRuntimeTemplate(body, namespace, platforms);
    const servingRuntime = template.objects[0];
    const servingRuntimeName = servingRuntime.metadata.name;

    // make sure the serving runtime name is not duplicated
    const templates = await listTemplates(namespace, 'opendatahub.io/dashboard=true');
    if (templates.find((t) => t.objects[0].metadata.name === servingRuntimeName)) {
      throw new Error(`Serving runtime name "${servingRuntimeName}" already exists.`);
    }
    return dryRunServingRuntimeForTemplateCreation(servingRuntime, namespace).then(() =>
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
  existingTemplate: TemplateKind,
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
): Promise<TemplateKind> => {
  try {
    const templateName = existingTemplate.metadata.name;
    const servingRuntimeName = existingTemplate.objects[0].metadata.name;
    const servingRuntime: ServingRuntimeKind = YAML.parse(body);
    if (!servingRuntime.metadata.name) {
      throw new Error('Serving runtime name is required.');
    }
    if (servingRuntime.metadata.name !== servingRuntimeName) {
      throw new Error(
        `Cannot change serving runtime name (original: "${servingRuntimeName}", updated: "${servingRuntime.metadata.name}").`,
      );
    }
    return dryRunServingRuntimeForTemplateCreation(servingRuntime, namespace).then(() =>
      k8sPatchResource<TemplateKind>({
        model: TemplateModel,
        queryOptions: { name: templateName, ns: namespace },
        patches: [
          {
            op: 'replace',
            path: '/objects/0',
            value: servingRuntime,
          },
          existingTemplate.metadata.annotations
            ? {
                op: 'replace',
                path: '/metadata/annotations/opendatahub.io~1modelServingSupport',
                value: JSON.stringify(platforms),
              }
            : {
                op: 'add',
                path: '/metadata/annotations',
                value: {
                  'opendatahub.io/modelServingSupport': JSON.stringify(platforms),
                },
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
